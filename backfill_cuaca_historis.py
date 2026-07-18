"""Backfill data historis cuaca 38 ibu kota dari Open-Meteo Historical Weather API (ERA5).

Resumable: baca CSV yang sudah ada, lewati kota yang sudah selesai.
"""
import argparse
import csv
import os
import sys
import time
from datetime import datetime, timedelta, timezone
from pathlib import Path

import requests

from weather_config import PROVINSI, get_weather_desc, buat_session

# ERA5 (dataset historis Open-Meteo) di-update harian dengan delay ~5 hari
# sebelum data final tersedia. Beri buffer 7 hari supaya tidak kena tanggal
# yang datanya belum lengkap/final.
DELAY_HARI_ERA5 = 7

# PENTING: Historical Weather API TIDAK punya parameter "visibility"
# (beda dengan Forecast API yang dipakai scrape_cuaca.py).
# Jadi kolom visibilitas_km di tabel weather akan tetap kosong untuk baris
# hasil backfill — itu wajar, bukan bug, dan hanya terisi dari live scraping ke depannya.
KOLOM_HOURLY = (
    "temperature_2m,relative_humidity_2m,surface_pressure,wind_speed_10m,"
    "wind_direction_10m,cloud_cover,precipitation,weather_code"
)

OUTPUT_DEFAULT = "data_historis_cuaca.csv"

HEADER_CSV = [
    "provinsi", "kota", "datetime_utc", "kondisi", "temperature_2m",
    "relative_humidity_2m", "surface_pressure", "wind_speed_10m",
    "wind_direction_10m", "cloud_cover", "precipitation", "weather_code",
]


def kota_yang_sudah_selesai(output_path):
    """Baca file output yang sudah ada untuk resume: kota yang sudah punya baris data dilewati."""
    if not Path(output_path).exists():
        return set()
    selesai = set()
    with open(output_path, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            selesai.add(row["kota"])
    return selesai


def ambil_historis_satu_kota(session, lat, lon, start_date, end_date):
    url = (
        f"https://archive-api.open-meteo.com/v1/archive"
        f"?latitude={lat}&longitude={lon}"
        f"&start_date={start_date}&end_date={end_date}"
        f"&hourly={KOLOM_HOURLY}"
        f"&timezone=UTC"
    )
    resp = session.get(url, timeout=60)
    resp.raise_for_status()
    return resp.json()


def buka_database(db_url):
    """Buka satu koneksi untuk seluruh backfill dan ambil mapping kota dari schema."""
    import psycopg2

    conn = psycopg2.connect(db_url)
    with conn.cursor() as cur:
        cur.execute("SELECT city, id FROM cities")
        city_id_map = {city: city_id for city, city_id in cur.fetchall()}
    return conn, city_id_map


def insert_baris_database(conn, city_id, baris_kota):
    """Insert satu kota sekaligus; aman dijalankan ulang karena key kota+jam unik."""
    from psycopg2.extras import execute_values

    rows = [
        (
            city_id, row[2], row[4], row[5], row[6], row[7], row[8],
            None, row[9], row[10], row[11], row[3],
        )
        for row in baris_kota
    ]
    with conn.cursor() as cur:
        inserted_rows = execute_values(cur, """
            INSERT INTO weather (
                city_id, datetime, temperature, humidity, pressure,
                wind_speed, wind_direction, visibility, cloud, rainfall,
                weather_code, weather_description
            ) VALUES %s
            ON CONFLICT (city_id, datetime) DO NOTHING
            RETURNING 1
        """, rows, page_size=1000, fetch=True)
        inserted = len(inserted_rows)
    conn.commit()
    return inserted


def main():
    parser = argparse.ArgumentParser(
        description="Backfill data historis cuaca 38 ibu kota provinsi dari Open-Meteo Historical Weather API."
    )
    parser.add_argument("--hari", type=int, default=365,
                         help="Jumlah hari ke belakang yang diambil (default: 365 = 1 tahun)")
    parser.add_argument("--output", default=OUTPUT_DEFAULT, help="Path file CSV output")
    parser.add_argument("--jeda", type=float, default=1.0,
                         help="Jeda antar request per kota, dalam detik (sopan terhadap API)")
    parser.add_argument("--force", action="store_true",
                        help="Mulai dari awal dan timpa CSV output yang sudah ada")
    parser.add_argument("--no-db", action="store_true",
                        help="Simpan hanya ke CSV, tanpa insert DATABASE_URL")
    args = parser.parse_args()

    if args.hari < 1:
        parser.error("--hari harus minimal 1")

    akhir = datetime.now(timezone.utc).date() - timedelta(days=DELAY_HARI_ERA5)
    awal = akhir - timedelta(days=args.hari - 1)
    start_date, end_date = awal.isoformat(), akhir.isoformat()

    print(f"🏛️  Backfill data historis cuaca: {start_date} s/d {end_date} ({args.hari} hari, {len(PROVINSI)} kota)")
    print("   Sumber: Open-Meteo Historical Weather API (ERA5 reanalysis)\n")

    session = buat_session(backoff_factor=3)  # backfill lebih konservatif: jeda retry 3s, 9s, 27s
    sudah_selesai = set() if args.force else kota_yang_sudah_selesai(args.output)
    if sudah_selesai:
        print(f"↪️  Melanjutkan run sebelumnya: {len(sudah_selesai)} kota sudah ada di '{args.output}', akan dilewati.\n")

    mode_file = "w" if args.force else "a"
    file_baru = args.force or not Path(args.output).exists()
    total_baris = 0
    total_database = 0
    gagal = []
    start_waktu = time.time()
    conn = None
    city_id_map = {}

    if not args.no_db:
        db_url = os.getenv("DATABASE_URL")
        if not db_url:
            print("❌ DATABASE_URL tidak diset. Set env atau gunakan --no-db untuk CSV saja.")
            sys.exit(1)
        try:
            conn, city_id_map = buka_database(db_url)
            print(f"💾 Database siap: {len(city_id_map)} kota ditemukan.\n")
        except Exception as exc:
            print(f"❌ Gagal terhubung ke database: {exc}")
            sys.exit(1)

    try:
        with open(args.output, mode_file, newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            if file_baru:
                writer.writerow(HEADER_CSV)

            for i, (prov, info) in enumerate(PROVINSI.items(), 1):
                kota, lat, lon = info
                if kota in sudah_selesai:
                    print(f"⏭️  [{i}/{len(PROVINSI)}] {kota:<18} : sudah ada, dilewati")
                    continue

                try:
                    data = ambil_historis_satu_kota(session, lat, lon, start_date, end_date)
                    hourly = data.get("hourly", {})
                    waktu = hourly.get("time", [])

                    if not waktu:
                        print(f"⚠️  [{i}/{len(PROVINSI)}] {kota:<18} : respons kosong, dilewati")
                        gagal.append(kota)
                        continue

                # Kumpulkan dulu semua baris kota ini di memori, baru ditulis+flush
                # sekaligus — supaya kalau script terhenti di tengah jalan, satu kota
                # tidak pernah tersimpan "separuh jadi" (yang bisa mengacaukan resume).
                    baris_kota = []
                    for idx in range(len(waktu)):
                        kode = hourly.get("weather_code", [None] * len(waktu))[idx]
                        baris_kota.append([
                            prov, kota, waktu[idx],
                            get_weather_desc(kode),
                            hourly.get("temperature_2m", [None] * len(waktu))[idx],
                            hourly.get("relative_humidity_2m", [None] * len(waktu))[idx],
                            hourly.get("surface_pressure", [None] * len(waktu))[idx],
                            hourly.get("wind_speed_10m", [None] * len(waktu))[idx],
                            hourly.get("wind_direction_10m", [None] * len(waktu))[idx],
                            hourly.get("cloud_cover", [None] * len(waktu))[idx],
                            hourly.get("precipitation", [None] * len(waktu))[idx],
                            kode,
                        ])

                    inserted = 0
                    if conn:
                        city_id = city_id_map.get(kota)
                        if city_id is None:
                            raise RuntimeError(f"Kota '{kota}' tidak ditemukan di tabel cities")
                        inserted = insert_baris_database(conn, city_id, baris_kota)

                    writer.writerows(baris_kota)
                    f.flush()
                    total_baris += len(baris_kota)
                    total_database += inserted
                    print(
                        f"✅ [{i}/{len(PROVINSI)}] {kota:<18} : {len(baris_kota)} CSV"
                        f" | {inserted} DB"
                    )

                except Exception as exc:
                    if conn:
                        conn.rollback()
                    print(f"❌ [{i}/{len(PROVINSI)}] {kota:<18} : gagal ({exc})")
                    gagal.append(kota)

                time.sleep(args.jeda)
    finally:
        if conn:
            conn.close()

    waktu_total = time.time() - start_waktu
    print(
        f"\n⚡ Selesai dalam {waktu_total:.1f} detik. Total {total_baris} baris ditulis ke "
        f"'{args.output}' dan {total_database} baris baru ke database."
    )
    if gagal:
        print(
            f"⚠️  {len(gagal)} kota gagal diambil: {', '.join(gagal)}\n"
            f"   Jalankan ulang perintah yang sama untuk retry — kota yang sudah sukses otomatis dilewati."
        )
        sys.exit(1)


if __name__ == "__main__":
    main()

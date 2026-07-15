"""Backfill data historis cuaca 38 ibu kota dari Open-Meteo Historical Weather API (ERA5).

Resumable: baca CSV yang sudah ada, lewati kota yang sudah selesai.
"""
import argparse
import csv
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


def main():
    parser = argparse.ArgumentParser(
        description="Backfill data historis cuaca 38 ibu kota provinsi dari Open-Meteo Historical Weather API."
    )
    parser.add_argument("--hari", type=int, default=365,
                         help="Jumlah hari ke belakang yang diambil (default: 365 = 1 tahun)")
    parser.add_argument("--output", default=OUTPUT_DEFAULT, help="Path file CSV output")
    parser.add_argument("--jeda", type=float, default=1.0,
                         help="Jeda antar request per kota, dalam detik (sopan terhadap API)")
    args = parser.parse_args()

    akhir = datetime.now(timezone.utc).date() - timedelta(days=DELAY_HARI_ERA5)
    awal = akhir - timedelta(days=args.hari)
    start_date, end_date = awal.isoformat(), akhir.isoformat()

    print(f"🏛️  Backfill data historis cuaca: {start_date} s/d {end_date} ({args.hari} hari, {len(PROVINSI)} kota)")
    print("   Sumber: Open-Meteo Historical Weather API (ERA5 reanalysis)\n")

    session = buat_session(backoff_factor=3)  # backfill lebih konservatif: jeda retry 3s, 9s, 27s
    sudah_selesai = kota_yang_sudah_selesai(args.output)
    if sudah_selesai:
        print(f"↪️  Melanjutkan run sebelumnya: {len(sudah_selesai)} kota sudah ada di '{args.output}', akan dilewati.\n")

    file_baru = not Path(args.output).exists()
    total_baris = 0
    gagal = []
    start_waktu = time.time()

    with open(args.output, "a", newline="", encoding="utf-8") as f:
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

                writer.writerows(baris_kota)
                f.flush()
                total_baris += len(baris_kota)
                print(f"✅ [{i}/{len(PROVINSI)}] {kota:<18} : {len(baris_kota)} baris")

            except requests.exceptions.RequestException as e:
                print(f"❌ [{i}/{len(PROVINSI)}] {kota:<18} : gagal ({e})")
                gagal.append(kota)

            time.sleep(args.jeda)

    waktu_total = time.time() - start_waktu
    print(f"\n⚡ Selesai dalam {waktu_total:.1f} detik. Total {total_baris} baris ditulis ke '{args.output}'")
    if gagal:
        print(
            f"⚠️  {len(gagal)} kota gagal diambil: {', '.join(gagal)}\n"
            f"   Jalankan ulang perintah yang sama untuk retry — kota yang sudah sukses otomatis dilewati."
        )
        sys.exit(1)


if __name__ == "__main__":
    main()

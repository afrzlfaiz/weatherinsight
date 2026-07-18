"""Scraper live hourly — 38 kota Indonesia via Open-Meteo Forecast API.
Dijalankan endpoint cron FastAPI setiap jam. Insert langsung ke Supabase PostgreSQL.
"""
import os
import sys
import time
from datetime import datetime, timezone

import psycopg2
import requests

from weather_config import PROVINSI, get_weather_desc, buat_session


def ambil_semua_cuaca(session):
    """
    Mengambil data cuaca untuk 38 ibu kota dalam satu kali request (batching) ke Open-Meteo.
    Sangat cepat karena Open-Meteo mendukung batching koordinat.
    """
    lats = [str(info[1]) for info in PROVINSI.values()]
    lons = [str(info[2]) for info in PROVINSI.values()]

    url = (
        f"https://api.open-meteo.com/v1/forecast"
        f"?latitude={','.join(lats)}"
        f"&longitude={','.join(lons)}"
        f"&current=temperature_2m,relative_humidity_2m,surface_pressure,wind_speed_10m,"
        f"wind_direction_10m,cloud_cover,precipitation,weather_code,visibility"
        f"&timezone=UTC"
    )

    try:
        resp = session.get(url, timeout=15)
        resp.raise_for_status()
        return resp.json()
    except requests.exceptions.RequestException as e:
        print(f"\n❌ Terjadi kesalahan saat menghubungi API: {e}")
        return None


def tampilkan_tabel(hasil):
    """Menampilkan hasil dalam format tabel ke terminal (log CI)."""
    print("\n" + "=" * 120)
    print(
        f"{'No':<3} {'Provinsi':<25} {'Ibu Kota':<18} {'Kondisi':<20} "
        f"{'Suhu':<6} {'Lembap':<7} {'Angin':<8} {'Hujan':<8}"
    )
    print("-" * 120)
    for i, (prov, kota, data) in enumerate(hasil, 1):
        suhu = f"{data['suhu_c']}°C" if data["suhu_c"] != "N/A" else "N/A"
        lembap = f"{data['kelembapan']}%" if data["kelembapan"] != "N/A" else "N/A"
        angin = f"{data['angin_kmph']} km/j" if data["angin_kmph"] != "N/A" else "N/A"
        hujan = f"{data['hujan_mm']} mm" if data["hujan_mm"] != "N/A" else "N/A"
        kondisi = data["kondisi"][:20]

        print(
            f"{i:<3} {prov:<25} {kota:<18} {kondisi:<20} "
            f"{suhu:<6} {lembap:<7} {angin:<8} {hujan:<8}"
        )
    print("=" * 120)


# ── Supabase insert ──────────────────────────────────────────────────


def _val(v):
    """None-safe: N/A atau None → Python None."""
    if v is None or v == "N/A" or (isinstance(v, float) and v != v):  # NaN
        return None
    return v


def insert_to_supabase(hasil, city_id_map, db_url):
    """Insert 38 baris ke tabel weather langsung ke PostgreSQL. Idempotent (ON CONFLICT DO NOTHING)."""
    rows = []
    for prov, kota, data in hasil:
        city_id = city_id_map.get(kota)
        if city_id is None:
            print(f"⚠️  {kota} tidak ditemukan di city_id_map, dilewati.")
            continue
        waktu = data.get("waktu_utc")
        if not waktu or waktu == "N/A":
            continue
        rows.append((
            city_id,
            waktu,
            _val(data.get("suhu_c")),
            _val(data.get("kelembapan")),
            _val(data.get("tekanan_mb")),
            _val(data.get("angin_kmph")),
            _val(data.get("arah_angin_deg")),
            _val(data.get("visibilitas_km")),
            _val(data.get("awan_persen")),
            _val(data.get("hujan_mm")),
            _val(data.get("kode_wmo")),
            data.get("kondisi") if data.get("kondisi") not in (None, "N/A", "Error") else None,
        ))

    if not rows:
        print("⚠️  Tidak ada baris valid untuk di-insert.")
        return 0

    conn = psycopg2.connect(db_url)
    try:
        with conn.cursor() as cur:
            # ponytail: psycopg2.extras.execute_values batching — satu round-trip, 38 baris.
            from psycopg2.extras import execute_values
            execute_values(cur, """
                INSERT INTO weather (
                    city_id, datetime, temperature, humidity, pressure,
                    wind_speed, wind_direction, visibility, cloud, rainfall,
                    weather_code, weather_description
                ) VALUES %s
                ON CONFLICT (city_id, datetime) DO NOTHING
            """, rows)
        conn.commit()
        inserted = cur.rowcount
        print(f"💾 {inserted} baris di-insert ke Supabase ({(len(rows) - inserted)} duplikat dilewati).")
        return inserted
    finally:
        conn.close()


def main():
    print("🌤 Mengambil data cuaca terkini untuk 38 ibu kota provinsi Indonesia...")
    print("   (Data menggunakan API Open-Meteo, super cepat via batch request)\n")

    start_waktu = time.time()
    session = buat_session()

    # Ambil semua data cuaca dalam 1 kali HTTP request (dengan retry otomatis)
    data_mentah = ambil_semua_cuaca(session)

    if not data_mentah or not isinstance(data_mentah, list):
        print("❌ Gagal mendapatkan data secara massal dari API.")
        sys.exit(1)

    # Guard: pastikan jumlah hasil sama dengan jumlah kota yang diminta.
    # Kalau tidak, batalkan run daripada menyimpan data yang salah pasang (mismatched).
    if len(data_mentah) != len(PROVINSI):
        print(
            f"⚠️ Jumlah hasil ({len(data_mentah)}) tidak cocok dengan jumlah kota "
            f"({len(PROVINSI)}). Membatalkan run untuk mencegah data tidak konsisten."
        )
        sys.exit(1)

    hasil = []
    for idx, (prov, info) in enumerate(PROVINSI.items()):
        kota = info[0]
        current_api = data_mentah[idx].get("current", {})

        if current_api:
            vis_m = current_api.get("visibility", "N/A")
            vis_km = round(vis_m / 1000.0, 1) if isinstance(vis_m, (int, float)) else "N/A"

            wmo_code = current_api.get("weather_code")
            data_cuaca = {
                "waktu_utc": current_api.get("time", "N/A"),
                "kondisi": get_weather_desc(wmo_code),
                "kode_wmo": wmo_code,
                "suhu_c": current_api.get("temperature_2m", "N/A"),
                "kelembapan": current_api.get("relative_humidity_2m", "N/A"),
                "tekanan_mb": current_api.get("surface_pressure", "N/A"),
                "angin_kmph": current_api.get("wind_speed_10m", "N/A"),
                "arah_angin_deg": current_api.get("wind_direction_10m", "N/A"),
                "awan_persen": current_api.get("cloud_cover", "N/A"),
                "hujan_mm": current_api.get("precipitation", "N/A"),
                "visibilitas_km": vis_km,
            }
            print(f"✅ {kota:<18} : {data_cuaca['kondisi']}, {data_cuaca['suhu_c']}°C")
        else:
            data_cuaca = {
                "waktu_utc": "N/A", "kondisi": "Error", "kode_wmo": None,
                "suhu_c": "N/A", "kelembapan": "N/A", "tekanan_mb": "N/A",
                "angin_kmph": "N/A", "arah_angin_deg": "N/A",
                "awan_persen": "N/A", "hujan_mm": "N/A", "visibilitas_km": "N/A",
            }
            print(f"❌ {kota:<18} : Gagal memproses data cuaca.")

        hasil.append((prov, kota, data_cuaca))

    waktu_eksekusi = time.time() - start_waktu
    print(f"\n⚡ Selesai memproses 38 provinsi dalam {waktu_eksekusi:.2f} detik!")

    tampilkan_tabel(hasil)

    # ── Insert ke Supabase ──────────────────────────────────────────
    if "--no-db" in sys.argv:
        print("⏭️  --no-db: skip insert ke database.")
    else:
        db_url = os.getenv("DATABASE_URL")
        if not db_url:
            print("⚠️  DATABASE_URL tidak diset. Skip insert. Set env atau pakai --no-db.")
        else:
            # Bangun city_id_map dari tabel cities (hindari hardcode ID)
            try:
                conn = psycopg2.connect(db_url)
                with conn.cursor() as cur:
                    cur.execute("SELECT city, id FROM cities")
                    city_id_map = {row[0]: row[1] for row in cur.fetchall()}
                conn.close()
                print(f"📋 {len(city_id_map)} kota dimuat dari tabel cities.")
            except Exception as e:
                print(f"❌ Gagal membaca tabel cities: {e}")
                sys.exit(1)

            try:
                insert_to_supabase(hasil, city_id_map, db_url)
            except Exception as e:
                print(f"❌ Gagal insert ke Supabase: {e}")
                sys.exit(1)


if __name__ == "__main__":
    main()

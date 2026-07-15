"""Shared config: 38 kota, WMO mapping, retry session — dipakai scrape + backfill.

ponytail: satu sumber kebenaran buat PROVINSI dan WMO.
           Sebelumnya diduplikasi di 2 file (3 kalau dihitung frontend constants.ts).
"""
import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

# ── 38 ibu kota provinsi Indonesia ────────────────────────────────

PROVINSI: dict[str, tuple[str, float, float]] = {
    "Aceh": ("Banda Aceh", 5.54167, 95.33333),
    "Sumatera Utara": ("Medan", 3.58333, 98.66667),
    "Sumatera Barat": ("Padang", -0.94924, 100.35427),
    "Riau": ("Pekanbaru", 0.51667, 101.44167),
    "Jambi": ("Jambi", -1.60000, 103.62000),
    "Sumatera Selatan": ("Palembang", -2.91673, 104.74580),
    "Bengkulu": ("Bengkulu", -3.80044, 102.26554),
    "Lampung": ("Bandar Lampung", -5.42917, 105.26111),
    "Kepulauan Bangka Belitung": ("Pangkal Pinang", -2.13330, 106.11250),
    "Kepulauan Riau": ("Tanjung Pinang", 0.91667, 104.45833),
    "DKI Jakarta": ("Jakarta", -6.21462, 106.84513),
    "Jawa Barat": ("Bandung", -6.92222, 107.60694),
    "Jawa Tengah": ("Semarang", -6.99306, 110.42083),
    "DI Yogyakarta": ("Yogyakarta", -7.80139, 110.36472),
    "Jawa Timur": ("Surabaya", -7.24917, 112.75083),
    "Banten": ("Serang", -6.11528, 106.15417),
    "Bali": ("Denpasar", -8.65000, 115.21667),
    "Nusa Tenggara Barat": ("Mataram", -8.58333, 116.11667),
    "Nusa Tenggara Timur": ("Kupang", -10.17083, 123.60694),
    "Kalimantan Barat": ("Pontianak", -0.03194, 109.32500),
    "Kalimantan Tengah": ("Palangka Raya", -2.21000, 113.92000),
    "Kalimantan Selatan": ("Banjarbaru", -3.44060, 114.83650),
    "Kalimantan Timur": ("Samarinda", -0.49167, 117.14583),
    "Kalimantan Utara": ("Tanjung Selor", 2.83750, 117.36528),
    "Sulawesi Utara": ("Manado", 1.48218, 124.84892),
    "Sulawesi Tengah": ("Palu", -0.90833, 119.87083),
    "Sulawesi Selatan": ("Makassar", -5.14861, 119.43194),
    "Sulawesi Tenggara": ("Kendari", -3.97780, 122.51507),
    "Gorontalo": ("Gorontalo", 0.53750, 123.06250),
    "Sulawesi Barat": ("Mamuju", -2.68056, 118.88611),
    "Maluku": ("Ambon", -3.69583, 128.18333),
    "Maluku Utara": ("Sofifi", 0.73729, 127.55880),
    "Papua Barat": ("Manokwari", -0.86291, 134.06403),
    "Papua Barat Daya": ("Sorong", -0.87956, 131.26105),
    "Papua": ("Jayapura", -2.53371, 140.71812),
    "Papua Selatan": ("Merauke", -8.49958, 140.40613),
    "Papua Tengah": ("Nabire", -3.35989, 135.50073),
    "Papua Pegunungan": ("Wamena", -4.09583, 138.94806),
}

# ── WMO weather code → Bahasa Indonesia ────────────────────────────

WMO_MAP: dict[int, str] = {
    0: "Cerah",
    1: "Cerah Berawan",
    2: "Berawan Sebagian",
    3: "Mendung",
    45: "Kabut",
    48: "Kabut Rime",
    51: "Gerimis Ringan",
    53: "Gerimis Sedang",
    55: "Gerimis Lebat",
    56: "Gerimis Dingin",
    57: "Gerimis Dingin Lebat",
    61: "Hujan Ringan",
    63: "Hujan Sedang",
    65: "Hujan Lebat",
    66: "Hujan Dingin",
    67: "Hujan Dingin Lebat",
    71: "Salju Ringan",
    73: "Salju Sedang",
    75: "Salju Lebat",
    77: "Butiran Salju",
    80: "Hujan Ringan",
    81: "Hujan Deras",
    82: "Hujan Sangat Deras",
    85: "Salju Ringan",
    86: "Salju Lebat",
    95: "Badai Petir",
    96: "Badai Petir + Es",
    99: "Badai Petir Parah",
}


def get_weather_desc(code: int | None) -> str:
    """Kode WMO → deskripsi Bahasa Indonesia."""
    if code is None:
        return "N/A"
    return WMO_MAP.get(code, f"Kode WMO {code}")


def buat_session(backoff_factor: float = 2) -> requests.Session:
    """Session dengan retry otomatis (exponential backoff). SSL tetap aktif."""
    session = requests.Session()
    retries = Retry(
        total=3,
        backoff_factor=backoff_factor,
        status_forcelist=[429, 500, 502, 503, 504],
        allowed_methods=["GET"],
    )
    session.mount("https://", HTTPAdapter(max_retries=retries))
    return session

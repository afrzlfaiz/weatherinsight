-- WeatherInsight Indonesia — Database Schema
-- Run once against Supabase PostgreSQL (or local Postgres) to set up tables + seed data.

CREATE TABLE IF NOT EXISTS cities (
    id          SERIAL PRIMARY KEY,
    province    TEXT NOT NULL,
    city        TEXT NOT NULL UNIQUE,
    latitude    DOUBLE PRECISION NOT NULL,
    longitude   DOUBLE PRECISION NOT NULL,
    timezone    TEXT NOT NULL DEFAULT 'Asia/Jakarta'
);

CREATE TABLE IF NOT EXISTS weather (
    id                  SERIAL PRIMARY KEY,
    city_id             INTEGER NOT NULL REFERENCES cities(id),
    datetime            TIMESTAMPTZ NOT NULL,
    temperature         DOUBLE PRECISION,
    humidity            DOUBLE PRECISION,
    pressure            DOUBLE PRECISION,
    wind_speed          DOUBLE PRECISION,
    wind_direction      DOUBLE PRECISION,
    visibility          DOUBLE PRECISION,   -- nullable: backfill rows dari Historical API tidak punya field ini
    cloud               DOUBLE PRECISION,
    rainfall            DOUBLE PRECISION,
    weather_code        INTEGER,
    weather_description TEXT,

    UNIQUE(city_id, datetime)  -- guard: satu baris per kota per jam
);

CREATE INDEX IF NOT EXISTS idx_weather_city_datetime ON weather(city_id, datetime DESC);

CREATE TABLE IF NOT EXISTS forecast (
    id              SERIAL PRIMARY KEY,
    city_id         INTEGER NOT NULL REFERENCES cities(id),
    forecast_time   TIMESTAMPTZ NOT NULL,
    temperature     DOUBLE PRECISION,
    humidity        DOUBLE PRECISION,
    rainfall        DOUBLE PRECISION,
    generated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    model_version   TEXT NOT NULL DEFAULT 'v1'
);

CREATE TABLE IF NOT EXISTS model_metrics (
    id                          SERIAL PRIMARY KEY,
    city_id                     INTEGER NOT NULL REFERENCES cities(id),
    kolom_target                TEXT NOT NULL,
    mae                         DOUBLE PRECISION,
    rmse                        DOUBLE PRECISION,
    mape                        DOUBLE PRECISION,
    mae_baseline_naif           DOUBLE PRECISION,
    rmse_baseline_naif          DOUBLE PRECISION,
    lebih_baik_dari_baseline    BOOLEAN,
    model_version               TEXT NOT NULL,
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- Seed: 38 ibu kota provinsi Indonesia
-- Sumber: scrape_cuaca.py PROVINSI dict (koordinat tetap, tanpa geocoding runtime)
-- ============================================================

INSERT INTO cities (province, city, latitude, longitude) VALUES
    ('Aceh', 'Banda Aceh', 5.54167, 95.33333),
    ('Sumatera Utara', 'Medan', 3.58333, 98.66667),
    ('Sumatera Barat', 'Padang', -0.94924, 100.35427),
    ('Riau', 'Pekanbaru', 0.51667, 101.44167),
    ('Jambi', 'Jambi', -1.60000, 103.62000),
    ('Sumatera Selatan', 'Palembang', -2.91673, 104.74580),
    ('Bengkulu', 'Bengkulu', -3.80044, 102.26554),
    ('Lampung', 'Bandar Lampung', -5.42917, 105.26111),
    ('Kepulauan Bangka Belitung', 'Pangkal Pinang', -2.13330, 106.11250),
    ('Kepulauan Riau', 'Tanjung Pinang', 0.91667, 104.45833),
    ('DKI Jakarta', 'Jakarta', -6.21462, 106.84513),
    ('Jawa Barat', 'Bandung', -6.92222, 107.60694),
    ('Jawa Tengah', 'Semarang', -6.99306, 110.42083),
    ('DI Yogyakarta', 'Yogyakarta', -7.80139, 110.36472),
    ('Jawa Timur', 'Surabaya', -7.24917, 112.75083),
    ('Banten', 'Serang', -6.11528, 106.15417),
    ('Bali', 'Denpasar', -8.65000, 115.21667),
    ('Nusa Tenggara Barat', 'Mataram', -8.58333, 116.11667),
    ('Nusa Tenggara Timur', 'Kupang', -10.17083, 123.60694),
    ('Kalimantan Barat', 'Pontianak', -0.03194, 109.32500),
    ('Kalimantan Tengah', 'Palangka Raya', -2.21000, 113.92000),
    ('Kalimantan Selatan', 'Banjarbaru', -3.44060, 114.83650),
    ('Kalimantan Timur', 'Samarinda', -0.49167, 117.14583),
    ('Kalimantan Utara', 'Tanjung Selor', 2.83750, 117.36528),
    ('Sulawesi Utara', 'Manado', 1.48218, 124.84892),
    ('Sulawesi Tengah', 'Palu', -0.90833, 119.87083),
    ('Sulawesi Selatan', 'Makassar', -5.14861, 119.43194),
    ('Sulawesi Tenggara', 'Kendari', -3.97780, 122.51507),
    ('Gorontalo', 'Gorontalo', 0.53750, 123.06250),
    ('Sulawesi Barat', 'Mamuju', -2.68056, 118.88611),
    ('Maluku', 'Ambon', -3.69583, 128.18333),
    ('Maluku Utara', 'Sofifi', 0.73729, 127.55880),
    ('Papua Barat', 'Manokwari', -0.86291, 134.06403),
    ('Papua Barat Daya', 'Sorong', -0.87956, 131.26105),
    ('Papua', 'Jayapura', -2.53371, 140.71812),
    ('Papua Selatan', 'Merauke', -8.49958, 140.40613),
    ('Papua Tengah', 'Nabire', -3.35989, 135.50073),
    ('Papua Pegunungan', 'Wamena', -4.09583, 138.94806)
ON CONFLICT (city) DO NOTHING;

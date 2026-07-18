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
CREATE INDEX IF NOT EXISTS idx_weather_datetime ON weather(datetime);

-- Ringkasan harian untuk data raw yang sudah melewati masa retensi 90 hari.
-- Satu hari memakai batas UTC, konsisten dengan timestamp sumber Open-Meteo.
CREATE TABLE IF NOT EXISTS weather_daily_summary (
    city_id             INTEGER NOT NULL REFERENCES cities(id),
    date                DATE NOT NULL,
    temperature_avg     DOUBLE PRECISION,
    temperature_min     DOUBLE PRECISION,
    temperature_max     DOUBLE PRECISION,
    humidity_avg        DOUBLE PRECISION,
    pressure_avg        DOUBLE PRECISION,
    wind_speed_avg      DOUBLE PRECISION,
    wind_speed_max      DOUBLE PRECISION,
    cloud_avg           DOUBLE PRECISION,
    rainfall_sum        DOUBLE PRECISION,
    observation_count   INTEGER NOT NULL CHECK (observation_count > 0),

    PRIMARY KEY (city_id, date)
);

-- Agregasi dan penghapusan raw berada dalam satu transaksi PostgreSQL.
-- Kalau insert/upsert gagal, DELETE tidak akan dijalankan.
CREATE OR REPLACE FUNCTION compact_weather_history(retention_days INTEGER DEFAULT 90)
RETURNS TABLE(summary_rows BIGINT, deleted_raw_rows BIGINT, cutoff_date DATE)
LANGUAGE plpgsql
AS $$
DECLARE
    v_cutoff_date DATE;
    v_summary_rows BIGINT := 0;
    v_deleted_raw_rows BIGINT := 0;
BEGIN
    IF retention_days < 1 THEN
        RAISE EXCEPTION 'retention_days harus minimal 1';
    END IF;

    v_cutoff_date := (NOW() AT TIME ZONE 'UTC')::DATE - retention_days;

    -- Serialisasi run yang tumpang tindih tanpa tabel lock tambahan.
    PERFORM pg_advisory_xact_lock(hashtext('weatherinsight.compact_weather_history'));

    WITH daily AS (
        SELECT
            city_id,
            (datetime AT TIME ZONE 'UTC')::DATE AS date,
            AVG(temperature) AS temperature_avg,
            MIN(temperature) AS temperature_min,
            MAX(temperature) AS temperature_max,
            AVG(humidity) AS humidity_avg,
            AVG(pressure) AS pressure_avg,
            AVG(wind_speed) AS wind_speed_avg,
            MAX(wind_speed) AS wind_speed_max,
            AVG(cloud) AS cloud_avg,
            SUM(rainfall) AS rainfall_sum,
            COUNT(*)::INTEGER AS observation_count
        FROM weather
        WHERE datetime < (v_cutoff_date::TIMESTAMP AT TIME ZONE 'UTC')
        GROUP BY city_id, (datetime AT TIME ZONE 'UTC')::DATE
    )
    INSERT INTO weather_daily_summary (
        city_id, date,
        temperature_avg, temperature_min, temperature_max,
        humidity_avg, pressure_avg,
        wind_speed_avg, wind_speed_max,
        cloud_avg, rainfall_sum, observation_count
    )
    SELECT
        city_id, date,
        temperature_avg, temperature_min, temperature_max,
        humidity_avg, pressure_avg,
        wind_speed_avg, wind_speed_max,
        cloud_avg, rainfall_sum, observation_count
    FROM daily
    ON CONFLICT (city_id, date) DO UPDATE SET
        temperature_avg = CASE
            WHEN weather_daily_summary.temperature_avg IS NULL THEN EXCLUDED.temperature_avg
            WHEN EXCLUDED.temperature_avg IS NULL THEN weather_daily_summary.temperature_avg
            ELSE (
                weather_daily_summary.temperature_avg * weather_daily_summary.observation_count
                + EXCLUDED.temperature_avg * EXCLUDED.observation_count
            ) / (weather_daily_summary.observation_count + EXCLUDED.observation_count)
        END,
        temperature_min = LEAST(weather_daily_summary.temperature_min, EXCLUDED.temperature_min),
        temperature_max = GREATEST(weather_daily_summary.temperature_max, EXCLUDED.temperature_max),
        humidity_avg = CASE
            WHEN weather_daily_summary.humidity_avg IS NULL THEN EXCLUDED.humidity_avg
            WHEN EXCLUDED.humidity_avg IS NULL THEN weather_daily_summary.humidity_avg
            ELSE (
                weather_daily_summary.humidity_avg * weather_daily_summary.observation_count
                + EXCLUDED.humidity_avg * EXCLUDED.observation_count
            ) / (weather_daily_summary.observation_count + EXCLUDED.observation_count)
        END,
        pressure_avg = CASE
            WHEN weather_daily_summary.pressure_avg IS NULL THEN EXCLUDED.pressure_avg
            WHEN EXCLUDED.pressure_avg IS NULL THEN weather_daily_summary.pressure_avg
            ELSE (
                weather_daily_summary.pressure_avg * weather_daily_summary.observation_count
                + EXCLUDED.pressure_avg * EXCLUDED.observation_count
            ) / (weather_daily_summary.observation_count + EXCLUDED.observation_count)
        END,
        wind_speed_avg = CASE
            WHEN weather_daily_summary.wind_speed_avg IS NULL THEN EXCLUDED.wind_speed_avg
            WHEN EXCLUDED.wind_speed_avg IS NULL THEN weather_daily_summary.wind_speed_avg
            ELSE (
                weather_daily_summary.wind_speed_avg * weather_daily_summary.observation_count
                + EXCLUDED.wind_speed_avg * EXCLUDED.observation_count
            ) / (weather_daily_summary.observation_count + EXCLUDED.observation_count)
        END,
        wind_speed_max = GREATEST(weather_daily_summary.wind_speed_max, EXCLUDED.wind_speed_max),
        cloud_avg = CASE
            WHEN weather_daily_summary.cloud_avg IS NULL THEN EXCLUDED.cloud_avg
            WHEN EXCLUDED.cloud_avg IS NULL THEN weather_daily_summary.cloud_avg
            ELSE (
                weather_daily_summary.cloud_avg * weather_daily_summary.observation_count
                + EXCLUDED.cloud_avg * EXCLUDED.observation_count
            ) / (weather_daily_summary.observation_count + EXCLUDED.observation_count)
        END,
        rainfall_sum = CASE
            WHEN weather_daily_summary.rainfall_sum IS NULL AND EXCLUDED.rainfall_sum IS NULL THEN NULL
            ELSE COALESCE(weather_daily_summary.rainfall_sum, 0) + COALESCE(EXCLUDED.rainfall_sum, 0)
        END,
        observation_count = weather_daily_summary.observation_count + EXCLUDED.observation_count;

    GET DIAGNOSTICS v_summary_rows = ROW_COUNT;

    DELETE FROM weather
    WHERE datetime < (v_cutoff_date::TIMESTAMP AT TIME ZONE 'UTC');

    GET DIAGNOSTICS v_deleted_raw_rows = ROW_COUNT;

    summary_rows := v_summary_rows;
    deleted_raw_rows := v_deleted_raw_rows;
    cutoff_date := v_cutoff_date;
    RETURN NEXT;
END;
$$;

-- Hanya role pemilik database/backend yang boleh menjalankan fungsi destruktif ini.
REVOKE EXECUTE ON FUNCTION compact_weather_history(INTEGER) FROM PUBLIC;

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

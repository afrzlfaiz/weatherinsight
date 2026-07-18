import argparse
import gzip
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd
from prophet import Prophet
from prophet.serialize import model_to_json

KOLOM_TARGET_DEFAULT = "temperature_2m"
HARI_TEST_DEFAULT = 14          # holdout terakhir N hari dipakai untuk evaluasi, bukan training
MIN_BARIS_DATA = 24 * 14        # minimal ~2 minggu data per kota supaya training masuk akal
MODEL_DIR = Path("models")
METRICS_FILE = Path("model_metrics.csv")


KOLOM_DATA = [
    "provinsi", "kota", "datetime_utc", "kondisi", "temperature_2m",
    "relative_humidity_2m", "surface_pressure", "wind_speed_10m",
    "wind_direction_10m", "cloud_cover", "precipitation", "weather_code",
]


def muat_data_database(db_url, setelah):
    """Ambil data setelah ujung arsip CSV: agregat lama + raw terbaru."""
    import psycopg2

    query = """
        SELECT
            c.province, c.city, s.date::timestamp AT TIME ZONE 'UTC',
            'Agregat harian', s.temperature_avg, s.humidity_avg, s.pressure_avg,
            s.wind_speed_avg, NULL::double precision, s.cloud_avg,
            s.rainfall_sum, NULL::integer
        FROM weather_daily_summary s
        JOIN cities c ON c.id = s.city_id
        WHERE s.date > %s::date
        UNION ALL
        SELECT
            c.province, c.city, w.datetime, w.weather_description,
            w.temperature, w.humidity, w.pressure, w.wind_speed,
            w.wind_direction, w.cloud, w.rainfall, w.weather_code
        FROM weather w
        JOIN cities c ON c.id = w.city_id
        WHERE w.datetime > %s
    """
    conn = psycopg2.connect(db_url)
    try:
        with conn.cursor() as cur:
            cur.execute(query, (setelah.date(), setelah.to_pydatetime()))
            rows = cur.fetchall()
    finally:
        conn.close()
    return pd.DataFrame(rows, columns=KOLOM_DATA)


def muat_data(csv_path, db_url=None):
    df = pd.read_csv(csv_path)
    df["datetime_utc"] = pd.to_datetime(df["datetime_utc"], utc=True)

    if db_url:
        tambahan = muat_data_database(db_url, df["datetime_utc"].max())
        if not tambahan.empty:
            tambahan["datetime_utc"] = pd.to_datetime(tambahan["datetime_utc"], utc=True)
            df = pd.concat([df, tambahan], ignore_index=True)
            df = df.drop_duplicates(["kota", "datetime_utc"], keep="last")
        print(f"💾 Data tambahan dari database: {len(tambahan)} baris")

    return df.sort_values("datetime_utc")


def siapkan_prophet_df(df_kota, kolom_target):
    """Prophet mewajibkan nama kolom persis 'ds' (datetime) dan 'y' (target), naive (tanpa timezone)."""
    prophet_df = df_kota[["datetime_utc", kolom_target]].rename(
        columns={"datetime_utc": "ds", kolom_target: "y"}
    )
    prophet_df["ds"] = pd.to_datetime(prophet_df["ds"]).dt.tz_localize(None)
    return prophet_df.dropna(subset=["y"]).sort_values("ds").reset_index(drop=True)


def split_train_test(prophet_df, hari_test):
    """Split kronologis (bukan acak) — wajib untuk time-series, supaya tidak ada data leakage dari masa depan."""
    batas = prophet_df["ds"].max() - pd.Timedelta(days=hari_test)
    train = prophet_df[prophet_df["ds"] <= batas].reset_index(drop=True)
    test = prophet_df[prophet_df["ds"] > batas].reset_index(drop=True)
    return train, test


def hitung_metrik(y_true, y_pred):
    """MAE, RMSE, MAPE. NaN pada y_true/y_pred (mis. jam bolong) otomatis diabaikan."""
    y_true = np.asarray(y_true, dtype=float)
    y_pred = np.asarray(y_pred, dtype=float)
    valid = ~np.isnan(y_true) & ~np.isnan(y_pred)
    y_true, y_pred = y_true[valid], y_pred[valid]

    if len(y_true) == 0:
        return float("nan"), float("nan"), float("nan")

    mae = float(np.mean(np.abs(y_true - y_pred)))
    rmse = float(np.sqrt(np.mean((y_true - y_pred) ** 2)))

    # MAPE tidak terdefinisi kalau y_true = 0 (mis. curah hujan 0 mm) — baris itu dikecualikan.
    tidak_nol = y_true != 0
    if tidak_nol.sum() > 0:
        mape = float(np.mean(np.abs((y_true[tidak_nol] - y_pred[tidak_nol]) / y_true[tidak_nol])) * 100)
    else:
        mape = float("nan")

    return mae, rmse, mape


def baseline_naive_harian(seri_lengkap, ds_test):
    """
    Baseline pembanding paling sederhana: nilai pada jam yang sama 24 jam sebelumnya
    (seasonal naive harian). Dicocokkan berdasarkan timestamp persis, bukan posisi baris,
    supaya tetap benar walaupun ada jam yang bolong di data historis.
    """
    lookup = seri_lengkap.set_index("ds")["y"]
    y_pred = [lookup.get(ds - pd.Timedelta(hours=24), np.nan) for ds in ds_test]
    return np.array(y_pred, dtype=float)


def buat_model():
    return Prophet(daily_seasonality=True, weekly_seasonality=True, yearly_seasonality="auto")


def latih_satu_kota(df_kota, kota, kolom_target, hari_test, model_version):
    prophet_df = siapkan_prophet_df(df_kota, kolom_target)

    if len(prophet_df) < MIN_BARIS_DATA:
        print(f"⚠️  {kota:<18} : data terlalu sedikit ({len(prophet_df)} baris), dilewati.")
        return None

    train, test = split_train_test(prophet_df, hari_test)
    if len(test) == 0 or len(train) < MIN_BARIS_DATA:
        print(f"⚠️  {kota:<18} : tidak cukup data untuk train/test split, dilewati.")
        return None

    model = buat_model()
    model.fit(train)

    forecast = model.predict(test[["ds"]])
    mae, rmse, mape = hitung_metrik(test["y"].values, forecast["yhat"].values)

    y_pred_naif = baseline_naive_harian(prophet_df, test["ds"].values)
    mae_naif, rmse_naif, _ = hitung_metrik(test["y"].values, y_pred_naif)

    # Model evaluasi tidak disimpan: model produksi dilatih ulang dengan seluruh data.
    model_final = buat_model()
    model_final.fit(prophet_df)

    MODEL_DIR.mkdir(exist_ok=True)
    model_path = MODEL_DIR / f"prophet_{kolom_target}_{kota.lower().replace(' ', '_')}.json.gz"
    with gzip.open(model_path, "wt", encoding="utf-8") as f:
        f.write(model_to_json(model_final))

    lebih_baik = "✅ lebih baik dari baseline" if mae < mae_naif else "⚠️  KALAH dari baseline naif"
    print(
        f"✅ {kota:<18} MAE={mae:6.2f}  RMSE={rmse:6.2f}  MAPE={mape:5.1f}%  "
        f"| baseline naif MAE={mae_naif:6.2f}  ({lebih_baik})"
    )

    return {
        "kota": kota,
        "kolom_target": kolom_target,
        "n_train": len(train),
        "n_test": len(test),
        "mae": round(mae, 3),
        "rmse": round(rmse, 3),
        "mape": round(mape, 2) if not np.isnan(mape) else None,
        "mae_baseline_naif": round(mae_naif, 3),
        "rmse_baseline_naif": round(rmse_naif, 3),
        "lebih_baik_dari_baseline": bool(mae < mae_naif),
        "model_version": model_version,
        "model_path": str(model_path),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }


def simpan_metrik_database(metrik_df, db_url):
    from psycopg2 import connect
    from psycopg2.extras import execute_values

    conn = connect(db_url)
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT city, id FROM cities")
            city_ids = dict(cur.fetchall())
            rows = [
                (
                    city_ids[row.kota], row.kolom_target, row.mae, row.rmse,
                    row.mape, row.mae_baseline_naif, row.rmse_baseline_naif,
                    row.lebih_baik_dari_baseline, row.model_version, row.updated_at,
                )
                for row in metrik_df.itertuples(index=False)
            ]
            execute_values(cur, """
                INSERT INTO model_metrics (
                    city_id, kolom_target, mae, rmse, mape,
                    mae_baseline_naif, rmse_baseline_naif,
                    lebih_baik_dari_baseline, model_version, updated_at
                ) VALUES %s
            """, rows)
        conn.commit()
    finally:
        conn.close()


def main():
    parser = argparse.ArgumentParser(
        description="Latih model Prophet per kota dari data historis hasil backfill_cuaca_historis.py"
    )
    parser.add_argument("--csv", default="data_historis_cuaca.csv", help="Path file CSV hasil backfill")
    parser.add_argument("--target", default=KOLOM_TARGET_DEFAULT,
                         help="Kolom yang diprediksi, mis. temperature_2m / relative_humidity_2m / precipitation")
    parser.add_argument("--hari-test", type=int, default=HARI_TEST_DEFAULT,
                         help="Jumlah hari terakhir yang disisihkan sebagai holdout evaluasi")
    parser.add_argument("--kota", nargs="*", help="Latih hanya kota tertentu (default: semua kota di CSV)")
    parser.add_argument("--no-db", action="store_true",
                        help="Jangan gabungkan data atau simpan metrik ke DATABASE_URL")
    args = parser.parse_args()

    if not Path(args.csv).exists():
        print(f"❌ File '{args.csv}' tidak ditemukan. Jalankan backfill_cuaca_historis.py terlebih dahulu.")
        sys.exit(1)

    db_url = None if args.no_db else os.getenv("DATABASE_URL")
    if not args.no_db and not db_url:
        print("❌ DATABASE_URL tidak diset. Set env atau gunakan --no-db.")
        sys.exit(1)

    df = muat_data(args.csv, db_url)
    if args.target not in df.columns:
        print(f"❌ Kolom target '{args.target}' tidak ada di CSV. Kolom tersedia: {list(df.columns)}")
        sys.exit(1)

    daftar_kota = args.kota if args.kota else sorted(df["kota"].unique())
    model_version = datetime.now(timezone.utc).strftime("v%Y%m%d%H%M%S")
    print(
        f"🔮 Melatih model Prophet — target: {args.target} — {len(daftar_kota)} kota"
        f" — versi: {model_version}\n"
    )

    semua_metrik = []
    for kota in daftar_kota:
        df_kota = df[df["kota"] == kota]
        if df_kota.empty:
            print(f"⚠️  {kota:<18} : tidak ditemukan di CSV, dilewati.")
            continue
        hasil = latih_satu_kota(df_kota, kota, args.target, args.hari_test, model_version)
        if hasil:
            semua_metrik.append(hasil)

    if not semua_metrik:
        print("\n❌ Tidak ada model yang berhasil dilatih.")
        sys.exit(1)

    metrik_df = pd.DataFrame(semua_metrik)
    metrik_df.to_csv(METRICS_FILE, index=False)
    MODEL_DIR.mkdir(exist_ok=True)
    (MODEL_DIR / "model_version.txt").write_text(model_version + "\n", encoding="utf-8")
    if db_url:
        simpan_metrik_database(metrik_df, db_url)

    lolos_baseline = metrik_df["lebih_baik_dari_baseline"].sum()
    tujuan_metrik = f"{METRICS_FILE} dan database" if db_url else str(METRICS_FILE)
    print(f"\n💾 Metrik {len(metrik_df)} model disimpan ke: {tujuan_metrik}")
    print(f"💾 File model (.json.gz) disimpan di folder: {MODEL_DIR}/")
    print(f"📊 {lolos_baseline}/{len(metrik_df)} kota: model Prophet mengungguli baseline naif.")


if __name__ == "__main__":
    main()

import argparse
import sys
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd
from prophet import Prophet
from prophet.serialize import model_to_json

MODEL_VERSION = "v1"
KOLOM_TARGET_DEFAULT = "temperature_2m"
HARI_TEST_DEFAULT = 14          # holdout terakhir N hari dipakai untuk evaluasi, bukan training
MIN_BARIS_DATA = 24 * 14        # minimal ~2 minggu data per kota supaya training masuk akal
MODEL_DIR = Path("models")
METRICS_FILE = Path("model_metrics.csv")


def muat_data(csv_path):
    df = pd.read_csv(csv_path, parse_dates=["datetime_utc"])
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


def latih_satu_kota(df_kota, kota, kolom_target, hari_test):
    prophet_df = siapkan_prophet_df(df_kota, kolom_target)

    if len(prophet_df) < MIN_BARIS_DATA:
        print(f"⚠️  {kota:<18} : data terlalu sedikit ({len(prophet_df)} baris), dilewati.")
        return None

    train, test = split_train_test(prophet_df, hari_test)
    if len(test) == 0 or len(train) < MIN_BARIS_DATA:
        print(f"⚠️  {kota:<18} : tidak cukup data untuk train/test split, dilewati.")
        return None

    model = Prophet(daily_seasonality=True, weekly_seasonality=True, yearly_seasonality="auto")
    model.fit(train)

    forecast = model.predict(test[["ds"]])
    mae, rmse, mape = hitung_metrik(test["y"].values, forecast["yhat"].values)

    y_pred_naif = baseline_naive_harian(prophet_df, test["ds"].values)
    mae_naif, rmse_naif, _ = hitung_metrik(test["y"].values, y_pred_naif)

    MODEL_DIR.mkdir(exist_ok=True)
    model_path = MODEL_DIR / f"prophet_{kolom_target}_{kota.lower().replace(' ', '_')}.json"
    with open(model_path, "w") as f:
        f.write(model_to_json(model))

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
        "model_version": MODEL_VERSION,
        "model_path": str(model_path),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }


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
    args = parser.parse_args()

    if not Path(args.csv).exists():
        print(f"❌ File '{args.csv}' tidak ditemukan. Jalankan backfill_cuaca_historis.py terlebih dahulu.")
        sys.exit(1)

    df = muat_data(args.csv)
    if args.target not in df.columns:
        print(f"❌ Kolom target '{args.target}' tidak ada di CSV. Kolom tersedia: {list(df.columns)}")
        sys.exit(1)

    daftar_kota = args.kota if args.kota else sorted(df["kota"].unique())
    print(f"🔮 Melatih model Prophet — target: {args.target} — {len(daftar_kota)} kota\n")

    semua_metrik = []
    for kota in daftar_kota:
        df_kota = df[df["kota"] == kota]
        if df_kota.empty:
            print(f"⚠️  {kota:<18} : tidak ditemukan di CSV, dilewati.")
            continue
        hasil = latih_satu_kota(df_kota, kota, args.target, args.hari_test)
        if hasil:
            semua_metrik.append(hasil)

    if not semua_metrik:
        print("\n❌ Tidak ada model yang berhasil dilatih.")
        sys.exit(1)

    metrik_df = pd.DataFrame(semua_metrik)
    tulis_header = not METRICS_FILE.exists()
    metrik_df.to_csv(METRICS_FILE, mode="a", header=tulis_header, index=False)

    lolos_baseline = metrik_df["lebih_baik_dari_baseline"].sum()
    print(f"\n💾 Metrik {len(metrik_df)} model ditambahkan ke: {METRICS_FILE}")
    print(f"💾 File model (.json) disimpan di folder: {MODEL_DIR}/")
    print(f"📊 {lolos_baseline}/{len(metrik_df)} kota: model Prophet mengungguli baseline naif.")


if __name__ == "__main__":
    main()
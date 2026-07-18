# WeatherInsight Indonesia (NusaForecast)

Platform analisis, monitoring, dan prediksi cuaca 38 ibu kota provinsi Indonesia.

**Stack:** Next.js 16 → FastAPI → Supabase PostgreSQL · Prophet ML · Open-Meteo API

## Deploy (4 langkah)

### 1. Supabase — Database

```bash
# Jalankan schema.sql di Supabase SQL Editor
# https://supabase.com/dashboard → project → SQL Editor
# Copy-paste isi backend/schema.sql → Run
```

Schema aman dijalankan ulang pada database yang sudah ada untuk menambahkan tabel dan fungsi agregasi.

Simpan **DATABASE_URL** (Supabase Dashboard → Settings → Database → Connection String).

### 2. Render — Backend

1. Buat **Web Service** di [Render](https://dashboard.render.com)
2. Connect ke GitHub repo ini
3. Render membaca `render.yaml` dan membangun backend dari `Dockerfile` secara otomatis.
   - **Runtime:** Docker
   - **Dockerfile path:** `./Dockerfile`
   - **Health check path:** `/api/health`
4. Set env var: `DATABASE_URL` = connection string dari Supabase
5. Set env var: `CORS_ORIGINS` = `https://[nama-app].vercel.app`

Catat URL backend: `https://weatherinsight-api.onrender.com`

### 3. Vercel — Frontend

```bash
cd frontend
vercel deploy --prod
```

Set env var di Vercel dashboard:
- `NEXT_PUBLIC_BACKEND_URL` = URL Render dari step 2

### 4. cron-job.org — Scraper + Agregasi

Tambahkan env var `CRON_SECRET` di Render menggunakan token acak panjang, lalu buat satu job di [cron-job.org](https://cron-job.org):

- **URL:** `https://weatherinsight-api.onrender.com/api/jobs/hourly`
- **Method:** `POST`
- **Schedule:** setiap jam pada menit `05`
- **Header:** `Authorization: Bearer <CRON_SECRET>`
- **Request timeout:** `300` detik untuk mengakomodasi [cold start Render free](https://render.com/docs/free)
- Aktifkan notifikasi ketika job gagal.

cron-job.org mendukung method POST, custom header, dan timeout tersebut melalui [konfigurasi job](https://docs.cron-job.org/rest-api.html).

Tes manual setelah deploy:

```bash
curl -X POST \
  -H "Authorization: Bearer $CRON_SECRET" \
  https://weatherinsight-api.onrender.com/api/jobs/hourly
```

Endpoint mengambil cuaca terbaru, lalu merangkum data hourly yang berumur lebih dari 90 hari ke `weather_daily_summary` dan menghapus data hourly sumbernya dalam satu transaksi.

## Backfill dan retraining model

```bash
# Mengisi ulang arsip 365 hari ke CSV sekaligus database
DATABASE_URL='postgresql://...' python3 backfill_cuaca_historis.py --hari 365 --force

# Melatih ulang 38 model dari arsip + data database yang lebih baru
DATABASE_URL='postgresql://...' python3 train_model_prophet.py
```

Training memakai split waktu untuk evaluasi, lalu melatih model produksi kembali dengan seluruh data. Metrik disimpan ke `model_metrics`, sedangkan artifact gzip dan `model_version.txt` disimpan di `models/` agar ikut deployment. Jalankan retraining berkala sebelum deploy model baru; agregat harian dan raw terbaru setelah ujung CSV otomatis ikut sebagai data tambahan.

## Development

```bash
# Backend
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Frontend
cd frontend
npm install
cp ../.env.example .env.local  # edit NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
npm run dev
```

## Arsitektur

```
cron-job.org ──POST /api/jobs/hourly──→ FastAPI (Render)
                                             │
Open-Meteo API ──→ scraper hourly ───────────┤
                                             ▼
                                     Supabase PostgreSQL
                                  (raw 90 hari + agregat harian)
                                             │
                                      Next.js (Vercel)
```

Baca [PRD.md](PRD.md) untuk dokumen lengkap — scope, roadmap, risiko, log keputusan.

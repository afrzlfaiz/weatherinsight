# WeatherInsight Indonesia (NusaForecast)

Platform analisis, monitoring, dan prediksi cuaca 38 ibu kota provinsi Indonesia.

**Stack:** Next.js 16 → FastAPI → Supabase PostgreSQL · Prophet ML · Open-Meteo API

## Deploy (3 langkah)

### 1. Supabase — Database

```bash
# Jalankan schema.sql di Supabase SQL Editor
# https://supabase.com/dashboard → project → SQL Editor
# Copy-paste isi backend/schema.sql → Run
```

Simpan **DATABASE_URL** (Supabase Dashboard → Settings → Database → Connection String).

### 2. Render — Backend

1. Buat **Web Service** di [Render](https://dashboard.render.com)
2. Connect ke GitHub repo ini
3. Render auto-detect `render.yaml` (atau set manual):
   - **Runtime:** Python 3.12
   - **Build Command:** `pip install -r backend/requirements.txt`
   - **Start Command:** `cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT`
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

### 4. GitHub Actions — Scraper Cron

Set secret di repo GitHub:
- `Settings → Secrets and variables → Actions → New repository secret`
- Nama: `DATABASE_URL`, Value: connection string Supabase (sama dengan step 1)

Scraper jalan otomatis tiap jam (`scrape-hourly.yml`). Manual trigger: Actions tab → "Scrape Cuaca Hourly" → Run workflow.

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
Open-Meteo API ──→ GitHub Actions (scraper, cron hourly) ──→ Supabase PostgreSQL
                                                                    │
                                              FastAPI (Render) ←────┘
                                                    │
                                              Next.js (Vercel)
```

Baca [PRD.md](PRD.md) untuk dokumen lengkap — scope, roadmap, risiko, log keputusan.

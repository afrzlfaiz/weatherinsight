# PRD: WeatherInsight Indonesia (NusaForecast)

**Status:** Draft v1
**Terakhir diperbarui:** 15 Juli 2026
**Pemilik proyek:** [isi nama Anda]

**Tagline:** Platform analisis, monitoring, dan prediksi cuaca kota-kota Indonesia.

---

## 1. Ringkasan & Latar Belakang

WeatherInsight Indonesia adalah platform analitik cuaca yang mengambil data secara otomatis, menyimpan histori, melakukan forecasting berbasis machine learning, dan menyajikannya lewat dashboard interaktif serta REST API publik.

Proyek ini dibangun sebagai **portofolio teknis**, bukan produk komersial. Alih-alih membuat aplikasi cuaca sederhana (yang sudah banyak alternatifnya di pasar), proyek ini secara sengaja dirancang sebagai *end-to-end pipeline* — mulai dari scraping, ETL, penyimpanan, pemodelan ML, hingga penyajian API — untuk menunjukkan kompetensi gabungan **Data Engineer + Data Scientist + Full Stack Developer** dalam satu sistem yang benar-benar berjalan di production, bukan sekadar notebook atau demo lokal.

## 2. Tujuan Proyek

| # | Tujuan |
|---|--------|
| 1 | Membangun pipeline data otomatis (scraping → validasi → penyimpanan) yang berjalan tanpa intervensi manual |
| 2 | Menyediakan dashboard publik yang menampilkan kondisi cuaca real-time dan histori untuk kota-kota di Indonesia |
| 3 | Melatih dan mengevaluasi model forecasting cuaca per kota, dengan metrik yang jujur (dibandingkan terhadap baseline, bukan cuma angka MAE berdiri sendiri) |
| 4 | Menyediakan REST API terdokumentasi yang bisa dipakai pihak lain |
| 5 | Mendemonstrasikan praktik rekayasa yang matang: retry/error handling, retensi data, monitoring, CI/CD — bukan cuma fitur yang "terlihat" di UI |

## 3. Target Pengguna

- **Primer:** Recruiter/interviewer teknis yang mengevaluasi portofolio — perlu bisa memahami arsitektur dan kualitas engineering dalam waktu singkat.
- **Sekunder:** Pengguna umum yang mengecek cuaca kota-kota Indonesia dan tren historisnya.
- **Tersier:** Developer lain yang ingin memakai API publik untuk keperluan mereka sendiri.

## 4. Metrik Keberhasilan

Karena ini proyek portofolio, "sukses" diukur dari kualitas rekayasa dan kelengkapan cerita teknis, bukan jumlah pengguna:

- **Reliabilitas data**: ≥ 95% dari jam yang seharusnya ter-scrape benar-benar tersimpan (dipantau lewat endpoint `/api/health`).
- **Akurasi model**: mayoritas kota punya model Prophet yang mengungguli baseline naif (metrik `lebih_baik_dari_baseline` di `model_metrics`).
- **Uptime dashboard/API**: dipantau via exit1.dev, target ≥ 99% (di luar cold-start yang disengaja).
- **Kelengkapan dokumentasi**: API terdokumentasi via Swagger/OpenAPI, PRD dan README lengkap, keputusan desain terekam (lihat Bagian 14).
- **Deployment hidup**: seluruh sistem berjalan di production selama minimal beberapa bulan berturut-turut dengan data yang terus terkumpul — bukan cuma demo sekali jalan.

## 5. Lingkup (Scope)

**Termasuk dalam scope v1:**
- 38 ibu kota provinsi Indonesia (koordinat tetap, tanpa geocoding runtime).
- Data cuaca: suhu, kelembapan, tekanan, kecepatan & arah angin, tutupan awan, curah hujan, kode cuaca WMO.
- Forecasting suhu, kelembapan, dan curah hujan per kota (model terpisah per kota per variabel).
- Dashboard: Home, Dashboard Kota, Forecast, Analytics, Compare Cities, API Explorer.

> **Catatan keputusan scope:** Rekomendasi awal adalah memulai dari 3–5 kota untuk MVP lalu memperluas bertahap, guna mengurangi risiko proyek tidak pernah selesai. Namun implementasi scraper dan backfill yang sudah dibangun langsung mencakup ke-38 provinsi. Ini pilihan sadar yang meningkatkan kompleksitas awal (lihat Bagian 9 soal implikasinya ke kuota storage), dan perlu dipantau supaya Tahap 1–2 tetap selesai tepat waktu sebelum beban bertambah di Tahap 3.

**Di luar scope v1 (Tahap 5 / nice-to-have):**
- Heatmap Indonesia, rain map, notifikasi push, download data (CSV/Excel/JSON), dark mode.
- Model deep learning (LSTM) — dievaluasi hanya jika Prophet/XGBoost belum memadai.
- Autentikasi pengguna / akun personal.
- Monetisasi atau API berbayar.

## 6. Sumber Data

**Open-Meteo** dipakai untuk **live scraping maupun backfill historis** — keputusan ini disengaja supaya tidak ada *train-serve skew* (model dilatih dari sumber yang beda karakteristik statistiknya dengan data yang di-scrape live).

| API | Kegunaan | Catatan Penting |
|---|---|---|
| Forecast API (`api.open-meteo.com`) | Scraping live, tiap jam | Punya field `visibility`; field `current.time` dipakai sebagai timestamp resmi, bukan waktu eksekusi script |
| Historical Weather API (`archive-api.open-meteo.com`) | Backfill data historis untuk training awal | **Tidak** punya field `visibility` (baris backfill akan NULL di kolom itu); data ERA5 punya delay ~5 hari sebelum final |

Kuota gratis: hingga 10.000 request/hari untuk penggunaan non-komersial — jauh di atas kebutuhan (38 kota × 24 request/hari live + 38 request sekali untuk backfill).

## 7. Arsitektur Sistem

```
cron-job.org ──POST /api/jobs/hourly──→ FastAPI Backend (Render)
                                              │
Open-Meteo API ──→ scraper hourly ────────────┤
                                              ▼
                                      Supabase PostgreSQL
                               (raw 90 hari + agregat harian)
                                      ▲               │
                                      │               ▼
Backfill Script ──────────────────────┘       Next.js Frontend (Vercel)
                                                      │
Training Script ──→ models/*.json.gz                  ▼
                                              exit1.dev health monitor
```

**Prinsip desain kunci:** cron-job.org hanya menjadi scheduler eksternal. Satu endpoint internal FastAPI menjalankan scraper lalu agregasi retensi secara berurutan. Endpoint diamankan dengan Bearer token dan timeout scheduler dibuat 300 detik untuk mengakomodasi cold start Render.

### Stack

| Layer | Teknologi |
|---|---|
| Frontend | Next.js, Tailwind, shadcn/ui, Leaflet (peta), Chart.js (grafik) |
| Backend | FastAPI |
| Database | PostgreSQL (Supabase, free tier) |
| Machine Learning | Prophet (v1), dibandingkan dengan baseline naif; XGBoost/LightGBM sebagai kandidat v2 |
| Automation | cron-job.org → endpoint internal FastAPI |
| Monitoring | exit1.dev (uptime + health check) |
| Deployment | Vercel (frontend), Render (backend), Supabase (database) |

## 8. Skema Database

```
cities            weather                weather_daily_summary    forecast / model_metrics
─────────         ─────────              ─────────────────────    ────────────────────────
id                id                     city_id (FK)              city_id (FK)
province          city_id (FK)           date                     forecast/model fields
city              datetime               temperature avg/min/max
latitude          temperature            humidity/pressure avg
longitude         humidity               wind avg/max
timezone          pressure               cloud avg
                  wind/cloud/rainfall     rainfall sum
                  visibility *nullable*   observation_count
```

## 9. Strategi Retensi & Storage

**Kendala utama:** Supabase free tier dibatasi **500 MB** — jauh lebih kecil dari asumsi awal, dan menjadi driver utama keputusan retensi berikut:

- **Tabel `weather`** (raw, hourly): mempertahankan 90 hari terakhir. Endpoint hourly memanggil fungsi agregasi setelah scraping; fungsi memindahkan hari UTC yang sudah melewati batas ke `weather_daily_summary`, lalu menghapus raw sumbernya secara atomik.
- **Tabel `forecast`**: risiko pertumbuhan **jauh lebih cepat** dari `weather` kalau setiap run menyimpan seluruh horizon forecast (24 jam + 3 hari + 7 hari) untuk 38 kota tiap jam. Retensi di tabel ini harus jauh lebih agresif — hanya simpan forecast aktif/terbaru per kota, bukan akumulasi semua histori generate.
- **Downsampling:** data `weather` yang lebih tua dari 90 hari diringkas ke agregat UTC harian (`weather_daily_summary`), lalu data hourly sumbernya dihapus dalam transaksi yang sama. Satu endpoint hourly menjalankan proses ini secara idempoten setelah scraping selesai.
- **Catatan teknis:** `DELETE` di Postgres tidak langsung mengecilkan ukuran fisik database (perlu `VACUUM`/autovacuum) — perlu dipantau lewat Supabase dashboard, bukan diasumsikan otomatis instan.

## 10. Pendekatan Machine Learning / Forecasting

- **Mengatasi cold-start:** alih-alih menunggu data live terkumpul secara real-time selama berbulan-bulan, training awal memakai **backfill historis** dari Open-Meteo Historical API (1–2 tahun data per kota), sehingga model sudah bisa dipakai sejak hari pertama peluncuran.
- **Model:** Prophet, dilatih terpisah per kota per variabel target (suhu, kelembapan, curah hujan).
- **Evaluasi:** split kronologis (train/test berbasis waktu, bukan acak) untuk menghindari data leakage. Metrik MAE/RMSE/MAPE **selalu dibandingkan dengan baseline naif** (nilai 24 jam sebelumnya) — model yang tidak mengungguli baseline ini ditandai eksplisit, bukan disembunyikan.
- **Retraining:** dijalankan berkala sebelum deployment model baru. Training menggabungkan arsip backfill awal dengan agregat harian dan data raw terbaru dari database setelah ujung arsip, sehingga dataset tetap berkembang meski raw memiliki retensi 90 hari.
- **Versioning:** setiap model disimpan dengan `model_version`, hasil evaluasi tercatat di `model_metrics` per waktu — memungkinkan pelacakan apakah model membaik dari waktu ke waktu.
- **Batasan yang diakui secara terbuka:** forecasting cuaca yang serius berbasis model fisika atmosfer (NWP), bukan time-series biasa. Framing proyek ini adalah *model pembanding vs sumber resmi* dan *nowcasting jangka pendek*, bukan klaim mengalahkan BMKG/lembaga resmi.

## 11. Fitur Produk (per halaman)

| Halaman | Fitur Inti |
|---|---|
| **Home** | Peta Indonesia, status cuaca seluruh kota, suhu rata-rata nasional, kota terpanas/terdingin |
| **Dashboard Kota** | Cuaca terkini, grafik suhu 7/30 hari, forecast 24 jam/3 hari/7 hari |
| **Forecast** | Pilih kota & tanggal → prediksi suhu, hujan, kelembapan |
| **Analytics** | Suhu rata-rata, tren hujan, distribusi kelembapan, korelasi variabel |
| **Compare Cities** | Perbandingan suhu/hujan/kelembapan antar kota terpilih |
| **API Explorer** | Dokumentasi `/api/weather`, `/api/forecast`, `/api/history` (Swagger/OpenAPI) |
| **Admin Dashboard** | Last scraping run, ukuran database, status API, status prediksi |

## 12. Infrastruktur & Deployment

| Komponen | Platform | Batasan Free Tier yang Perlu Diperhatikan |
|---|---|---|
| Frontend | Vercel | Serverless, tidak ada konsep "sleep" |
| Backend | Render | 750 jam instance/bulan **per workspace** (bukan per service — baru berisiko kalau ada service lain berjalan paralel); cold start ~30-60 detik setelah 15 menit idle |
| Database | Supabase | **500 MB** batas ukuran database — driver utama strategi retensi di Bagian 9 |
| Scheduling | cron-job.org | Memanggil URL publik FastAPI; gunakan POST, Bearer token, timeout 300 detik, dan notifikasi kegagalan |
| Monitoring | exit1.dev | 10 monitor, interval cek minimum 5 menit di free tier |

**Pemisahan tanggung jawab exit1.dev:** dipakai murni untuk monitoring (endpoint `/api/health` terpisah), bukan sekaligus sebagai pemicu job scraping — supaya kalau exit1.dev sendiri bermasalah, tetap ada jalur alert yang independen dari jalur yang gagal.

## 13. Roadmap / Milestone

| Tahap | Fokus | Kondisi saat ini |
|---|---|---|
| **1. Data Engineering** | Scraper hourly, backfill historis, insert ke Supabase, endpoint data historis | ✅ Script scraping & backfill sudah dibuat dan divalidasi |
| **2. Dashboard** | Cuaca terkini, grafik historis, peta interaktif, pencarian & perbandingan kota | Belum dimulai |
| **3. Machine Learning** | Training Prophet per kota, evaluasi vs baseline, retraining berkala | ✅ Script training sudah dibuat dan divalidasi end-to-end |
| **4. Production** | Dockerisasi, CI/CD, dokumentasi API (Swagger), monitoring/logging | Backend Docker ✅; CI/CD dan monitoring lanjutan belum |
| **5. Nice-to-have** | Heatmap, rain map, notifikasi, download data, dark mode | Belum dimulai — sengaja ditunda sampai Tahap 4 selesai |

## 14. Risiko & Mitigasi (Log Keputusan)

| Risiko | Mitigasi yang Diputuskan |
|---|---|
| Tabel `forecast` membengkak jauh lebih cepat dari `weather` | Retensi agresif, hanya simpan forecast aktif |
| exit1.dev jadi single point of failure (trigger + health signal jadi satu) | Pisah jadi 2 endpoint/monitor: trigger scraping vs health check |
| Endpoint cron dapat dipanggil pihak tidak berwenang | Wajib Bearer token `CRON_SECRET`; endpoint tidak ditampilkan di Swagger publik |
| Cold-start model forecasting (butuh histori berbulan-bulan) | Backfill dari Historical API, bukan menunggu real-time |
| Train-serve skew (sumber data historis ≠ sumber live) | Kedua sumber memakai Open-Meteo secara konsisten |
| Kuota Supabase 500 MB gampang habis kalau retensi naif | Time-window delete + downsampling untuk data lama |
| Data timestamp drift akibat delay scheduler | Timestamp diambil dari field `time` respons API, bukan `datetime.now()` lokal |

## 15. Lampiran: Aset yang Sudah Dibuat

- `scrape_cuaca_indonesia.py` — scraper live hourly, 38 kota, retry otomatis, SSL verification aktif.
- `backfill_cuaca_historis.py` — backfill historis dari Open-Meteo Historical API, resumable per kota.
- `train_model_prophet.py` — training Prophet per kota, evaluasi MAE/RMSE/MAPE vs baseline naif, sudah divalidasi end-to-end dengan data sintetis.

---

*Dokumen ini adalah living document — perbarui setiap ada keputusan desain baru, terutama di Bagian 14, supaya jejak alasan teknis tetap terekam untuk keperluan portofolio/wawancara.*

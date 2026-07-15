"""WeatherInsight Indonesia — FastAPI Backend.
Serves weather, forecast, history, and analytics from Supabase PostgreSQL.

ponytail: semua route di satu file. 38 kota, bukan 380.
           Split ke routers/ kalau sudah >500 baris.
"""
import os
from datetime import datetime, timezone
from pathlib import Path

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from database import get_pool, close_pool

# ── App ────────────────────────────────────────────────────────────

app = FastAPI(
    title="WeatherInsight Indonesia API",
    description="API publik untuk data cuaca, forecast ML, dan analitik 38 kota di Indonesia.",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)


@app.on_event("startup")
async def startup():
    await get_pool()  # warm up pool


@app.on_event("shutdown")
async def shutdown():
    await close_pool()


app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "*").split(","),
    allow_methods=["GET"],
    allow_headers=["*"],
)

# ── Pydantic Schemas ───────────────────────────────────────────────


class CityOut(BaseModel):
    id: int
    province: str
    city: str
    latitude: float
    longitude: float
    timezone: str


class WeatherOut(BaseModel):
    id: int
    city_id: int
    city: str | None = None  # diisi manual lewat JOIN
    province: str | None = None
    datetime: datetime  # asyncpg returns datetime object, Pydantic serializes to ISO string
    temperature: float | None
    humidity: float | None
    pressure: float | None
    wind_speed: float | None
    wind_direction: float | None
    visibility: float | None
    cloud: float | None
    rainfall: float | None
    weather_code: int | None
    weather_description: str | None


class ForecastPoint(BaseModel):
    forecast_time: str
    temperature: float | None
    humidity: float | None
    rainfall: float | None


class ForecastOut(BaseModel):
    city_id: int
    city: str
    model_version: str
    generated_at: str
    hours: int
    forecast: list[ForecastPoint]


class HealthOut(BaseModel):
    status: str
    db_connected: bool
    cities_count: int
    last_weather_time: str | None


class AnalyticsSummary(BaseModel):
    avg_temperature: float | None
    hottest_city: dict | None
    coldest_city: dict | None
    avg_humidity: float | None
    total_cities_with_data: int


class CompareOut(BaseModel):
    city_id: int
    city: str
    province: str
    temperature: float | None
    humidity: float | None
    rainfall: float | None
    wind_speed: float | None


class ModelMetricOut(BaseModel):
    id: int
    city_id: int
    city: str | None
    province: str | None
    kolom_target: str
    mae: float | None
    rmse: float | None
    mape: float | None
    mae_baseline_naif: float | None
    rmse_baseline_naif: float | None
    lebih_baik_dari_baseline: bool | None
    model_version: str
    updated_at: datetime


# ── Helpers ────────────────────────────────────────────────────────

MODEL_DIR = Path(__file__).resolve().parent.parent / "models"


async def _get_city_or_404(city_id: int) -> dict:
    pool = await get_pool()
    city = await pool.fetchrow("SELECT * FROM cities WHERE id = $1", city_id)
    if not city:
        raise HTTPException(404, f"City id={city_id} tidak ditemukan")
    return dict(city)


def _city_slug(city_name: str) -> str:
    return city_name.lower().replace(" ", "_")


# ── Health ─────────────────────────────────────────────────────────


@app.get("/api/health", response_model=HealthOut)
async def health():
    try:
        pool = await get_pool()
        cities_count = await pool.fetchval("SELECT count(*) FROM cities")
        last = await pool.fetchrow("""
            SELECT datetime FROM weather ORDER BY datetime DESC LIMIT 1
        """)
        return HealthOut(
            status="ok",
            db_connected=True,
            cities_count=cities_count or 0,
            last_weather_time=last["datetime"].isoformat() if last else None,
        )
    except Exception:
        return HealthOut(status="degraded", db_connected=False, cities_count=0, last_weather_time=None)


# ── Cities ─────────────────────────────────────────────────────────


@app.get("/api/cities", response_model=list[CityOut])
async def list_cities(province: str | None = Query(None)):
    pool = await get_pool()
    if province:
        rows = await pool.fetch(
            "SELECT * FROM cities WHERE province ILIKE $1 ORDER BY city", f"%{province}%"
        )
    else:
        rows = await pool.fetch("SELECT * FROM cities ORDER BY city")
    return [dict(r) for r in rows]


@app.get("/api/cities/{city_id}", response_model=dict)
async def get_city(city_id: int):
    city = await _get_city_or_404(city_id)
    pool = await get_pool()
    weather = await pool.fetchrow("""
        SELECT * FROM weather
        WHERE city_id = $1
        ORDER BY datetime DESC LIMIT 1
    """, city_id)
    city["latest_weather"] = dict(weather) if weather else None
    return city


# ── Weather ────────────────────────────────────────────────────────


@app.get("/api/weather/current", response_model=list[WeatherOut])
async def current_weather_all():
    pool = await get_pool()
    rows = await pool.fetch("""
        SELECT DISTINCT ON (w.city_id)
            w.*, c.city, c.province
        FROM weather w
        JOIN cities c ON c.id = w.city_id
        ORDER BY w.city_id, w.datetime DESC
    """)
    return [dict(r) for r in rows]


@app.get("/api/weather/current/{city_id}", response_model=WeatherOut)
async def current_weather_city(city_id: int):
    await _get_city_or_404(city_id)
    pool = await get_pool()
    row = await pool.fetchrow("""
        SELECT w.*, c.city, c.province
        FROM weather w
        JOIN cities c ON c.id = w.city_id
        WHERE w.city_id = $1
        ORDER BY w.datetime DESC
        LIMIT 1
    """, city_id)
    if not row:
        raise HTTPException(404, f"Belum ada data cuaca untuk city_id={city_id}")
    return dict(row)


# ── History ────────────────────────────────────────────────────────


@app.get("/api/history/{city_id}", response_model=list[WeatherOut])
async def history(city_id: int, days: int = Query(30, ge=1, le=365)):
    await _get_city_or_404(city_id)
    pool = await get_pool()
    rows = await pool.fetch("""
        SELECT w.*, c.city, c.province
        FROM weather w
        JOIN cities c ON c.id = w.city_id
        WHERE w.city_id = $1
          AND w.datetime >= NOW() - make_interval(days => $2)
        ORDER BY w.datetime DESC
    """, city_id, days)
    return [dict(r) for r in rows]


# ── Forecast ───────────────────────────────────────────────────────


@app.get("/api/forecast/{city_id}", response_model=ForecastOut)
async def forecast(
    city_id: int,
    hours: int = Query(24, ge=1, le=168),  # max 7 hari
    target: str = Query("temperature_2m", pattern=r"^(temperature_2m|relative_humidity_2m|precipitation)$"),
):
    city = await _get_city_or_404(city_id)
    slug = _city_slug(city["city"])
    model_path = MODEL_DIR / f"prophet_{target}_{slug}.json"

    if not model_path.exists():
        raise HTTPException(
            404,
            f"Model Prophet untuk {city['city']} ({target}) belum tersedia. "
            f"Jalankan train_model_prophet.py terlebih dahulu.",
        )

    # ponytail: lazy import Prophet — berat, cuma dipakai di endpoint ini
    import pandas as pd
    from prophet import Prophet
    from prophet.serialize import model_from_json

    with open(model_path) as f:
        model: Prophet = model_from_json(f.read())

    future = model.make_future_dataframe(periods=hours, freq="h")
    forecast_df = model.predict(future)
    # ambil hanya N jam ke depan (skip data historis yang ikut di future_df)
    now = pd.Timestamp.now(tz="UTC").floor("h")
    future_rows = forecast_df[forecast_df["ds"] >= now].head(hours)

    points: list[ForecastPoint] = []
    for _, row in future_rows.iterrows():
        val = row.get("yhat")
        # Prophet hanya prediksi satu target — kembalikan di field yang sesuai
        temp = round(float(val), 1) if target == "temperature_2m" and val is not None else None
        hum = round(float(val), 1) if target == "relative_humidity_2m" and val is not None else None
        rain = round(float(val), 1) if target == "precipitation" and val is not None else None
        points.append(ForecastPoint(
            forecast_time=row["ds"].isoformat(),
            temperature=temp,
            humidity=hum,
            rainfall=rain,
        ))

    return ForecastOut(
        city_id=city_id,
        city=city["city"],
        model_version="v1",
        generated_at=datetime.now(timezone.utc).isoformat(),
        hours=len(points),
        forecast=points,
    )


# ── Analytics ──────────────────────────────────────────────────────


@app.get("/api/analytics/summary", response_model=AnalyticsSummary)
async def analytics_summary():
    pool = await get_pool()
    row = await pool.fetchrow("""
        SELECT
            AVG(temperature) AS avg_temp,
            AVG(humidity) AS avg_hum,
            COUNT(DISTINCT city_id) AS cities_with_data
        FROM weather
        WHERE datetime >= NOW() - INTERVAL '1 hour'
    """)
    hottest = await pool.fetchrow("""
        SELECT w.city_id, c.city, c.province, w.temperature
        FROM weather w JOIN cities c ON c.id = w.city_id
        WHERE w.datetime >= NOW() - INTERVAL '1 hour'
        ORDER BY w.temperature DESC NULLS LAST LIMIT 1
    """)
    coldest = await pool.fetchrow("""
        SELECT w.city_id, c.city, c.province, w.temperature
        FROM weather w JOIN cities c ON c.id = w.city_id
        WHERE w.datetime >= NOW() - INTERVAL '1 hour'
        ORDER BY w.temperature ASC NULLS LAST LIMIT 1
    """)
    return AnalyticsSummary(
        avg_temperature=round(row["avg_temp"], 1) if row and row["avg_temp"] else None,
        avg_humidity=round(row["avg_hum"], 1) if row and row["avg_hum"] else None,
        total_cities_with_data=row["cities_with_data"] if row else 0,
        hottest_city=dict(hottest) if hottest else None,
        coldest_city=dict(coldest) if coldest else None,
    )


@app.get("/api/analytics/compare", response_model=list[CompareOut])
async def compare(cities: str = Query(..., description="IDs kota dipisah koma, mis. 1,2,3")):
    ids = [int(x.strip()) for x in cities.split(",") if x.strip()]
    if not ids or len(ids) > 5:
        raise HTTPException(400, "Minimal 1 kota, maksimal 5.")
    pool = await get_pool()
    placeholders = ",".join(f"${i+1}" for i in range(len(ids)))
    rows = await pool.fetch(f"""
        SELECT DISTINCT ON (w.city_id)
            w.city_id, c.city, c.province,
            w.temperature, w.humidity, w.rainfall, w.wind_speed
        FROM weather w
        JOIN cities c ON c.id = w.city_id
        WHERE w.city_id IN ({placeholders})
        ORDER BY w.city_id, w.datetime DESC
    """, *ids)
    return [dict(r) for r in rows]


# ── Model Metrics ──────────────────────────────────────────────────


@app.get("/api/model-metrics", response_model=list[ModelMetricOut])
async def model_metrics(city_id: int | None = Query(None)):
    pool = await get_pool()
    if city_id:
        rows = await pool.fetch("""
            SELECT mm.*, c.city, c.province FROM model_metrics mm
            JOIN cities c ON c.id = mm.city_id
            WHERE mm.city_id = $1
            ORDER BY mm.updated_at DESC
        """, city_id)
    else:
        rows = await pool.fetch("""
            SELECT mm.*, c.city, c.province FROM model_metrics mm
            JOIN cities c ON c.id = mm.city_id
            ORDER BY mm.mae ASC
        """)
    return [dict(r) for r in rows]


# ── Run ────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

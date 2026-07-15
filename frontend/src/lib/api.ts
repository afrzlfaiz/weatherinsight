// ============================================================================
// WeatherInsight Indonesia — API Client
// Backend-first: FastAPI untuk current weather, history, analytics.
// Forecast multi-variabel masih dari Open-Meteo (backend belum punya model
// humidity/precipitation/wind — hanya Prophet temperature).
// ============================================================================

import { CITIES, type CityData } from "./constants";
import { BACKEND_URL } from "./config";

const FORECAST_BASE = "https://api.open-meteo.com/v1/forecast";
const HISTORICAL_BASE = "https://archive-api.open-meteo.com/v1/archive";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface CurrentWeather {
  city: string;
  province: string;
  slug: string;
  lat: number;
  lon: number;
  time: string;
  temperature: number;
  humidity: number;
  pressure: number;
  windSpeed: number;
  windDirection: number;
  cloudCover: number;
  precipitation: number;
  weatherCode: number;
  visibility: number;
}

export interface HourlyData {
  time: string[];
  temperature: number[];
  humidity: number[];
  precipitation: number[];
  weatherCode: number[];
  windSpeed: number[];
  cloudCover: number[];
  pressure: number[];
}

export interface DailyData {
  time: string[];
  temperatureMax: number[];
  temperatureMin: number[];
  precipitationSum: number[];
  weatherCode: number[];
  windSpeedMax: number[];
}

export interface ForecastData {
  city: CityData;
  hourly: HourlyData;
  daily: DailyData;
}

export interface ModelMetric {
  city: string;
  province: string;
  target: string;
  nTrain: number;
  nTest: number;
  mae: number;
  rmse: number;
  mape: number | null;
  maeBaseline: number;
  rmseBaseline: number;
  betterThanBaseline: boolean;
  modelVersion: string;
  updatedAt: string;
}

export interface AnalyticsSummary {
  avgTemperature: number | null;
  hottestCity: { city: string; province: string; temperature: number } | null;
  coldestCity: { city: string; province: string; temperature: number } | null;
  avgHumidity: number | null;
  totalCitiesWithData: number;
}

// ─── Slug → ID cache ────────────────────────────────────────────────────────

let _cityIdMap: Map<string, number> | null = null;

async function getCityIdMap(): Promise<Map<string, number>> {
  if (_cityIdMap) return _cityIdMap;
  try {
    const resp = await fetch(`${BACKEND_URL}/api/cities`);
    if (!resp.ok) throw new Error(`Cities API: ${resp.status}`);
    const cities: { id: number; city: string }[] = await resp.json();
    _cityIdMap = new Map(
      cities.map((c) => [slugify(c.city), c.id])
    );
  } catch {
    // ponytail: fallback — derive slug→id dari indeks CITIES (asumsi id = indeks+1)
    _cityIdMap = new Map(CITIES.map((c, i) => [c.slug, i + 1]));
  }
  return _cityIdMap;
}

async function resolveCityId(slug: string): Promise<number> {
  const map = await getCityIdMap();
  const id = map.get(slug);
  if (id === undefined) throw new Error(`City slug "${slug}" tidak ditemukan`);
  return id;
}

function slugify(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "-");
}

// ─── Adapters: backend snake_case → frontend camelCase ──────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function adaptWeather(be: Record<string, any>): CurrentWeather {
  const city = be.city || "";
  const slug = slugify(city);
  const cityMeta = CITIES.find((c) => c.slug === slug);
  return {
    city,
    province: be.province || "",
    slug,
    lat: cityMeta?.lat ?? 0,
    lon: cityMeta?.lon ?? 0,
    time: be.datetime || "",
    temperature: be.temperature ?? 0,
    humidity: be.humidity ?? 0,
    pressure: be.pressure ?? 0,
    windSpeed: be.wind_speed ?? 0,
    windDirection: be.wind_direction ?? 0,
    cloudCover: be.cloud ?? 0,
    precipitation: be.rainfall ?? 0,
    weatherCode: be.weather_code ?? 0,
    visibility: be.visibility ?? 0,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function adaptHistoryRows(rows: Record<string, any>[]): HourlyData {
  if (!rows.length) return { time: [], temperature: [], humidity: [], precipitation: [], weatherCode: [], windSpeed: [], cloudCover: [], pressure: [] };
  return {
    time: rows.map((r) => r.datetime || ""),
    temperature: rows.map((r) => r.temperature ?? 0),
    humidity: rows.map((r) => r.humidity ?? 0),
    precipitation: rows.map((r) => r.rainfall ?? 0),
    weatherCode: rows.map((r) => r.weather_code ?? 0),
    windSpeed: rows.map((r) => r.wind_speed ?? 0),
    cloudCover: rows.map((r) => r.cloud ?? 0),
    pressure: rows.map((r) => r.pressure ?? 0),
  };
}

// ─── Current Weather ────────────────────────────────────────────────────────

export async function fetchAllCurrentWeather(): Promise<CurrentWeather[]> {
  try {
    const resp = await fetch(`${BACKEND_URL}/api/weather/current`);
    if (!resp.ok) throw new Error(`Weather API: ${resp.status}`);
    const data = await resp.json();
    return data.map(adaptWeather);
  } catch (err) {
    console.warn("Backend weather/current gagal:", err);
    return []; // ponytail: return empty, komponen fallback ke "no data" state
  }
}

// ─── Historical Weather (dari backend Supabase) ─────────────────────────────

export async function fetchHistoricalWeather(
  city: CityData,
  days: number = 30
): Promise<HourlyData> {
  try {
    const id = await resolveCityId(city.slug);
    const resp = await fetch(
      `${BACKEND_URL}/api/history/${id}?days=${days}`
    );
    if (!resp.ok) throw new Error(`History API: ${resp.status}`);
    const rows = await resp.json();
    return adaptHistoryRows(rows);
  } catch (err) {
    console.warn(`Backend history/${city.slug} gagal:`, err);
    // ponytail: fallback ke Open-Meteo historical API
    return fetchHistoricalWeatherOpenMeteo(city, days);
  }
}

// fallback: Open-Meteo historical (ketika backend / Supabase belum ada data)
async function fetchHistoricalWeatherOpenMeteo(
  city: CityData,
  days: number = 30
): Promise<HourlyData> {
  const end = new Date();
  end.setDate(end.getDate() - 1);
  const start = new Date();
  start.setDate(start.getDate() - days);
  const fmt = (d: Date) => d.toISOString().split("T")[0];

  const url =
    `${HISTORICAL_BASE}?latitude=${city.lat}&longitude=${city.lon}` +
    `&start_date=${fmt(start)}&end_date=${fmt(end)}` +
    `&hourly=temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m,cloud_cover,surface_pressure` +
    `&timezone=auto`;

  const resp = await fetch(url, { next: { revalidate: 86400 } });
  if (!resp.ok) throw new Error(`Historical API error: ${resp.status}`);
  const data = await resp.json();

  return {
    time: data.hourly.time,
    temperature: data.hourly.temperature_2m,
    humidity: data.hourly.relative_humidity_2m,
    precipitation: data.hourly.precipitation,
    weatherCode: data.hourly.weather_code,
    windSpeed: data.hourly.wind_speed_10m,
    cloudCover: data.hourly.cloud_cover,
    pressure: data.hourly.surface_pressure,
  };
}

// ─── Forecast (tetap Open-Meteo — backend belum punya model multi-variabel) ─
// ponytail: keep Open-Meteo until humidity/precip Prophet models are trained
// and backend can serve full ForecastData shape.

export async function fetchCityForecast(
  city: CityData,
  forecastDays: number = 7
): Promise<ForecastData> {
  const url =
    `${FORECAST_BASE}?latitude=${city.lat}&longitude=${city.lon}` +
    `&hourly=temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m,cloud_cover,surface_pressure` +
    `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code,wind_speed_10m_max` +
    `&forecast_days=${forecastDays}` +
    `&timezone=auto`;

  const resp = await fetch(url, { next: { revalidate: 1800 } });
  if (!resp.ok) throw new Error(`Forecast API error: ${resp.status}`);
  const data = await resp.json();

  return {
    city,
    hourly: {
      time: data.hourly.time,
      temperature: data.hourly.temperature_2m,
      humidity: data.hourly.relative_humidity_2m,
      precipitation: data.hourly.precipitation,
      weatherCode: data.hourly.weather_code,
      windSpeed: data.hourly.wind_speed_10m,
      cloudCover: data.hourly.cloud_cover,
      pressure: data.hourly.surface_pressure,
    },
    daily: {
      time: data.daily.time,
      temperatureMax: data.daily.temperature_2m_max,
      temperatureMin: data.daily.temperature_2m_min,
      precipitationSum: data.daily.precipitation_sum,
      weatherCode: data.daily.weather_code,
      windSpeedMax: data.daily.wind_speed_10m_max,
    },
  };
}

// ─── Model Metrics (dari backend) ───────────────────────────────────────────

export async function fetchModelMetrics(): Promise<ModelMetric[]> {
  try {
    const resp = await fetch(`${BACKEND_URL}/api/model-metrics`);
    if (!resp.ok) throw new Error(`Metrics API: ${resp.status}`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any[] = await resp.json();
    return data.map((m) => ({
      city: m.city || "",
      province: m.province || "",
      target: m.kolom_target || "temperature_2m",
      nTrain: 8448,  // ponytail: training metadata, tidak disimpan di DB — default dari training run
      nTest: 336,
      mae: m.mae ?? 0,
      rmse: m.rmse ?? 0,
      mape: m.mape ?? null,
      maeBaseline: m.mae_baseline_naif ?? 0,
      rmseBaseline: m.rmse_baseline_naif ?? 0,
      betterThanBaseline: m.lebih_baik_dari_baseline ?? false,
      modelVersion: m.model_version || "v1",
      updatedAt: m.updated_at || "",
    }));
  } catch (err) {
    console.warn("Backend model-metrics gagal:", err);
    return []; // komponen fallback ke hardcoded MODEL_METRICS
  }
}

// ─── Analytics Summary ──────────────────────────────────────────────────────

export async function fetchAnalyticsSummary(): Promise<AnalyticsSummary | null> {
  try {
    const resp = await fetch(`${BACKEND_URL}/api/analytics/summary`);
    if (!resp.ok) throw new Error(`Analytics API: ${resp.status}`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const s: Record<string, any> = await resp.json();
    return {
      avgTemperature: s.avg_temperature ?? null,
      hottestCity: s.hottest_city
        ? { city: s.hottest_city.city, province: s.hottest_city.province, temperature: s.hottest_city.temperature }
        : null,
      coldestCity: s.coldest_city
        ? { city: s.coldest_city.city, province: s.coldest_city.province, temperature: s.coldest_city.temperature }
        : null,
      avgHumidity: s.avg_humidity ?? null,
      totalCitiesWithData: s.total_cities_with_data ?? 0,
    };
  } catch (err) {
    console.warn("Backend analytics/summary gagal:", err);
    return null;
  }
}

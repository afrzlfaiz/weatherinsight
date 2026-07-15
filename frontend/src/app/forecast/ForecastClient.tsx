"use client";

import { useState, useEffect } from "react";
import {
  TrendingUp,
  Thermometer,
  Droplets,
  Wind,
  Brain,
  AlertTriangle,
} from "lucide-react";
import { TemperatureChart, PrecipitationChart } from "@/components/weather/Charts";
import WeatherIcon from "@/components/weather/WeatherIcon";
import { CITIES, getWeatherInfo, getTempColor, type CityData } from "@/lib/constants";
import { getMetricsByCity } from "@/lib/model-metrics";
import type { ForecastData } from "@/lib/api";

export default function ForecastClient() {
  const [selectedCity, setSelectedCity] = useState<CityData>(
    CITIES.find((c) => c.slug === "jakarta")!
  );
  const [forecastDays, setForecastDays] = useState(7);
  const [data, setData] = useState<ForecastData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchForecast = async () => {
      setLoading(true);
      try {
        const url =
          `https://api.open-meteo.com/v1/forecast?latitude=${selectedCity.lat}&longitude=${selectedCity.lon}` +
          `&hourly=temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m,cloud_cover,surface_pressure` +
          `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code,wind_speed_10m_max` +
          `&forecast_days=${forecastDays}&timezone=auto`;

        const resp = await fetch(url);
        const json = await resp.json();

        setData({
          city: selectedCity,
          hourly: {
            time: json.hourly.time,
            temperature: json.hourly.temperature_2m,
            humidity: json.hourly.relative_humidity_2m,
            precipitation: json.hourly.precipitation,
            weatherCode: json.hourly.weather_code,
            windSpeed: json.hourly.wind_speed_10m,
            cloudCover: json.hourly.cloud_cover,
            pressure: json.hourly.surface_pressure,
          },
          daily: {
            time: json.daily.time,
            temperatureMax: json.daily.temperature_2m_max,
            temperatureMin: json.daily.temperature_2m_min,
            precipitationSum: json.daily.precipitation_sum,
            weatherCode: json.daily.weather_code,
            windSpeedMax: json.daily.wind_speed_10m_max,
          },
        });
      } catch {
        setData(null);
      } finally {
        setLoading(false);
      }
    };

    fetchForecast();
  }, [selectedCity, forecastDays]);

  const metrics = getMetricsByCity(selectedCity.city);

  // Prepare hourly labels
  const hourlyLabels = data?.hourly.time.map((t) => {
    const d = new Date(t);
    return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", hour: "2-digit" });
  }) || [];

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, #8b5cf6, #3b82f6)" }}
        >
          <TrendingUp size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Forecast Cuaca</h1>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Prediksi cuaca berbasis Open-Meteo + model AI Prophet
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex-wrap-row mb-8" style={{ alignItems: "flex-end" }}>
        <div>
          <label className="block text-xs font-semibold mb-2" style={{ color: "var(--text-muted)" }}>
            Pilih Kota
          </label>
          <select
            value={selectedCity.slug}
            onChange={(e) =>
              setSelectedCity(CITIES.find((c) => c.slug === e.target.value)!)
            }
            className="w-full sm:w-auto"
            style={{ minWidth: 200 }}
          >
            {CITIES.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.city} — {c.province}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold mb-2" style={{ color: "var(--text-muted)" }}>
            Durasi Forecast
          </label>
          <div className="tab-list">
            {[3, 7, 14].map((days) => (
              <button
                key={days}
                onClick={() => setForecastDays(days)}
                className={`tab-item ${forecastDays === days ? "active" : ""}`}
              >
                {days} Hari
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="skeleton h-[400px] rounded-2xl" />
          <div className="skeleton h-[400px] rounded-2xl" />
        </div>
      ) : data ? (
        <>
          {/* Model Info Banner */}
          {metrics && (
            <div
              className="glass-card-static p-4 mb-6 flex flex-col md:flex-row md:items-center gap-4"
              style={{
                borderLeft: `3px solid ${metrics.betterThanBaseline ? "var(--accent-emerald)" : "var(--accent-amber)"}`,
              }}
            >
              <Brain size={20} style={{ color: "var(--accent-violet)" }} />
              <div className="flex-1">
                <p className="text-sm font-semibold">
                  Model Prophet {metrics.modelVersion} — {selectedCity.city}
                </p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  MAE: {metrics.mae.toFixed(2)}°C · RMSE: {metrics.rmse.toFixed(2)}°C · MAPE: {metrics.mape?.toFixed(1)}%
                </p>
              </div>
              {metrics.betterThanBaseline ? (
                <span className="badge badge-success">✅ Lebih Baik dari Baseline</span>
              ) : (
                <span className="badge badge-warning">
                  <AlertTriangle size={10} /> Belum Mengungguli Baseline
                </span>
              )}
            </div>
          )}

          {/* Charts */}
          <div className="grid-2col mb-6">
            <div className="glass-card-static p-5 min-w-0">
              <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
                <Thermometer size={18} style={{ color: "var(--accent-blue)" }} />
                Prediksi Suhu — {selectedCity.city}
              </h2>
              <TemperatureChart
                labels={hourlyLabels}
                temperatures={data.hourly.temperature}
                height={300}
              />
            </div>

            <div className="glass-card-static p-5 min-w-0">
              <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
                <Droplets size={18} style={{ color: "var(--accent-cyan)" }} />
                Prediksi Curah Hujan
              </h2>
              <PrecipitationChart
                labels={hourlyLabels}
                values={data.hourly.precipitation}
                height={300}
              />
            </div>
          </div>

          {/* Daily Cards */}
          <div className="grid-auto" style={{ "--grid-min": "120px" } as React.CSSProperties}>
            {data.daily.time.map((day, i) => {
              const dayInfo = getWeatherInfo(data.daily.weatherCode[i]);
              const date = new Date(day);
              return (
                <div key={day} className="glass-card p-4 text-center">
                  <p className="text-xs font-semibold mb-2" style={{ color: "var(--text-muted)" }}>
                    {i === 0 ? "Hari Ini" : date.toLocaleDateString("id-ID", { weekday: "short" })}
                  </p>
                  <WeatherIcon iconName={dayInfo.icon} category={dayInfo.category} size={32} animate />
                  <p className="text-xs mt-2 mb-2" style={{ color: "var(--text-secondary)" }}>
                    {dayInfo.description}
                  </p>
                  <div className="flex items-center justify-center gap-1">
                    <span className="text-sm font-bold" style={{ color: getTempColor(data.daily.temperatureMax[i]) }}>
                      {Math.round(data.daily.temperatureMax[i])}°
                    </span>
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>/</span>
                    <span className="text-sm" style={{ color: "var(--accent-cyan)" }}>
                      {Math.round(data.daily.temperatureMin[i])}°
                    </span>
                  </div>
                  <p className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>
                    🌧 {data.daily.precipitationSum[i].toFixed(1)}mm
                  </p>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <div className="text-center py-20">
          <AlertTriangle size={48} className="mx-auto mb-4" style={{ color: "var(--accent-amber)" }} />
          <p className="text-lg font-semibold">Gagal memuat data forecast</p>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>Periksa koneksi internet</p>
        </div>
      )}
    </div>
  );
}

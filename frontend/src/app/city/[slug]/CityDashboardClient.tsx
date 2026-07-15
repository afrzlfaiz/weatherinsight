"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Thermometer,
  Droplets,
  Wind,
  Gauge,
  Cloud,
  Eye,
  ArrowLeft,
  Calendar,
  Clock,
  Navigation,
} from "lucide-react";
import WeatherIcon from "@/components/weather/WeatherIcon";
import { TemperatureChart, PrecipitationChart } from "@/components/weather/Charts";
import { getWeatherInfo, getTempColor, getWindDirection, type CityData } from "@/lib/constants";
import { getMetricsByCity } from "@/lib/model-metrics";
import type { CurrentWeather, ForecastData, HourlyData } from "@/lib/api";

interface CityDashboardClientProps {
  city: CityData;
  current: CurrentWeather | null;
  forecast: ForecastData | null;
  history: HourlyData | null;
}

export default function CityDashboardClient({
  city,
  current,
  forecast,
  history,
}: CityDashboardClientProps) {
  const [forecastTab, setForecastTab] = useState<"24h" | "3d" | "7d">("24h");
  const info = current ? getWeatherInfo(current.weatherCode) : null;
  const metrics = getMetricsByCity(city.city);

  // Prepare chart data based on tab
  const getChartData = () => {
    if (!forecast) return { labels: [], temps: [], precip: [] };

    let hours: number;
    switch (forecastTab) {
      case "24h": hours = 24; break;
      case "3d": hours = 72; break;
      case "7d": hours = 168; break;
    }

    const labels = forecast.hourly.time.slice(0, hours).map((t) => {
      const d = new Date(t);
      if (forecastTab === "24h") {
        return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
      }
      return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", hour: "2-digit" });
    });

    return {
      labels,
      temps: forecast.hourly.temperature.slice(0, hours),
      precip: forecast.hourly.precipitation.slice(0, hours),
    };
  };

  const chartData = getChartData();

  return (
    <div className="animate-fade-in">
      {/* Back button */}
      <Link
        href="/"
        className="inline-flex items-center gap-2 mb-6 text-sm font-medium hover:opacity-80 transition-opacity"
        style={{ color: "var(--text-secondary)" }}
      >
        <ArrowLeft size={16} />
        Kembali ke Peta
      </Link>

      {/* Hero Section */}
      <div className="glass-card-static p-6 md:p-8 mb-6 relative overflow-hidden">
        {/* Background gradient */}
        {current && (
          <div
            className="absolute inset-0 opacity-10"
            style={{
              background: `radial-gradient(ellipse at 80% 30%, ${getTempColor(current.temperature)} 0%, transparent 60%)`,
            }}
          />
        )}

        <div className="relative z-10 flex flex-col md:flex-row md:items-start md:justify-between gap-6">
          {/* Left: City info + temperature */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="badge badge-info">
                <Clock size={10} />
                Live Data
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight mb-1">
              {city.city}
            </h1>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              {city.province} · {city.lat.toFixed(2)}°, {city.lon.toFixed(2)}°
            </p>

            {current && info && (
              <div className="flex items-end gap-4 mt-4">
                <div className="flex items-center gap-3">
                  <WeatherIcon
                    iconName={info.icon}
                    category={info.category}
                    size={56}
                    animate
                  />
                  <div>
                    <span
                      className="text-6xl font-extrabold tracking-tight"
                      style={{ color: getTempColor(current.temperature) }}
                    >
                      {Math.round(current.temperature)}°
                    </span>
                  </div>
                </div>
                <div className="mb-2">
                  <p className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
                    {info.description}
                  </p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    Terasa seperti {Math.round(current.temperature)}°C
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Right: Quick stats */}
          {current && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full md:w-auto min-w-0">
              <div className="stat-card !p-3" style={{ minWidth: 0 }}>
                <div className="flex items-center gap-2 mb-1">
                  <Droplets size={14} style={{ color: "var(--accent-cyan)" }} />
                  <span className="text-[11px] font-medium" style={{ color: "var(--text-muted)" }}>
                    Kelembapan
                  </span>
                </div>
                <p className="text-xl font-bold" style={{ color: "var(--accent-cyan)" }}>
                  {current.humidity}%
                </p>
              </div>

              <div className="stat-card !p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Wind size={14} style={{ color: "var(--accent-teal)" }} />
                  <span className="text-[11px] font-medium" style={{ color: "var(--text-muted)" }}>
                    Angin
                  </span>
                </div>
                <p className="text-xl font-bold" style={{ color: "var(--accent-teal)" }}>
                  {current.windSpeed} <span className="text-xs font-normal">km/j</span>
                </p>
                <p className="text-[10px] flex items-center gap-1" style={{ color: "var(--text-muted)" }}>
                  <Navigation size={10} style={{ transform: `rotate(${current.windDirection}deg)` }} />
                  {getWindDirection(current.windDirection)} ({current.windDirection}°)
                </p>
              </div>

              <div className="stat-card !p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Gauge size={14} style={{ color: "var(--accent-violet)" }} />
                  <span className="text-[11px] font-medium" style={{ color: "var(--text-muted)" }}>
                    Tekanan
                  </span>
                </div>
                <p className="text-xl font-bold" style={{ color: "var(--accent-violet)" }}>
                  {Math.round(current.pressure)} <span className="text-xs font-normal">mb</span>
                </p>
              </div>

              <div className="stat-card !p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Cloud size={14} style={{ color: "var(--text-secondary)" }} />
                  <span className="text-[11px] font-medium" style={{ color: "var(--text-muted)" }}>
                    Tutupan Awan
                  </span>
                </div>
                <p className="text-xl font-bold">
                  {current.cloudCover}%
                </p>
              </div>

              <div className="stat-card !p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Thermometer size={14} style={{ color: "var(--accent-amber)" }} />
                  <span className="text-[11px] font-medium" style={{ color: "var(--text-muted)" }}>
                    Curah Hujan
                  </span>
                </div>
                <p className="text-xl font-bold" style={{ color: "var(--accent-amber)" }}>
                  {current.precipitation} <span className="text-xs font-normal">mm</span>
                </p>
              </div>

              <div className="stat-card !p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Eye size={14} style={{ color: "var(--accent-emerald)" }} />
                  <span className="text-[11px] font-medium" style={{ color: "var(--text-muted)" }}>
                    Visibilitas
                  </span>
                </div>
                <p className="text-xl font-bold" style={{ color: "var(--accent-emerald)" }}>
                  {current.visibility} <span className="text-xs font-normal">km</span>
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Forecast Charts */}
      {forecast && (
        <div className="grid-2col mb-6">
          <div className="glass-card-static p-5 min-w-0">
            <div className="flex-wrap-row justify-between mb-4">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Thermometer size={18} style={{ color: "var(--accent-blue)" }} />
                Forecast Suhu
              </h2>
              <div className="tab-list">
                {(["24h", "3d", "7d"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setForecastTab(tab)}
                    className={`tab-item ${forecastTab === tab ? "active" : ""}`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>
            <TemperatureChart
              labels={chartData.labels}
              temperatures={chartData.temps}
              height={280}
            />
          </div>

          <div className="glass-card-static p-5 min-w-0">
            <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
              <Droplets size={18} style={{ color: "var(--accent-cyan)" }} />
              Forecast Curah Hujan
            </h2>
            <PrecipitationChart
              labels={chartData.labels}
              values={chartData.precip}
              height={280}
            />
          </div>
        </div>
      )}

      {/* Daily Forecast Table */}
      {forecast && (
        <div className="glass-card-static p-5 mb-6">
          <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
            <Calendar size={18} style={{ color: "var(--accent-violet)" }} />
            Prediksi 7 Hari
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                  <th className="text-left py-3 px-3 text-xs font-semibold" style={{ color: "var(--text-muted)" }}>Hari</th>
                  <th className="text-left py-3 px-3 text-xs font-semibold" style={{ color: "var(--text-muted)" }}>Kondisi</th>
                  <th className="text-right py-3 px-3 text-xs font-semibold" style={{ color: "var(--text-muted)" }}>Maks</th>
                  <th className="text-right py-3 px-3 text-xs font-semibold" style={{ color: "var(--text-muted)" }}>Min</th>
                  <th className="text-right py-3 px-3 text-xs font-semibold" style={{ color: "var(--text-muted)" }}>Hujan</th>
                  <th className="text-right py-3 px-3 text-xs font-semibold" style={{ color: "var(--text-muted)" }}>Angin</th>
                </tr>
              </thead>
              <tbody>
                {forecast.daily.time.map((day, i) => {
                  const dayInfo = getWeatherInfo(forecast.daily.weatherCode[i]);
                  const date = new Date(day);
                  const isToday = i === 0;
                  return (
                    <tr
                      key={day}
                      className="transition-colors"
                      style={{
                        borderBottom: "1px solid var(--border-subtle)",
                        background: isToday ? "rgba(59, 130, 246, 0.05)" : undefined,
                      }}
                    >
                      <td className="py-3 px-3">
                        <div className="text-sm font-semibold">
                          {isToday ? "Hari Ini" : date.toLocaleDateString("id-ID", { weekday: "long" })}
                        </div>
                        <div className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                          {date.toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <WeatherIcon iconName={dayInfo.icon} category={dayInfo.category} size={20} />
                          <span className="text-sm">{dayInfo.description}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <span className="text-sm font-bold" style={{ color: getTempColor(forecast.daily.temperatureMax[i]) }}>
                          {Math.round(forecast.daily.temperatureMax[i])}°
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <span className="text-sm font-medium" style={{ color: "var(--accent-cyan)" }}>
                          {Math.round(forecast.daily.temperatureMin[i])}°
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
                          {forecast.daily.precipitationSum[i].toFixed(1)} mm
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
                          {Math.round(forecast.daily.windSpeedMax[i])} km/j
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Data Historis (7 hari terakhir, dari backend Supabase) */}
      {history && history.time.length > 0 && (
        <div className="glass-card-static p-5 mb-6">
          <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
            <Calendar size={18} style={{ color: "var(--accent-blue)" }} />
            Data Historis — 7 Hari Terakhir
          </h2>
          <TemperatureChart
            labels={history.time.map((t) => {
              const d = new Date(t);
              return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", hour: "2-digit" });
            })}
            temperatures={history.temperature}
            height={280}
          />
        </div>
      )}

      {/* Model Metrics */}
      {metrics && (
        <div className="glass-card-static p-5">
          <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
            <Gauge size={18} style={{ color: "var(--accent-emerald)" }} />
            Model AI (Prophet {metrics.modelVersion})
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <p className="text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>MAE</p>
              <p className="text-2xl font-bold" style={{ color: "var(--accent-blue)" }}>
                {metrics.mae.toFixed(2)}°
              </p>
              <p className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                vs baseline {metrics.maeBaseline.toFixed(2)}°
              </p>
            </div>
            <div>
              <p className="text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>RMSE</p>
              <p className="text-2xl font-bold" style={{ color: "var(--accent-violet)" }}>
                {metrics.rmse.toFixed(2)}°
              </p>
            </div>
            <div>
              <p className="text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>MAPE</p>
              <p className="text-2xl font-bold" style={{ color: "var(--accent-amber)" }}>
                {metrics.mape?.toFixed(1)}%
              </p>
            </div>
            <div>
              <p className="text-xs font-medium mb-1" style={{ color: "var(--text-muted)" }}>vs Baseline</p>
              {metrics.betterThanBaseline ? (
                <span className="badge badge-success text-sm">✅ Lebih Baik</span>
              ) : (
                <span className="badge badge-warning text-sm">⚠️ Kalah</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

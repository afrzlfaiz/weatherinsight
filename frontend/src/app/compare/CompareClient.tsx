"use client";

import { useState, useEffect } from "react";
import {
  GitCompareArrows,
  Plus,
  X,
  Thermometer,
  Droplets,
  Wind,
  Cloud,
} from "lucide-react";
import { ComparisonChart, PrecipitationChart } from "@/components/weather/Charts";
import WeatherIcon from "@/components/weather/WeatherIcon";
import { CITIES, getWeatherInfo, getTempColor, type CityData } from "@/lib/constants";
import type { ForecastData } from "@/lib/api";

const COLORS = ["#3b82f6", "#f43f5e", "#10b981", "#f59e0b", "#8b5cf6"];

interface CityForecastState {
  city: CityData;
  data: ForecastData | null;
  loading: boolean;
}

export default function CompareClient() {
  const [selectedSlugs, setSelectedSlugs] = useState<string[]>(["jakarta", "surabaya"]);
  const [citiesData, setCitiesData] = useState<CityForecastState[]>([]);

  const addCity = (slug: string) => {
    if (selectedSlugs.length >= 5 || selectedSlugs.includes(slug)) return;
    setSelectedSlugs([...selectedSlugs, slug]);
  };

  const removeCity = (slug: string) => {
    if (selectedSlugs.length <= 1) return;
    setSelectedSlugs(selectedSlugs.filter((s) => s !== slug));
  };

  useEffect(() => {
    const fetchAll = async () => {
      const results: CityForecastState[] = [];

      for (const slug of selectedSlugs) {
        const city = CITIES.find((c) => c.slug === slug)!;
        results.push({ city, data: null, loading: true });
      }
      setCitiesData([...results]);

      for (let i = 0; i < selectedSlugs.length; i++) {
        const city = CITIES.find((c) => c.slug === selectedSlugs[i])!;
        try {
          const url =
            `https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}` +
            `&hourly=temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m,cloud_cover,surface_pressure` +
            `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code,wind_speed_10m_max` +
            `&forecast_days=7&timezone=auto`;

          const resp = await fetch(url);
          const json = await resp.json();

          results[i] = {
            city,
            data: {
              city,
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
            },
            loading: false,
          };
        } catch {
          results[i] = { ...results[i], loading: false };
        }
        setCitiesData([...results]);
      }
    };

    fetchAll();
  }, [selectedSlugs]);

  // Prepare comparison chart data
  const allLoaded = citiesData.every((c) => !c.loading && c.data);
  const labels =
    allLoaded && citiesData[0]?.data
      ? citiesData[0].data.daily.time.map((t) =>
          new Date(t).toLocaleDateString("id-ID", { weekday: "short", day: "numeric" })
        )
      : [];

  const tempDatasets = citiesData
    .filter((c) => c.data)
    .map((c, i) => ({
      label: c.city.city,
      data: c.data!.daily.temperatureMax,
      color: COLORS[i % COLORS.length],
    }));

  const precipDatasets = citiesData
    .filter((c) => c.data)
    .map((c, i) => ({
      label: c.city.city,
      data: c.data!.daily.precipitationSum,
      color: COLORS[i % COLORS.length],
    }));

  const availableCities = CITIES.filter((c) => !selectedSlugs.includes(c.slug));

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: "linear-gradient(135deg, #f43f5e, #f59e0b)" }}
        >
          <GitCompareArrows size={20} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Bandingkan Kota</h1>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Perbandingan cuaca side-by-side hingga 5 kota
          </p>
        </div>
      </div>

      {/* City Selection */}
      <div className="glass-card-static p-5 mb-6">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          {selectedSlugs.map((slug, i) => {
            const city = CITIES.find((c) => c.slug === slug)!;
            return (
              <div
                key={slug}
                className="flex items-center gap-2 px-3 py-2 rounded-xl"
                style={{
                  background: `${COLORS[i]}15`,
                  border: `1px solid ${COLORS[i]}40`,
                }}
              >
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ background: COLORS[i] }}
                />
                <span className="text-sm font-semibold">{city.city}</span>
                {selectedSlugs.length > 1 && (
                  <button onClick={() => removeCity(slug)} className="hover:opacity-70">
                    <X size={14} style={{ color: "var(--text-muted)" }} />
                  </button>
                )}
              </div>
            );
          })}

          {selectedSlugs.length < 5 && (
            <select
              onChange={(e) => {
                if (e.target.value) {
                  addCity(e.target.value);
                  e.target.value = "";
                }
              }}
              defaultValue=""
              className="w-full sm:w-auto"
              style={{ minWidth: 180 }}
            >
              <option value="" disabled>
                + Tambah kota...
              </option>
              {availableCities.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.city}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Side-by-side current weather cards */}
      <div className="grid-cards mb-6">
        {citiesData.map((cd, i) => {
          if (cd.loading) return <div key={i} className="skeleton h-[200px] rounded-2xl" />;
          if (!cd.data) return null;

          const todayCode = cd.data.daily.weatherCode[0];
          const info = getWeatherInfo(todayCode);
          const maxT = cd.data.daily.temperatureMax[0];
          const minT = cd.data.daily.temperatureMin[0];

          return (
            <div
              key={cd.city.slug}
              className="glass-card-static p-5 relative overflow-hidden"
              style={{ borderTop: `3px solid ${COLORS[i]}` }}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-lg font-bold">{cd.city.city}</h3>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {cd.city.province}
                  </p>
                </div>
                <WeatherIcon iconName={info.icon} category={info.category} size={36} animate />
              </div>

              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-4xl font-extrabold" style={{ color: getTempColor(maxT) }}>
                  {Math.round(maxT)}°
                </span>
                <span className="text-lg" style={{ color: "var(--accent-cyan)" }}>
                  / {Math.round(minT)}°
                </span>
              </div>

              <p className="text-sm mb-3" style={{ color: "var(--text-secondary)" }}>
                {info.description}
              </p>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-1">
                  <Droplets size={12} style={{ color: "var(--accent-cyan)" }} />
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                    Hujan: {cd.data.daily.precipitationSum[0].toFixed(1)}mm
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Wind size={12} style={{ color: "var(--accent-teal)" }} />
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                    Angin: {Math.round(cd.data.daily.windSpeedMax[0])}km/j
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Comparison Charts */}
      {allLoaded && (
        <div className="grid-2col">
          <div className="glass-card-static p-5 min-w-0">
            <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
              <Thermometer size={18} style={{ color: "var(--accent-blue)" }} />
              Perbandingan Suhu Maksimum (7 Hari)
            </h2>
            <ComparisonChart
              labels={labels}
              datasets={tempDatasets}
              height={350}
            />
          </div>

          <div className="glass-card-static p-5 min-w-0">
            <h2 className="text-lg font-bold flex items-center gap-2 mb-4">
              <Droplets size={18} style={{ color: "var(--accent-cyan)" }} />
              Perbandingan Curah Hujan (7 Hari)
            </h2>
            <ComparisonChart
              labels={labels}
              datasets={precipDatasets}
              height={350}
              yLabel=" mm"
            />
          </div>
        </div>
      )}
    </div>
  );
}

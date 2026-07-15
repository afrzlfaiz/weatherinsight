"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import {
  Thermometer,
  Droplets,
  TrendingUp,
  TrendingDown,
  MapPin,
  Search,
  Cloud,
  CloudRain,
  Sun,
  Zap,
} from "lucide-react";
import WeatherCard from "@/components/weather/WeatherCard";
import { getWeatherInfo } from "@/lib/constants";
import type { CurrentWeather } from "@/lib/api";

// Dynamic import for map (SSR issues with Leaflet)
const IndonesiaMap = dynamic(() => import("@/components/weather/IndonesiaMap"), {
  ssr: false,
  loading: () => <div className="skeleton w-full h-[500px] rounded-2xl" />,
});

interface HomeClientProps {
  initialData: CurrentWeather[];
}

export default function HomeClient({ initialData }: HomeClientProps) {
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"grid" | "map">("map");

  const filteredData = useMemo(() => {
    if (!search) return initialData;
    const q = search.toLowerCase();
    return initialData.filter(
      (d) =>
        d.city.toLowerCase().includes(q) ||
        d.province.toLowerCase().includes(q)
    );
  }, [initialData, search]);

  // Compute national stats
  const stats = useMemo(() => {
    if (initialData.length === 0) return null;
    const temps = initialData.map((d) => d.temperature);
    const avgTemp = temps.reduce((a, b) => a + b, 0) / temps.length;
    const hottest = initialData.reduce((a, b) =>
      a.temperature > b.temperature ? a : b
    );
    const coldest = initialData.reduce((a, b) =>
      a.temperature < b.temperature ? a : b
    );

    // Weather condition summary
    const conditions = initialData.reduce(
      (acc, d) => {
        const info = getWeatherInfo(d.weatherCode);
        acc[info.category] = (acc[info.category] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    return { avgTemp, hottest, coldest, conditions };
  }, [initialData]);

  return (
    <div className="animate-fade-in">
      {/* Hero Section */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "var(--gradient-accent)" }}
          >
            <MapPin size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Cuaca Indonesia
            </h1>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              Monitoring real-time 38 ibu kota provinsi
            </p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 stagger-children">
          <div className="stat-card">
            <div className="flex items-center gap-2 mb-2">
              <Thermometer size={16} style={{ color: "var(--accent-amber)" }} />
              <span className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
                Suhu Rata-rata
              </span>
            </div>
            <p className="text-2xl font-extrabold" style={{ color: "var(--accent-amber)" }}>
              {stats.avgTemp.toFixed(1)}°C
            </p>
            <p className="text-[11px] mt-1" style={{ color: "var(--text-muted)" }}>
              38 kota · Nasional
            </p>
          </div>

          <div className="stat-card">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={16} style={{ color: "var(--accent-rose)" }} />
              <span className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
                Terpanas
              </span>
            </div>
            <p className="text-2xl font-extrabold" style={{ color: "var(--accent-rose)" }}>
              {Math.round(stats.hottest.temperature)}°C
            </p>
            <p className="text-[11px] mt-1" style={{ color: "var(--text-muted)" }}>
              {stats.hottest.city}
            </p>
          </div>

          <div className="stat-card">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown size={16} style={{ color: "var(--accent-cyan)" }} />
              <span className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
                Terdingin
              </span>
            </div>
            <p className="text-2xl font-extrabold" style={{ color: "var(--accent-cyan)" }}>
              {Math.round(stats.coldest.temperature)}°C
            </p>
            <p className="text-[11px] mt-1" style={{ color: "var(--text-muted)" }}>
              {stats.coldest.city}
            </p>
          </div>

          <div className="stat-card">
            <div className="flex items-center gap-2 mb-2">
              <Cloud size={16} style={{ color: "var(--accent-violet)" }} />
              <span className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
                Kondisi Cuaca
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {stats.conditions.clear && (
                <span className="badge badge-success">
                  <Sun size={10} /> {stats.conditions.clear} Cerah
                </span>
              )}
              {stats.conditions.rain && (
                <span className="badge badge-info">
                  <CloudRain size={10} /> {stats.conditions.rain} Hujan
                </span>
              )}
              {stats.conditions.cloudy && (
                <span className="badge badge-warning">
                  <Cloud size={10} /> {stats.conditions.cloudy} Berawan
                </span>
              )}
              {stats.conditions.thunderstorm && (
                <span className="badge badge-warning">
                  <Zap size={10} /> {stats.conditions.thunderstorm} Badai
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* View Toggle & Search */}
      <div className="flex-wrap-row mb-6">
        <div className="tab-list">
          <button
            onClick={() => setView("map")}
            className={`tab-item ${view === "map" ? "active" : ""}`}
          >
            <MapPin size={14} className="inline mr-1" />
            Peta
          </button>
          <button
            onClick={() => setView("grid")}
            className={`tab-item ${view === "grid" ? "active" : ""}`}
          >
            <Cloud size={14} className="inline mr-1" />
            Grid
          </button>
        </div>

        <div className="relative flex-1 min-w-[200px]">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: "var(--text-muted)" }}
          />
          <input
            type="text"
            placeholder="Cari kota atau provinsi..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm"
            style={{
              background: "var(--bg-card)",
              border: "1px solid var(--border-medium)",
              color: "var(--text-primary)",
              outline: "none",
            }}
          />
        </div>

        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          {filteredData.length} kota
        </p>
      </div>

      {/* Map View */}
      {view === "map" && (
        <div className="mb-8">
          <IndonesiaMap weatherData={initialData} height="500px" />
        </div>
      )}

      {/* City Grid */}
      <div className="grid-cards stagger-children">
        {filteredData.map((data, i) => (
          <WeatherCard key={data.slug} data={data} index={i} />
        ))}
      </div>

      {filteredData.length === 0 && (
        <div className="text-center py-20">
          <Cloud size={48} className="mx-auto mb-4" style={{ color: "var(--text-muted)" }} />
          <p className="text-lg font-semibold" style={{ color: "var(--text-secondary)" }}>
            Tidak ada kota ditemukan
          </p>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Coba kata kunci lain
          </p>
        </div>
      )}
    </div>
  );
}

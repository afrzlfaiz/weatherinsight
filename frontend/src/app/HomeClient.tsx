"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import {
  Thermometer,
  TrendingUp,
  TrendingDown,
  MapPin,
  Search,
  Cloud,
  CloudRain,
  Sun,
  Zap,
  Radio,
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
      {/* Page header */}
      <header className="flex flex-col md:flex-row md:items-end md:justify-between gap-5 mb-8">
        <div>
          <span className="page-eyebrow">
            <Radio size={13} /> Pantauan nasional
          </span>
          <div className="flex items-center gap-3">
            <div
              className="w-11 h-11 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200/60"
              style={{ background: "var(--gradient-accent)" }}
            >
              <MapPin size={21} className="text-white" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
                Cuaca Indonesia
              </h1>
            </div>
          </div>
          <p className="text-sm mt-3 max-w-xl leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            Kondisi terkini dan prakiraan cuaca ibu kota provinsi di seluruh Indonesia.
          </p>
        </div>
        <div className="inline-flex items-center gap-2 self-start md:self-auto px-3.5 py-2 rounded-full bg-white border shadow-sm" style={{ borderColor: "var(--border-subtle)" }}>
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>Data diperbarui berkala</span>
        </div>
      </header>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-8 stagger-children">
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
      <div className="page-toolbar mb-6">
        <div className="tab-list">
          <button
            onClick={() => setView("map")}
            className={`tab-item ${view === "map" ? "active" : ""}`}
            aria-pressed={view === "map"}
          >
            <MapPin size={14} className="inline mr-1" />
            Peta
          </button>
          <button
            onClick={() => setView("grid")}
            className={`tab-item ${view === "grid" ? "active" : ""}`}
            aria-pressed={view === "grid"}
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
            aria-label="Cari kota atau provinsi"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-field"
          />
        </div>

        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          {filteredData.length} kota
        </p>
      </div>

      {/* Map View */}
      {view === "map" && filteredData.length > 0 && (
        <div className="mb-8">
          <IndonesiaMap weatherData={filteredData} height="clamp(380px, 52vw, 540px)" />
        </div>
      )}

      {/* City Grid */}
      {view === "grid" && (
        <div className="grid-cards stagger-children">
          {filteredData.map((data, i) => (
            <WeatherCard key={data.slug} data={data} index={i} />
          ))}
        </div>
      )}

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

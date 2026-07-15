"use client";

import Link from "next/link";
import { Droplets, Wind, Eye, ArrowUpRight } from "lucide-react";
import WeatherIcon from "./WeatherIcon";
import { getWeatherInfo, getTempColor } from "@/lib/constants";
import type { CurrentWeather } from "@/lib/api";

interface WeatherCardProps {
  data: CurrentWeather;
  index?: number;
}

export default function WeatherCard({ data, index = 0 }: WeatherCardProps) {
  const info = getWeatherInfo(data.weatherCode);
  const tempColor = getTempColor(data.temperature);

  return (
    <Link
      href={`/city/${data.slug}`}
      className="glass-card group block p-4 relative overflow-hidden"
      style={{ animationDelay: `${index * 0.03}s` }}
    >
      {/* Hover glow effect */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          background: `radial-gradient(circle at 80% 20%, ${tempColor}10 0%, transparent 60%)`,
        }}
      />

      {/* Header */}
      <div className="flex items-start justify-between relative z-10">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>
            {data.city}
          </h3>
          <p className="text-[11px] mt-0.5 truncate" style={{ color: "var(--text-muted)" }}>
            {data.province}
          </p>
        </div>
        <WeatherIcon
          iconName={info.icon}
          category={info.category}
          size={28}
          animate
        />
      </div>

      {/* Temperature */}
      <div className="mt-3 relative z-10">
        <span
          className="text-3xl font-extrabold tracking-tight"
          style={{ color: tempColor }}
        >
          {Math.round(data.temperature)}°
        </span>
        <span className="text-sm ml-1 font-medium" style={{ color: "var(--text-muted)" }}>C</span>
      </div>

      {/* Condition */}
      <p className="text-xs mt-1 font-medium relative z-10" style={{ color: "var(--text-secondary)" }}>
        {info.description}
      </p>

      {/* Stats row */}
      <div className="flex items-center gap-3 mt-3 relative z-10">
        <div className="flex items-center gap-1">
          <Droplets size={12} style={{ color: "var(--accent-cyan)" }} />
          <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
            {data.humidity}%
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Wind size={12} style={{ color: "var(--accent-teal)" }} />
          <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
            {data.windSpeed} km/j
          </span>
        </div>
        {data.visibility > 0 && (
          <div className="flex items-center gap-1">
            <Eye size={12} style={{ color: "var(--accent-violet)" }} />
            <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
              {data.visibility} km
            </span>
          </div>
        )}
      </div>

      {/* Arrow hint */}
      <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-300 transform group-hover:translate-x-0 -translate-x-1">
        <ArrowUpRight size={14} style={{ color: "var(--accent-blue)" }} />
      </div>
    </Link>
  );
}

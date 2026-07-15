"use client";

import {
  Sun,
  CloudSun,
  Cloud,
  CloudFog,
  CloudDrizzle,
  CloudRain,
  CloudRainWind,
  Snowflake,
  CloudLightning,
} from "lucide-react";

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  sun: Sun,
  "cloud-sun": CloudSun,
  cloud: Cloud,
  "cloud-fog": CloudFog,
  "cloud-drizzle": CloudDrizzle,
  "cloud-rain": CloudRain,
  "cloud-rain-wind": CloudRainWind,
  snowflake: Snowflake,
  "cloud-lightning": CloudLightning,
};

const CATEGORY_COLORS: Record<string, string> = {
  clear: "#fbbf24",
  cloudy: "#94a3b8",
  fog: "#cbd5e1",
  drizzle: "#67e8f9",
  rain: "#3b82f6",
  snow: "#e2e8f0",
  thunderstorm: "#a78bfa",
};

interface WeatherIconProps {
  iconName: string;
  category: string;
  size?: number;
  className?: string;
  animate?: boolean;
}

export default function WeatherIcon({
  iconName,
  category,
  size = 24,
  className = "",
  animate = false,
}: WeatherIconProps) {
  const Icon = ICON_MAP[iconName] || Cloud;
  const color = CATEGORY_COLORS[category] || "#94a3b8";

  return (
    <div
      className={`inline-flex items-center justify-center ${animate ? "animate-float" : ""} ${className}`}
      style={{ color }}
    >
      <Icon size={size} />
    </div>
  );
}

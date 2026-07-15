"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import Link from "next/link";
import { getWeatherInfo, getTempColor } from "@/lib/constants";
import type { CurrentWeather } from "@/lib/api";

// Fix Leaflet default marker icon issue with Next.js
function createTempIcon(temp: number, weatherCode: number): L.DivIcon {
  const color = getTempColor(temp);
  const info = getWeatherInfo(weatherCode);
  
  return L.divIcon({
    className: "custom-marker",
    html: `
      <div style="
        background: ${color};
        color: white;
        border-radius: 14px;
        padding: 4px 10px;
        font-size: 12px;
        font-weight: 700;
        font-family: Inter, sans-serif;
        box-shadow: 0 2px 8px ${color}80;
        white-space: nowrap;
        line-height: 1.2;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 2px solid rgba(255,255,255,0.3);
        transform: translate(-50%, -50%);
        min-width: 36px;
      ">
        ${Math.round(temp)}°
      </div>
    `,
    iconSize: [0, 0],
    iconAnchor: [0, 0],
  });
}

function MapBounds({ data }: { data: CurrentWeather[] }) {
  const map = useMap();
  useEffect(() => {
    if (data.length > 0) {
      const bounds = L.latLngBounds(data.map((d) => [d.lat, d.lon]));
      map.fitBounds(bounds, { padding: [30, 30] });
    }
  }, [data, map]);
  return null;
}

interface IndonesiaMapProps {
  weatherData: CurrentWeather[];
  height?: string;
}

export default function IndonesiaMap({
  weatherData,
  height = "500px",
}: IndonesiaMapProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div
        className="skeleton w-full rounded-2xl"
        style={{ height }}
      />
    );
  }

  return (
    <div className="glass-card-static overflow-hidden w-full max-w-full" style={{ height }}>
      <MapContainer
        center={[-2.5, 118]}
        zoom={5}
        minZoom={5}
        maxBounds={[
          [-12, 93], // SW: south of Rote, west of Sabang
          [8, 143],  // NE: north of Sabang, east of Merauke
        ]}
        maxBoundsViscosity={0.6}
        style={{ height: "100%", width: "100%" }}
        zoomControl={false}
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>'
        />
        <MapBounds data={weatherData} />

        {weatherData.map((w) => {
          const info = getWeatherInfo(w.weatherCode);
          return (
            <Marker
              key={w.slug}
              position={[w.lat, w.lon]}
              icon={createTempIcon(w.temperature, w.weatherCode)}
            >
              <Popup>
                <div style={{ minWidth: 180 }}>
                  <div style={{ marginBottom: 8 }}>
                    <strong style={{ fontSize: 14, display: "block" }}>{w.city}</strong>
                    <span style={{ fontSize: 12, color: "#94a3b8" }}>{w.province}</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 4 }}>
                    <span style={{ fontSize: 28, fontWeight: 800, color: getTempColor(w.temperature) }}>
                      {Math.round(w.temperature)}°C
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 8 }}>
                    {info.description} · Kelembapan {w.humidity}%
                  </div>
                  <Link
                    href={`/city/${w.slug}`}
                    style={{
                      fontSize: 12,
                      color: "#3b82f6",
                      fontWeight: 600,
                      textDecoration: "none",
                    }}
                  >
                    Lihat Detail →
                  </Link>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}

import { CITIES } from "@/lib/constants";
import { fetchAllCurrentWeather, fetchCityForecast, fetchHistoricalWeather } from "@/lib/api";
import { loadModelMetrics } from "@/lib/model-metrics";
import CityDashboardClient from "./CityDashboardClient";
import { notFound } from "next/navigation";

export function generateStaticParams() {
  return CITIES.map((city) => ({ slug: city.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const city = CITIES.find((c) => c.slug === slug);
  if (!city) return { title: "Kota Tidak Ditemukan" };

  return {
    title: `Cuaca ${city.city} — WeatherInsight Indonesia`,
    description: `Cuaca terkini, forecast, dan data historis untuk ${city.city}, ${city.province}. Dashboard cuaca real-time.`,
  };
}

export default async function CityPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const city = CITIES.find((c) => c.slug === slug);
  if (!city) notFound();

  let currentData = null;
  let forecastData = null;
  let historyData = null;

  // parallel fetch: current weather (backend) + forecast (Open-Meteo) + history (backend)
  const [allWeather, forecast, history] = await Promise.allSettled([
    fetchAllCurrentWeather(),
    fetchCityForecast(city, 7),
    fetchHistoricalWeather(city, 7),
  ]);

  if (allWeather.status === "fulfilled") {
    currentData = allWeather.value.find((w) => w.slug === slug) || null;
  }
  if (forecast.status === "fulfilled") {
    forecastData = forecast.value;
  }
  if (history.status === "fulfilled") {
    historyData = history.value;
  }

  // preload model metrics dari backend (non-blocking)
  loadModelMetrics().catch(() => {});

  return (
    <CityDashboardClient
      city={city}
      current={currentData}
      forecast={forecastData}
      history={historyData}
    />
  );
}

import AnalyticsClient from "./AnalyticsClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Analytics Cuaca — WeatherInsight Indonesia",
  description:
    "Analisis tren cuaca, distribusi suhu, evaluasi model Prophet vs baseline, " +
    "dan statistik 38 kota Indonesia.",
};

export default function AnalyticsPage() {
  return <AnalyticsClient />;
}

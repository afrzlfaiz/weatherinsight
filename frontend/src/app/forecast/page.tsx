import ForecastClient from "./ForecastClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Forecast Cuaca AI — WeatherInsight Indonesia",
  description:
    "Prediksi cuaca berbasis AI (Prophet) untuk 38 kota Indonesia. " +
    "Lihat forecast suhu, hujan, dan kelembapan.",
};

export default function ForecastPage() {
  return <ForecastClient />;
}

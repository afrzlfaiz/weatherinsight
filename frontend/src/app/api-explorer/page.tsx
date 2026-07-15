import ApiExplorerClient from "./ApiExplorerClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "API Explorer — WeatherInsight Indonesia",
  description:
    "Dokumentasi REST API WeatherInsight Indonesia. Endpoint untuk cuaca real-time, " +
    "forecast, dan data historis 38 kota.",
};

export default function ApiExplorerPage() {
  return <ApiExplorerClient />;
}

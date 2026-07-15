import CompareClient from "./CompareClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Bandingkan Kota — WeatherInsight Indonesia",
  description:
    "Bandingkan cuaca antar kota Indonesia. Perbandingan suhu, kelembapan, " +
    "dan curah hujan side-by-side untuk 38 ibu kota provinsi.",
};

export default function ComparePage() {
  return <CompareClient />;
}

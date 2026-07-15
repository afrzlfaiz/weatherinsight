import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/layout/Sidebar";

export const metadata: Metadata = {
  title: "WeatherInsight Indonesia — Analisis & Prediksi Cuaca 38 Kota",
  description:
    "Platform analitik cuaca Indonesia. Monitoring real-time, prediksi AI (Prophet), " +
    "dan analisis historis untuk 38 ibu kota provinsi. Open-Meteo powered.",
  keywords: [
    "cuaca indonesia",
    "weather indonesia",
    "prediksi cuaca",
    "forecast",
    "data cuaca",
    "analitik cuaca",
  ],
  authors: [{ name: "WeatherInsight Indonesia" }],
  openGraph: {
    title: "WeatherInsight Indonesia",
    description: "Platform analisis & prediksi cuaca 38 kota Indonesia",
    type: "website",
    locale: "id_ID",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
          crossOrigin=""
        />
      </head>
      <body className="antialiased" suppressHydrationWarning>
        <Sidebar />
        <main className="main-content">
          <div className="content-container">
            {children}
          </div>
        </main>
      </body>
    </html>
  );
}

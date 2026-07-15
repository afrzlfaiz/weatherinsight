// ============================================================================
// WeatherInsight Indonesia — Static Constants
// 38 ibu kota provinsi Indonesia beserta koordinat & metadata
// ============================================================================

export interface CityData {
  province: string;
  city: string;
  lat: number;
  lon: number;
  slug: string;
}

export const CITIES: CityData[] = [
  { province: "Aceh", city: "Banda Aceh", lat: 5.54167, lon: 95.33333, slug: "banda-aceh" },
  { province: "Sumatera Utara", city: "Medan", lat: 3.58333, lon: 98.66667, slug: "medan" },
  { province: "Sumatera Barat", city: "Padang", lat: -0.94924, lon: 100.35427, slug: "padang" },
  { province: "Riau", city: "Pekanbaru", lat: 0.51667, lon: 101.44167, slug: "pekanbaru" },
  { province: "Jambi", city: "Jambi", lat: -1.60000, lon: 103.62000, slug: "jambi" },
  { province: "Sumatera Selatan", city: "Palembang", lat: -2.91673, lon: 104.74580, slug: "palembang" },
  { province: "Bengkulu", city: "Bengkulu", lat: -3.80044, lon: 102.26554, slug: "bengkulu" },
  { province: "Lampung", city: "Bandar Lampung", lat: -5.42917, lon: 105.26111, slug: "bandar-lampung" },
  { province: "Kepulauan Bangka Belitung", city: "Pangkal Pinang", lat: -2.13330, lon: 106.11250, slug: "pangkal-pinang" },
  { province: "Kepulauan Riau", city: "Tanjung Pinang", lat: 0.91667, lon: 104.45833, slug: "tanjung-pinang" },
  { province: "DKI Jakarta", city: "Jakarta", lat: -6.21462, lon: 106.84513, slug: "jakarta" },
  { province: "Jawa Barat", city: "Bandung", lat: -6.92222, lon: 107.60694, slug: "bandung" },
  { province: "Jawa Tengah", city: "Semarang", lat: -6.99306, lon: 110.42083, slug: "semarang" },
  { province: "DI Yogyakarta", city: "Yogyakarta", lat: -7.80139, lon: 110.36472, slug: "yogyakarta" },
  { province: "Jawa Timur", city: "Surabaya", lat: -7.24917, lon: 112.75083, slug: "surabaya" },
  { province: "Banten", city: "Serang", lat: -6.11528, lon: 106.15417, slug: "serang" },
  { province: "Bali", city: "Denpasar", lat: -8.65000, lon: 115.21667, slug: "denpasar" },
  { province: "Nusa Tenggara Barat", city: "Mataram", lat: -8.58333, lon: 116.11667, slug: "mataram" },
  { province: "Nusa Tenggara Timur", city: "Kupang", lat: -10.17083, lon: 123.60694, slug: "kupang" },
  { province: "Kalimantan Barat", city: "Pontianak", lat: -0.03194, lon: 109.32500, slug: "pontianak" },
  { province: "Kalimantan Tengah", city: "Palangka Raya", lat: -2.21000, lon: 113.92000, slug: "palangka-raya" },
  { province: "Kalimantan Selatan", city: "Banjarbaru", lat: -3.44060, lon: 114.83650, slug: "banjarbaru" },
  { province: "Kalimantan Timur", city: "Samarinda", lat: -0.49167, lon: 117.14583, slug: "samarinda" },
  { province: "Kalimantan Utara", city: "Tanjung Selor", lat: 2.83750, lon: 117.36528, slug: "tanjung-selor" },
  { province: "Sulawesi Utara", city: "Manado", lat: 1.48218, lon: 124.84892, slug: "manado" },
  { province: "Sulawesi Tengah", city: "Palu", lat: -0.90833, lon: 119.87083, slug: "palu" },
  { province: "Sulawesi Selatan", city: "Makassar", lat: -5.14861, lon: 119.43194, slug: "makassar" },
  { province: "Sulawesi Tenggara", city: "Kendari", lat: -3.97780, lon: 122.51507, slug: "kendari" },
  { province: "Gorontalo", city: "Gorontalo", lat: 0.53750, lon: 123.06250, slug: "gorontalo" },
  { province: "Sulawesi Barat", city: "Mamuju", lat: -2.68056, lon: 118.88611, slug: "mamuju" },
  { province: "Maluku", city: "Ambon", lat: -3.69583, lon: 128.18333, slug: "ambon" },
  { province: "Maluku Utara", city: "Sofifi", lat: 0.73729, lon: 127.55880, slug: "sofifi" },
  { province: "Papua Barat", city: "Manokwari", lat: -0.86291, lon: 134.06403, slug: "manokwari" },
  { province: "Papua Barat Daya", city: "Sorong", lat: -0.87956, lon: 131.26105, slug: "sorong" },
  { province: "Papua", city: "Jayapura", lat: -2.53371, lon: 140.71812, slug: "jayapura" },
  { province: "Papua Selatan", city: "Merauke", lat: -8.49958, lon: 140.40613, slug: "merauke" },
  { province: "Papua Tengah", city: "Nabire", lat: -3.35989, lon: 135.50073, slug: "nabire" },
  { province: "Papua Pegunungan", city: "Wamena", lat: -4.09583, lon: 138.94806, slug: "wamena" },
];

export function getCityBySlug(slug: string): CityData | undefined {
  return CITIES.find((c) => c.slug === slug);
}

export function getCityByName(name: string): CityData | undefined {
  return CITIES.find((c) => c.city.toLowerCase() === name.toLowerCase());
}

// WMO Weather Codes → Icon name + description (Bahasa Indonesia)
export interface WeatherCodeInfo {
  description: string;
  icon: string; // Lucide icon name
  category: "clear" | "cloudy" | "fog" | "drizzle" | "rain" | "snow" | "thunderstorm";
}

export const WMO_CODES: Record<number, WeatherCodeInfo> = {
  0:  { description: "Cerah",               icon: "sun",             category: "clear" },
  1:  { description: "Cerah Berawan",        icon: "sun",             category: "clear" },
  2:  { description: "Berawan Sebagian",     icon: "cloud-sun",       category: "cloudy" },
  3:  { description: "Mendung",              icon: "cloud",           category: "cloudy" },
  45: { description: "Kabut",                icon: "cloud-fog",       category: "fog" },
  48: { description: "Kabut Rime",           icon: "cloud-fog",       category: "fog" },
  51: { description: "Gerimis Ringan",       icon: "cloud-drizzle",   category: "drizzle" },
  53: { description: "Gerimis Sedang",       icon: "cloud-drizzle",   category: "drizzle" },
  55: { description: "Gerimis Lebat",        icon: "cloud-drizzle",   category: "drizzle" },
  56: { description: "Gerimis Dingin",       icon: "cloud-drizzle",   category: "drizzle" },
  57: { description: "Gerimis Dingin Lebat", icon: "cloud-drizzle",   category: "drizzle" },
  61: { description: "Hujan Ringan",         icon: "cloud-rain",      category: "rain" },
  63: { description: "Hujan Sedang",         icon: "cloud-rain",      category: "rain" },
  65: { description: "Hujan Lebat",          icon: "cloud-rain",      category: "rain" },
  66: { description: "Hujan Dingin",         icon: "cloud-rain",      category: "rain" },
  67: { description: "Hujan Dingin Lebat",   icon: "cloud-rain",      category: "rain" },
  71: { description: "Salju Ringan",         icon: "snowflake",       category: "snow" },
  73: { description: "Salju Sedang",         icon: "snowflake",       category: "snow" },
  75: { description: "Salju Lebat",          icon: "snowflake",       category: "snow" },
  77: { description: "Butiran Salju",        icon: "snowflake",       category: "snow" },
  80: { description: "Hujan Ringan",         icon: "cloud-rain",      category: "rain" },
  81: { description: "Hujan Deras",          icon: "cloud-rain-wind", category: "rain" },
  82: { description: "Hujan Sangat Deras",   icon: "cloud-rain-wind", category: "rain" },
  85: { description: "Salju Ringan",         icon: "snowflake",       category: "snow" },
  86: { description: "Salju Lebat",          icon: "snowflake",       category: "snow" },
  95: { description: "Badai Petir",          icon: "cloud-lightning",  category: "thunderstorm" },
  96: { description: "Badai Petir + Es",     icon: "cloud-lightning",  category: "thunderstorm" },
  99: { description: "Badai Petir Parah",    icon: "cloud-lightning",  category: "thunderstorm" },
};

export function getWeatherInfo(code: number): WeatherCodeInfo {
  return WMO_CODES[code] || { description: `Kode WMO ${code}`, icon: "cloud", category: "cloudy" };
}

// Wind direction helpers
export function getWindDirection(degrees: number): string {
  const dirs = ["U", "TL", "T", "TG", "S", "BD", "B", "BL"];
  const index = Math.round(degrees / 45) % 8;
  return dirs[index];
}

// Temperature color gradient
export function getTempColor(temp: number): string {
  if (temp <= 15) return "hsl(210, 90%, 60%)";
  if (temp <= 20) return "hsl(190, 80%, 55%)";
  if (temp <= 25) return "hsl(160, 70%, 50%)";
  if (temp <= 28) return "hsl(45, 90%, 55%)";
  if (temp <= 32) return "hsl(25, 90%, 55%)";
  return "hsl(0, 85%, 55%)";
}

// Navigation items
export interface NavItem {
  label: string;
  href: string;
  icon: string;
  description: string;
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Home", href: "/", icon: "home", description: "Peta & overview cuaca nasional" },
  { label: "Dashboard Kota", href: "/city/jakarta", icon: "building-2", description: "Cuaca detail per kota" },
  { label: "Forecast", href: "/forecast", icon: "trending-up", description: "Prediksi cuaca AI" },
  { label: "Analytics", href: "/analytics", icon: "bar-chart-3", description: "Analisis & tren data" },
  { label: "Compare", href: "/compare", icon: "git-compare-arrows", description: "Bandingkan antar kota" },
  { label: "API Explorer", href: "/api-explorer", icon: "code-2", description: "Dokumentasi REST API" },
];

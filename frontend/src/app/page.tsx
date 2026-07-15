import { fetchAllCurrentWeather, type CurrentWeather } from "@/lib/api";
import HomeClient from "./HomeClient";

export default async function HomePage() {
  let weatherData: CurrentWeather[];
  try {
    weatherData = await fetchAllCurrentWeather();
  } catch {
    weatherData = [];
  }

  return <HomeClient initialData={weatherData} />;
}

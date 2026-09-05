import { useEffect, useState } from 'react';

export type GeocodeResult = {
  name: string;
  latitude: number;
  longitude: number;
  country?: string;
  region?: string;
};

type WeatherData = {
  current?: {
    temperature: number;
    windspeed: number;
    winddirection: number;
    weathercode: number;
    time: string;
  };
  daily?: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    weathercode: number[];
  };
  hourly?: {
    time: string[];
    temperature_2m: number[];
    precipitation: number[];
  };
  timezone?: string;
};

export function useWeather() {
  const [query, setQuery] = useState<string>('New York');
  const [location, setLocation] = useState<GeocodeResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (navigator?.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          setLocation({ name: 'Current location', latitude, longitude });
        },
        () => {
          // silent fallback
        }
      );
    }
  }, []);

  async function geocodeCity(name: string): Promise<GeocodeResult | null> {
    if (!name) return null;
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
      name
    )}&count=5&language=en&format=json`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Geocoding failed');
    const j = await res.json();
    if (!j.results || j.results.length === 0) return null;
    const r = j.results[0];
    return {
      name: r.name,
      latitude: r.latitude,
      longitude: r.longitude,
      country: r.country,
      region: r.admin1,
    };
  }

  async function fetchWeatherForLocation(loc: GeocodeResult) {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        latitude: String(loc.latitude),
        longitude: String(loc.longitude),
        current_weather: 'true',
        timezone: 'auto',
        hourly: 'temperature_2m,precipitation',
        daily: 'temperature_2m_max,temperature_2m_min,weathercode',
      });
      const url = `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Weather fetch failed');
      const j = await res.json();
      setWeather({
        current: j.current_weather,
        daily: j.daily,
        hourly: j.hourly,
        timezone: j.timezone,
      });
    } catch (err: any) {
      setError(err?.message ?? String(err));
      setWeather(null);
    } finally {
      setLoading(false);
    }
  }

  async function searchAndLoad(cityName: string) {
    setLoading(true);
    setError(null);
    try {
      const g = await geocodeCity(cityName);
      if (!g) {
        setError('Location not found');
        setLoading(false);
        return;
      }
      setLocation(g);
      await fetchWeatherForLocation(g);
    } catch (err: any) {
      setError(err?.message ?? String(err));
    } finally {
      setLoading(false);
    }
  }

  return {
    query,
    setQuery,
    location,
    setLocation,
    weather,
    loading,
    error,
    searchAndLoad,
    fetchWeatherForLocation,
  };
}

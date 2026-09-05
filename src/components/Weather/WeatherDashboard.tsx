import React, { useEffect } from 'react';
import { useWeather } from './useWeather';
import WeatherCard from './WeatherCard';
import './index.css';

export default function WeatherDashboard() {
  const {
    query,
    setQuery,
    location,
    weather,
    loading,
    error,
    searchAndLoad,
    fetchWeatherForLocation,
  } = useWeather();

  useEffect(() => {
    if (location && !weather) {
      fetchWeatherForLocation(location);
    }
  }, [location]);

  return (
    <div className="weather-root">
      <div className="weather-panel">
        <h3>Weather Dashboard</h3>
        <div className="controls">
          <input
            aria-label="search-city"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter city (e.g., London)"
          />
          <button onClick={() => searchAndLoad(query)} disabled={loading}>
            {loading ? 'Loading…' : 'Search'}
          </button>
        </div>

        {error && <div className="error">{error}</div>}

        <div style={{ marginTop: 16 }}>
          <WeatherCard
            locationName={location?.name ?? '—'}
            temp={weather?.current?.temperature}
            wind={weather?.current?.windspeed}
            code={weather?.current?.weathercode}
            time={weather?.current?.time}
          />
        </div>

        <div className="daily-grid">
          {weather?.daily?.time?.map((t, idx) => (
            <div className="daily-card" key={t}>
              <div style={{ fontSize: 12, opacity: 0.8 }}>{new Date(t).toLocaleDateString()}</div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>
                {Math.round(weather.daily.temperature_2m_max[idx])}° / {Math.round(weather.daily.temperature_2m_min[idx])}°
              </div>
              <div style={{ fontSize: 12, opacity: 0.8 }}>{weather.daily.weathercode[idx]}</div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 12, fontSize: 12, opacity: 0.8 }}>
          Data provided by Open‑Meteo (no API key required).
        </div>
      </div>
    </div>
  );
}

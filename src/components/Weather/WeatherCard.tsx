import React from 'react';

function weatherCodeToText(code?: number) {
  if (code == null) return '—';
  if (code === 0) return 'Clear';
  if (code === 1 || code === 2) return 'Partly Cloudy';
  if (code === 3) return 'Overcast';
  if (code >= 51 && code <= 67) return 'Rain / Drizzle';
  if (code >= 80 && code <= 82) return 'Rain showers';
  if (code >= 95 && code <= 99) return 'Thunderstorm';
  return 'Unknown';
}

export default function WeatherCard({
  locationName,
  temp,
  wind,
  code,
  time,
}: {
  locationName: string;
  temp?: number;
  wind?: number;
  code?: number;
  time?: string;
}) {
  return (
    <div style={{
      background: 'linear-gradient(180deg,#0f172a,#00111a)',
      color: 'white',
      padding: 16,
      borderRadius: 12,
      minWidth: 260,
      boxShadow: '0 6px 18px rgba(0,0,0,0.35)'
    }}>
      <div style={{ fontSize: 14, opacity: 0.85 }}>{locationName}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginTop: 8 }}>
        <div style={{ fontSize: 36, fontWeight: 700 }}>{temp != null ? `${Math.round(temp)}°C` : '—'}</div>
        <div style={{ fontSize: 14 }}>
          <div style={{ opacity: 0.9 }}>{weatherCodeToText(code)}</div>
          <div style={{ opacity: 0.6, marginTop: 6 }}>{wind != null ? `Wind ${Math.round(wind)} km/h` : ''}</div>
        </div>
      </div>
      {time && <div style={{ marginTop: 8, fontSize: 12, opacity: 0.7 }}>As of {new Date(time).toLocaleString()}</div>}
    </div>
  );
}

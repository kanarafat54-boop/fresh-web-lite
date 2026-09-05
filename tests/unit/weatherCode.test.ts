import { describe, it, expect } from 'vitest';

// Mirror of the mapping used in WeatherCard.tsx
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

describe('weatherCodeToText', () => {
  it('handles known codes', () => {
    expect(weatherCodeToText(0)).toBe('Clear');
    expect(weatherCodeToText(3)).toBe('Overcast');
    expect(weatherCodeToText(61)).toBe('Rain / Drizzle');
    expect(weatherCodeToText(96)).toBe('Thunderstorm');
  });

  it('handles missing and unknown codes', () => {
    expect(weatherCodeToText(undefined)).toBe('—');
    expect(weatherCodeToText(45)).toBe('Unknown');
  });
})

# fresh-web-lite — Architecture

## UI layer

- **src/components/Weather** — Open-Meteo powered dashboard.
  - `useWeather.ts` — geolocation, geocoding and forecast fetching.
  - `WeatherCard.tsx` — current conditions card.
  - `WeatherDashboard.tsx` — search controls + daily grid.
- **src/components/Shorts** — vertical, scroll-snapped video feed.
  - `FeedContainer.tsx` — full-viewport snap scroller.
  - `useVisibleIndex.ts` — IntersectionObserver-based active item tracking.
  - `ShortItem.tsx` — autoplay/pause bound to visibility.
  - `ShortsFeed.tsx` — composes the above.

## AI layer

- **ai/clients** — thin HTTP wrapper around the chat completions API.
- **ai/ingest** — URL fetching plus naive HTML-to-text extraction.
- **ai/pipeline** — chunking and map-reduce summarization.
- **ai/graph** — orchestration entry point (`runGraph`).

## Environment

- `LLM_API_KEY` — required for any AI pipeline run.
- `LLM_BASE_URL` — optional override for self-hosted or proxy endpoints.

## Notes

- The weather stack requires no API key.
- Autoplay may be blocked unless videos are muted; `ShortItem` defaults to muted.

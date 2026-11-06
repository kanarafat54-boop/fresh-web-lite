/**
 * Fresh Shorts filter sheet logic (specification 2.1): publication date, original or remixed, creator and
 * ordering. Pure and dependency-free so it can be tested without the app. Filters only narrow or reorder what
 * the feed has already loaded; they never fetch or expose anything new.
 *
 * Duration and language use the values stored when a Short was published (see shortsDuration.ts). A Short with
 * no stored value never matches those two filters. "Intent" is still not offered: no data exists for it.
 */
import { matchesDurationBucket, normalizeDurationBucket, normalizeLanguage, type DurationBucket } from "./shortsDuration.ts";

export type ShortDateFilter = "any" | "day" | "week" | "month";
export type ShortOriginFilter = "all" | "original" | "remix";
export type ShortOrder = "ranked" | "views" | "newest";

export type ShortFilters = { date: ShortDateFilter; origin: ShortOriginFilter; order: ShortOrder; creator: string; duration: DurationBucket; language: string };

export const DEFAULT_SHORT_FILTERS: ShortFilters = { date: "any", origin: "all", order: "ranked", creator: "", duration: "any", language: "" };

type FilterableShort = {
  authorUsername: string;
  authorName: string;
  createdAt: string;
  viewCount: number;
  remixOfShortId?: string | null;
  duetOfShortId?: string | null;
  durationSeconds?: number | null;
  language?: string | null;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const WINDOW_MS: Record<Exclude<ShortDateFilter, "any">, number> = { day: DAY_MS, week: 7 * DAY_MS, month: 30 * DAY_MS };

export function normalizeShortFilters(input: unknown): ShortFilters {
  const value = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  return {
    date: value.date === "day" || value.date === "week" || value.date === "month" ? value.date : "any",
    origin: value.origin === "original" || value.origin === "remix" ? value.origin : "all",
    order: value.order === "views" || value.order === "newest" ? value.order : "ranked",
    creator: typeof value.creator === "string" ? value.creator.trim().slice(0, 40) : "",
    duration: normalizeDurationBucket(value.duration),
    language: normalizeLanguage(value.language) ?? "",
  };
}

export function activeFilterCount(filters: ShortFilters): number {
  return (filters.date !== "any" ? 1 : 0) + (filters.origin !== "all" ? 1 : 0) + (filters.order !== "ranked" ? 1 : 0) + (filters.creator ? 1 : 0) + (filters.duration !== "any" ? 1 : 0) + (filters.language ? 1 : 0);
}

const time = (s: FilterableShort) => { const t = Date.parse(s.createdAt); return Number.isFinite(t) ? t : 0; };
const isRemix = (s: FilterableShort) => Boolean(s.remixOfShortId || s.duetOfShortId);

export function applyShortFilters<T extends FilterableShort>(shorts: T[], filters: ShortFilters, now: number = Date.now()): T[] {
  const f = normalizeShortFilters(filters);
  const creator = f.creator.replace(/^@/, "").toLowerCase();
  let out = shorts.filter((s) => {
    if (f.date !== "any") {
      const created = Date.parse(s.createdAt);
      if (!Number.isFinite(created) || now - created > WINDOW_MS[f.date]) return false;
    }
    if (f.origin === "original" && isRemix(s)) return false;
    if (f.origin === "remix" && !isRemix(s)) return false;
    if (!matchesDurationBucket(s.durationSeconds, f.duration)) return false;
    if (f.language && normalizeLanguage(s.language) !== f.language) return false;
    if (creator && !s.authorUsername.toLowerCase().includes(creator) && !s.authorName.toLowerCase().includes(creator)) return false;
    return true;
  });
  if (f.order === "views") out = [...out].sort((a, b) => b.viewCount - a.viewCount);
  else if (f.order === "newest") out = [...out].sort((a, b) => time(b) - time(a));
  return out;
}

/**
 * Duration and language data for Fresh Shorts (specification 2.1 filters).
 *
 * Both are recorded when a Short is published (duration is read from the video file, language comes from the
 * creator's device language). Shorts published before this existed have neither, and filters say so instead of
 * guessing: a Short with no stored duration or language never matches a duration or language filter.
 */
export type DurationBucket = "any" | "under15" | "15to30" | "30to60" | "over60";

export const DURATION_BUCKETS: Array<{ id: DurationBucket; label: string }> = [
  { id: "any", label: "Any length" },
  { id: "under15", label: "Under 15s" },
  { id: "15to30", label: "15–30s" },
  { id: "30to60", label: "30–60s" },
  { id: "over60", label: "Over 60s" },
];

export const MAX_DURATION_SECONDS = 36_000;

/** A usable stored duration in seconds, or null. */
export function normalizeDuration(value: unknown): number | null {
  const n = typeof value === "string" ? Number(value) : value;
  if (typeof n !== "number" || !Number.isFinite(n) || n <= 0 || n > MAX_DURATION_SECONDS) return null;
  return Math.round(n * 100) / 100;
}

export function normalizeDurationBucket(value: unknown): DurationBucket {
  return DURATION_BUCKETS.some((b) => b.id === value) ? (value as DurationBucket) : "any";
}

export function matchesDurationBucket(seconds: number | null | undefined, bucket: DurationBucket): boolean {
  if (bucket === "any") return true;
  const d = normalizeDuration(seconds);
  if (d === null) return false;
  if (bucket === "under15") return d < 15;
  if (bucket === "15to30") return d >= 15 && d < 30;
  if (bucket === "30to60") return d >= 30 && d < 60;
  return d >= 60;
}

/** "en-US" -> "en". Anything that is not a 2–3 letter language code becomes null. */
export function normalizeLanguage(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const base = value.trim().toLowerCase().split(/[-_]/)[0] ?? "";
  return /^[a-z]{2,3}$/.test(base) ? base : null;
}

export function languageLabel(code: string): string {
  try {
    const name = new Intl.DisplayNames(["en"], { type: "language" }).of(code);
    return name && name !== code ? name : code.toUpperCase();
  } catch {
    return code.toUpperCase();
  }
}

/** Languages present in the loaded Shorts, most common first. */
export function languagesPresent(shorts: Array<{ language?: string | null }>): Array<{ code: string; count: number }> {
  const counts = new Map<string, number>();
  for (const s of shorts) {
    const code = normalizeLanguage(s.language);
    if (code) counts.set(code, (counts.get(code) ?? 0) + 1);
  }
  return [...counts.entries()].map(([code, count]) => ({ code, count })).sort((a, b) => b.count - a.count || a.code.localeCompare(b.code));
}

/** True when a database error means a column does not exist yet (migration not applied). */
export function isMissingColumnError(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false;
  return error.code === "42703" || error.code === "PGRST204" || /column .* (does not exist|of relation)|could not find the .* column/i.test(error.message ?? "");
}

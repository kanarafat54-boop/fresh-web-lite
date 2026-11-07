/**
 * Recent searches (spec 2.8). Stored only in this browser's localStorage, per search scope, never sent anywhere.
 * Every storage call is guarded because storage can be missing or blocked (private windows, blocked site data).
 */
export type SearchScope = "flow" | "shorts";

export const MAX_RECENT = 8;
export const MAX_QUERY_LENGTH = 80;

type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

const keyFor = (scope: SearchScope) => `fresh-recent-searches-${scope}`;

function defaultStorage(): StorageLike | null {
  try { return typeof localStorage === "undefined" ? null : localStorage; } catch { return null; }
}

/** Trimmed, whitespace-collapsed, length-capped. Empty queries are not recorded. */
export function cleanQuery(value: unknown): string {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, MAX_QUERY_LENGTH) : "";
}

/** Adds a query to the front, removing an earlier copy (case-insensitive) and keeping at most MAX_RECENT. */
export function addRecent(list: readonly string[], query: unknown): string[] {
  const clean = cleanQuery(query);
  if (!clean) return [...list];
  return [clean, ...list.filter((item) => item.toLowerCase() !== clean.toLowerCase())].slice(0, MAX_RECENT);
}

export function removeRecent(list: readonly string[], query: string): string[] {
  return list.filter((item) => item.toLowerCase() !== query.toLowerCase());
}

export function readRecent(scope: SearchScope, storage: StorageLike | null = defaultStorage()): string[] {
  if (!storage) return [];
  try {
    const parsed: unknown = JSON.parse(storage.getItem(keyFor(scope)) ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.map(cleanQuery).filter(Boolean).slice(0, MAX_RECENT);
  } catch { return []; }
}

/** Returns the list that is now stored, or the unchanged list when storage is unavailable. */
export function writeRecent(scope: SearchScope, list: readonly string[], storage: StorageLike | null = defaultStorage()): string[] {
  if (!storage) return [...list];
  try {
    if (list.length === 0) storage.removeItem(keyFor(scope));
    else storage.setItem(keyFor(scope), JSON.stringify(list.slice(0, MAX_RECENT)));
  } catch { /* keep working in memory for this visit */ }
  return [...list];
}

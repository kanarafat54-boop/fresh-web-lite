/**
 * Watch history for Fresh Shorts (spec 11.2), built from the viewer's own `fresh_flow_events` rows
 * (owner-only policy: a viewer can read and delete only their own).
 *
 * A Short is "watched" once the viewer really watched a quarter of it (play_25 or further). Skips, likes and
 * comment opens alone do not make history. Clearing history deletes those event rows, which also removes
 * them from the signals the For You ranking learns from; the screen says so.
 */
export type HistoryEventRow = { media_id: string; event_type: string; created_at: string };

export type HistoryEntry = {
  mediaId: string;
  lastWatchedAt: string;
  furthest: "play_25" | "play_50" | "play_75" | "complete";
  sessions: number;
};

const ORDER = ["play_25", "play_50", "play_75", "complete"] as const;
const WATCH_EVENTS = new Set<string>(ORDER);

/** One entry per Short, newest first. `sessions` counts distinct "play_25" events (each is one viewing). */
export function buildHistory(rows: HistoryEventRow[]): HistoryEntry[] {
  const byId = new Map<string, HistoryEntry>();
  for (const row of rows) {
    if (!row || typeof row.media_id !== "string" || !WATCH_EVENTS.has(row.event_type)) continue;
    const at = Date.parse(row.created_at);
    if (!Number.isFinite(at)) continue;
    const furthest = row.event_type as HistoryEntry["furthest"];
    const existing = byId.get(row.media_id);
    if (!existing) {
      byId.set(row.media_id, { mediaId: row.media_id, lastWatchedAt: row.created_at, furthest, sessions: furthest === "play_25" ? 1 : 0 });
      continue;
    }
    if (at > Date.parse(existing.lastWatchedAt)) existing.lastWatchedAt = row.created_at;
    if (ORDER.indexOf(furthest) > ORDER.indexOf(existing.furthest)) existing.furthest = furthest;
    if (furthest === "play_25") existing.sessions += 1;
  }
  return [...byId.values()].map((entry) => ({ ...entry, sessions: Math.max(1, entry.sessions) })).sort((a, b) => Date.parse(b.lastWatchedAt) - Date.parse(a.lastWatchedAt));
}

export function progressLabel(furthest: HistoryEntry["furthest"]): string {
  return furthest === "complete" ? "Watched to the end" : furthest === "play_75" ? "Watched most of it" : furthest === "play_50" ? "Watched about half" : "Watched a part";
}

/** "Today", "Yesterday" or a short date, in the viewer's local time. */
export function dayLabel(iso: string, now: Date = new Date()): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Earlier";
  const start = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((start(now) - start(d)) / 86_400_000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: d.getFullYear() === now.getFullYear() ? undefined : "numeric" });
}

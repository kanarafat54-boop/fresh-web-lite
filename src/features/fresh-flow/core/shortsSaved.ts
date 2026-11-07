/**
 * Saved Shorts library (spec 4.4 / 11.1). Pure assembly of the viewer's own `saved_shorts` rows with the Shorts
 * and creators they point at. A saved Short that was deleted or hidden stays in the list as "no longer available"
 * so the viewer can remove it, instead of silently disappearing.
 */
export type SavedRow = { short_id: string; created_at: string };
export type SavedShortInfo = { id: string; author_id: string; caption: string | null };

export type SavedItem = {
  shortId: string;
  savedAt: string;
  caption: string | null;
  creator: string | null;
  available: boolean;
};

export function buildSavedItems(rows: SavedRow[], shorts: Map<string, SavedShortInfo>, names: Map<string, string>): SavedItem[] {
  const seen = new Set<string>();
  const items: SavedItem[] = [];
  for (const row of rows) {
    if (!row || typeof row.short_id !== "string" || seen.has(row.short_id) || !Number.isFinite(Date.parse(row.created_at))) continue;
    seen.add(row.short_id);
    const info = shorts.get(row.short_id);
    items.push({
      shortId: row.short_id,
      savedAt: row.created_at,
      caption: info?.caption ?? null,
      creator: info ? names.get(info.author_id) ?? "Creator" : null,
      available: Boolean(info),
    });
  }
  return items.sort((a, b) => Date.parse(b.savedAt) - Date.parse(a.savedAt));
}

/** Simple case-insensitive filter over caption and creator. An empty query returns everything. */
export function filterSaved(items: SavedItem[], query: string): SavedItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  return items.filter((item) => `${item.caption ?? ""} ${item.creator ?? ""}`.toLowerCase().includes(q));
}

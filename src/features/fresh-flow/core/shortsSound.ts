/**
 * Sound page data (spec Part 5), computed from real Shorts only.
 *
 * `total` is the exact number of Shorts using the sound (a database count, not the length of the loaded list).
 * Creators and first use come from at most SAMPLE_LIMIT rows; when there are more rows than that the figures are
 * marked as a lower bound ("1000+") instead of being presented as exact.
 */
export const SAMPLE_LIMIT = 1000;

export type SoundRow = { author_id: string; created_at: string; id: string };

export type SoundSummary = {
  total: number;
  creators: number;
  /** True when the sample did not cover every Short, so `creators` is a lower bound. */
  creatorsIsLowerBound: boolean;
  firstUse: { shortId: string; authorId: string; at: string } | null;
};

export function summarizeSound(rows: SoundRow[], total: number): SoundSummary {
  const safeTotal = Number.isFinite(total) && total > 0 ? Math.floor(total) : 0;
  const valid = rows.filter((row) => row && typeof row.author_id === "string" && Number.isFinite(Date.parse(row.created_at)));
  const creators = new Set(valid.map((row) => row.author_id)).size;
  const earliest = valid.reduce<SoundRow | null>((best, row) => (best === null || Date.parse(row.created_at) < Date.parse(best.created_at) ? row : best), null);
  return {
    total: Math.max(safeTotal, valid.length),
    creators,
    creatorsIsLowerBound: safeTotal > valid.length,
    // The earliest row is only the true first use when the sample covered everything.
    firstUse: earliest && safeTotal <= valid.length ? { shortId: earliest.id, authorId: earliest.author_id, at: earliest.created_at } : null,
  };
}

export type TopicSort = "popular" | "recent";

export function sortTopicShorts<T extends { viewCount: number; createdAt: string }>(items: T[], sort: TopicSort): T[] {
  const copy = [...items];
  if (sort === "recent") return copy.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  return copy.sort((a, b) => b.viewCount - a.viewCount || Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

export function creatorsLabel(summary: SoundSummary): string {
  return `${summary.creators}${summary.creatorsIsLowerBound ? "+" : ""}`;
}

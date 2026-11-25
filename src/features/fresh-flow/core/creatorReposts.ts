import { supabase } from "../../../lib/supabase";
import { keepVisibleAuthors } from "./userBlocksService";

export type CreatorRepost = { id: string; authorId: string; caption: string; videoUrl: string; viewCount: number; repostedAt: string };

type RepostRow = { short_id: string; created_at: string | null };
type ShortRow = { id: string; author_id: string; caption: string | null; video_url: string; view_count: number | null };

/**
 * Pair repost rows with their Shorts, newest repost first. A repost whose Short no longer exists, or whose Short is
 * not in `shorts` because it was filtered out, is dropped rather than shown as an empty tile. Pure, so it can be tested.
 */
export function mergeReposts(reposts: RepostRow[], shorts: ShortRow[]): CreatorRepost[] {
  const byId = new Map(shorts.map((row) => [row.id, row]));
  const seen = new Set<string>();
  return [...reposts]
    .sort((a, b) => Date.parse(b.created_at ?? "") - Date.parse(a.created_at ?? "") || 0)
    .flatMap((repost) => {
      const short = byId.get(repost.short_id);
      if (!short || seen.has(short.id)) return [];
      seen.add(short.id);
      return [{ id: short.id, authorId: short.author_id, caption: short.caption ?? "", videoUrl: short.video_url, viewCount: Number(short.view_count) || 0, repostedAt: repost.created_at ?? "" }];
    });
}

type RefTable = "short_reposts" | "short_likes";

/**
 * Both tables hold (short_id, user_id, created_at), so one reader serves the reposts and likes lists. The original
 * authors are filtered the same way as search, so a viewer never sees content from someone they blocked or who
 * blocked them. Throws on a read error so the caller can show a real failure instead of an empty list.
 */
async function loadShortsFromRefTable(table: RefTable, userId: string, limit: number): Promise<CreatorRepost[]> {
  const { data: refRows, error } = await supabase.from(table).select("short_id, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(limit);
  if (error) throw new Error(error.message);
  const refs = (refRows ?? []) as RepostRow[];
  if (refs.length === 0) return [];
  const { data: shortRows, error: shortError } = await supabase.from("shorts").select("id, author_id, caption, video_url, view_count").in("id", refs.map((row) => row.short_id));
  if (shortError) throw new Error(shortError.message);
  const visible = await keepVisibleAuthors((shortRows ?? []) as ShortRow[], (row) => String(row.author_id));
  return mergeReposts(refs, visible);
}

/** Shorts this creator has reposted. Reposts are publicly readable (RLS "Reposts viewable by everyone"). */
export function loadCreatorReposts(creatorId: string, limit = 40): Promise<CreatorRepost[]> {
  return loadShortsFromRefTable("short_reposts", creatorId, limit);
}

/** Shorts the signed-in viewer has liked. Callers pass the viewer's own id; this is never used for other people's likes. */
export function loadLikedShorts(viewerId: string, limit = 40): Promise<CreatorRepost[]> {
  return loadShortsFromRefTable("short_likes", viewerId, limit);
}

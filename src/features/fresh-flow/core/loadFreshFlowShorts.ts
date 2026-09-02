import { supabase } from "../../../lib/supabase";
import type { Short } from "../../shorts/types/short";

export type FreshFlowLoadResult = {
  shorts: Short[];
  savedIds: Set<string>;
};

/**
 * Independent data loader for Fresh Flow. Reads the same underlying Shorts
 * data as the dedicated Shorts tab (shorts, short_likes, saved_shorts,
 * short_reposts, follows, short_reaction_breakdown, short_recent_activity)
 * but is kept as its own module rather than coupled into ShortsModule.tsx,
 * which is under frequent, separate active development.
 */
export type FreshFlowLoadOptions = {
  category?: "learn" | "relax";
  authorIds?: string[];
  limit?: number;
};

export async function loadFreshFlowShorts(
  userId: string | null,
  isGuest: boolean,
  options: FreshFlowLoadOptions = {},
): Promise<FreshFlowLoadResult> {
  const limit = options.limit ?? 30;
  let query = supabase
    .from("shorts")
    .select("id, author_id, caption, sound_name, chapters, video_url, like_count, comment_count, view_count, repost_count, created_at")
    .order("created_at", { ascending: false })
    .limit(limit * 2); // fetch extra so the diversity/discovery ranking has real room to reorder

  if (options.category) {
    query = query.eq("category", options.category);
  }
  if (options.authorIds) {
    if (options.authorIds.length === 0) {
      return { shorts: [], savedIds: new Set() };
    }
    query = query.in("author_id", options.authorIds);
  }

  const { data: shortsData, error: shortsError } = await query;

  if (shortsError) throw new Error(`Couldn't load Fresh Flow: ${shortsError.message}`);
  const rows: any[] = shortsData ?? [];

  const authorIds = [...new Set(rows.map((row) => row.author_id))];
  let profileMap = new Map<string, { full_name: string; username: string }>();
  if (authorIds.length > 0) {
    const { data: profilesData } = await supabase.from("users").select("id, full_name, username").in("id", authorIds);
    profileMap = new Map((profilesData ?? []).map((u: any) => [u.id, u]));
  }

  let reactionMap = new Map<string, string>();
  let savedIds = new Set<string>();
  let repostedIds = new Set<string>();
  let followingIds = new Set<string>();

  if (userId && !isGuest) {
    const { data: likesData } = await supabase.from("short_likes").select("short_id, reaction_type").eq("user_id", userId);
    reactionMap = new Map((likesData ?? []).map((l: any) => [l.short_id, l.reaction_type]));

    const { data: savedData } = await supabase.from("saved_shorts").select("short_id").eq("user_id", userId);
    savedIds = new Set((savedData ?? []).map((s: any) => s.short_id));

    const { data: repostData } = await supabase.from("short_reposts").select("short_id").eq("user_id", userId);
    repostedIds = new Set((repostData ?? []).map((r: any) => r.short_id));

    if (authorIds.length > 0) {
      const { data: followData } = await supabase
        .from("follows")
        .select("followed_id")
        .eq("follower_id", userId)
        .in("followed_id", authorIds);
      followingIds = new Set((followData ?? []).map((f: any) => f.followed_id));
    }
  }

  const shortIds = rows.map((row) => row.id);
  let breakdownMap = new Map<string, Record<string, number>>();
  let hotIds = new Set<string>();

  if (shortIds.length > 0) {
    const { data: breakdownData } = await supabase
      .from("short_reaction_breakdown")
      .select("short_id, reaction_type, count")
      .in("short_id", shortIds);
    (breakdownData ?? []).forEach((row: any) => {
      const existing = breakdownMap.get(row.short_id) ?? {};
      existing[row.reaction_type] = row.count;
      breakdownMap.set(row.short_id, existing);
    });

    const { data: activityData } = await supabase
      .from("short_recent_activity")
      .select("short_id, recent_count")
      .in("short_id", shortIds)
      .gte("recent_count", 3);
    hotIds = new Set((activityData ?? []).map((row: any) => row.short_id));
  }

  const shorts: Short[] = rows.map((row): Short => {
    const profile = profileMap.get(row.author_id);
    return {
      id: row.id,
      authorId: row.author_id,
      authorName: profile?.full_name ?? "Unknown",
      authorUsername: profile?.username ?? "unknown",
      caption: row.caption ?? "",
      soundName: row.sound_name,
      videoUrl: row.video_url,
      likeCount: row.like_count,
      commentCount: row.comment_count,
      viewCount: row.view_count ?? 0,
      repostCount: row.repost_count ?? 0,
      myReaction: reactionMap.get(row.id) ?? null,
      repostedByMe: repostedIds.has(row.id),
      isFollowingAuthor: followingIds.has(row.author_id),
      reactionBreakdown: breakdownMap.get(row.id) ?? {},
      isHot: hotIds.has(row.id),
      chapters: row.chapters ?? [],
      createdAt: row.created_at,
    };
  });

  return { shorts, savedIds };
}

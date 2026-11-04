import { supabase } from "../../../lib/supabase";
import { loadFreshFlowShorts } from "./loadFreshFlowShorts";
import { rankTrending } from "./FreshFlowRanking";
import { topicsOf } from "../../shorts/core/PersonalRanking";
import type { Short } from "../../shorts/types/short";

/** Handoff key: Explore/Search/Profile ask the Shorts feed to start on a specific Short. */
export const OPEN_SHORT_KEY = "fresh-flow-open-short";

export function requestOpenShort(shortId: string) {
  try { sessionStorage.setItem(OPEN_SHORT_KEY, shortId); } catch { /* ignore */ }
  // A mounted Shorts feed listens for this; a feed that mounts later reads the stored key.
  window.dispatchEvent(new Event("fresh-shorts-open-short"));
}

export function consumeOpenShortRequest(): string | null {
  try {
    const id = sessionStorage.getItem(OPEN_SHORT_KEY);
    if (id) sessionStorage.removeItem(OPEN_SHORT_KEY);
    return id;
  } catch { return null; }
}

export function formatCount(value: number): string {
  if (!Number.isFinite(value) || value < 0) return "0";
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(value >= 10_000_000 ? 0 : 1).replace(/\.0$/, "")}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(value >= 10_000 ? 0 : 1).replace(/\.0$/, "")}K`;
  return String(Math.floor(value));
}

export type ExploreTopic = { tag: string; count: number };
export type ExploreSets = { trending: Short[]; forYou: Short[]; following: Short[]; topics: ExploreTopic[] };

/** Real topics: the most common caption words/hashtags across current Shorts (no invented categories). */
export function topTopics(shorts: readonly Short[], limit = 6): ExploreTopic[] {
  const counts = new Map<string, number>();
  for (const short of shorts) for (const tag of topicsOf(short)) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  return [...counts].filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, limit).map(([tag, count]) => ({ tag, count }));
}

export async function loadExploreSets(userId: string | null, isGuest: boolean): Promise<ExploreSets> {
  const { shorts } = await loadFreshFlowShorts(userId, isGuest, { limit: 48 });
  const trending = rankTrending(shorts).slice(0, 12);
  const forYou = [...shorts].sort((a, b) => (b.likeCount + b.commentCount * 2) - (a.likeCount + a.commentCount * 2)).slice(0, 12);
  return { trending, forYou, following: shorts.filter((s) => s.isFollowingAuthor), topics: topTopics(shorts) };
}

export type CreatorShort = { id: string; caption: string; videoUrl: string; likeCount: number; viewCount: number; commentCount: number; createdAt: string };
export type CreatorProfileData = {
  id: string; username: string; fullName: string; verified: boolean;
  bio: string | null; avatarUrl: string | null; joinedAt: string | null;
  followers: number; following: number; totalLikes: number; totalViews: number;
  isFollowing: boolean; shorts: CreatorShort[];
};

export async function loadCreatorProfile(authorId: string, viewerId: string | null): Promise<CreatorProfileData> {
  const [profile, details, followers, following, shortsRes, mine] = await Promise.all([
    supabase.from("user_public_profiles").select("id, username, full_name, verified, created_at").eq("id", authorId).maybeSingle(),
    supabase.from("profile_details").select("bio, avatar_url").eq("user_id", authorId).maybeSingle(),
    supabase.from("follows").select("follower_id", { count: "exact", head: true }).eq("followed_id", authorId),
    supabase.from("follows").select("followed_id", { count: "exact", head: true }).eq("follower_id", authorId),
    supabase.from("shorts").select("id, caption, video_url, like_count, view_count, comment_count, created_at").eq("author_id", authorId).order("created_at", { ascending: false }).limit(60),
    viewerId ? supabase.from("follows").select("followed_id").eq("follower_id", viewerId).eq("followed_id", authorId).maybeSingle() : Promise.resolve({ data: null }),
  ]);
  const p: any = profile.data;
  const rows: any[] = shortsRes.data ?? [];
  const shorts: CreatorShort[] = rows.map((r) => ({ id: r.id, caption: r.caption ?? "", videoUrl: r.video_url, likeCount: r.like_count ?? 0, viewCount: r.view_count ?? 0, commentCount: r.comment_count ?? 0, createdAt: r.created_at }));
  return {
    id: authorId,
    username: p?.username ?? "unknown",
    fullName: p?.full_name ?? p?.username ?? "Fresh creator",
    verified: Boolean(p?.verified),
    bio: (details.data as any)?.bio ?? null,
    avatarUrl: (details.data as any)?.avatar_url ?? null,
    joinedAt: p?.created_at ?? null,
    followers: followers.count ?? 0,
    following: following.count ?? 0,
    totalLikes: shorts.reduce((n, s) => n + s.likeCount, 0),
    totalViews: shorts.reduce((n, s) => n + s.viewCount, 0),
    isFollowing: Boolean((mine as any).data),
    shorts,
  };
}

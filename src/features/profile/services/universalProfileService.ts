import { supabase } from "../../../lib/supabase";

export type UniversalProfileStats = {
  userId: string;
  username: string;
  fullName: string;
  shortCount: number;
  postCount: number;
  totalLikesReceived: number;
  totalCommentsReceived: number;
  totalRepostsReceived: number;
  giftsReceivedCount: number;
  giftsReceivedTotalMinor: string;
  followerCount: number;
  followingCount: number;
  /** Transparent, formula-based score from real activity -- not an "AI verification" claim. */
  reputationScore: number;
};

/**
 * The real cross-platform aggregation layer: pulls a user's actual activity
 * across Shorts, Posts, Gifts, and Follows into one place. Backed by a view
 * (universal_profile_stats), so it's always live, never a stale duplicate.
 */
export async function getUniversalProfileStats(userId: string): Promise<UniversalProfileStats | null> {
  const { data, error } = await supabase.from("universal_profile_stats").select("*").eq("user_id", userId).maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  return {
    userId: data.user_id,
    username: data.username ?? "",
    fullName: data.full_name ?? "",
    shortCount: data.short_count ?? 0,
    postCount: data.post_count ?? 0,
    totalLikesReceived: data.total_likes_received ?? 0,
    totalCommentsReceived: data.total_comments_received ?? 0,
    totalRepostsReceived: data.total_reposts_received ?? 0,
    giftsReceivedCount: data.gifts_received_count ?? 0,
    giftsReceivedTotalMinor: String(data.gifts_received_total_minor ?? "0"),
    followerCount: data.follower_count ?? 0,
    followingCount: data.following_count ?? 0,
    reputationScore: Number(data.reputation_score ?? 0),
  };
}

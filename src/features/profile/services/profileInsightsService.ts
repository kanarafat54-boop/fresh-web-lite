import { supabase } from "../../../lib/supabase";

export interface ProfileInsightItem {
  label: string;
  value: string;
  reason: string;
}

export interface ProfileInsights {
  summary: string;
  items: ProfileInsightItem[];
  generatedAt: string;
}

export async function getProfileInsights(userId: string): Promise<ProfileInsights | null> {
  const [followers, following, posts, shorts] = await Promise.all([
    supabase.from("follows").select("id", { count: "exact", head: true }).eq("followed_id", userId),
    supabase.from("follows").select("id", { count: "exact", head: true }).eq("follower_id", userId),
    supabase.from("posts").select("id", { count: "exact", head: true }).eq("author_id", userId),
    supabase.from("shorts").select("id", { count: "exact", head: true }).eq("author_id", userId),
  ]);

  const errors = [followers.error, following.error, posts.error, shorts.error].filter(Boolean);
  if (errors.length === 4) return null;

  const followerCount = followers.count ?? 0;
  const followingCount = following.count ?? 0;
  const postCount = posts.count ?? 0;
  const shortCount = shorts.count ?? 0;
  const ratio = followingCount > 0 ? followerCount / followingCount : followerCount;

  const items: ProfileInsightItem[] = [
    { label: "Followers", value: String(followerCount), reason: "Current follower count stored for this Fresh ID." },
    { label: "Following", value: String(followingCount), reason: "Current following count stored for this Fresh ID." },
    { label: "Posts", value: String(postCount), reason: "Published posts currently stored for this profile." },
    { label: "Shorts", value: String(shortCount), reason: "Published Shorts currently stored for this profile." },
    { label: "Audience ratio", value: ratio.toFixed(1), reason: "Followers compared with accounts this profile follows." },
  ];

  return {
    summary: "These insights are calculated only from data currently stored for this Fresh ID.",
    items,
    generatedAt: new Date().toISOString(),
  };
}

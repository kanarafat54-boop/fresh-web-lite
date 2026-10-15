import { supabase } from "../../../lib/supabase";
import type { FreshUser } from "../../fresh-id/types/user";
import type { ProfileActivity, ProfileConnection, ProfileVisibility, UniversalProfile } from "../types/profile";

type Identity = Record<string, unknown>;
type ProfileDetails = {
  bio?: unknown;
  avatar_url?: unknown;
  cover_url?: unknown;
  location?: unknown;
  website_url?: unknown;
  occupation?: unknown;
  company?: unknown;
  pronouns?: unknown;
};

const text = (value: unknown) => (typeof value === "string" ? value : "");
const identityOf = (user: FreshUser): Identity =>
  user.identity && typeof user.identity === "object" ? (user.identity as Identity) : {};

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map(String).map((s) => s.trim()).filter(Boolean);
}

function visibilityOf(identity: Identity): ProfileVisibility {
  const value = identity.profile_visibility;
  if (!value || typeof value !== "object") return { public: true, connections: true, private: true };
  const v = value as Record<string, unknown>;
  return {
    public: v.public !== false,
    connections: v.connections !== false,
    private: v.private !== false,
  };
}

function connectionsOf(user: FreshUser): ProfileConnection[] {
  return (user.linkedAccounts ?? []).map((account) => ({
    provider: text(account.provider) || "connected account",
    handle: text(account.providerId),
    connected: true,
  }));
}

/** Never let a single table failure blank the whole profile. */
async function safeQuery<T>(label: string, run: () => PromiseLike<{ data: T | null; error: { message?: string } | null; count?: number | null }>): Promise<{ data: T | null; count: number }> {
  try {
    const result = await run();
    if (result.error) {
      console.warn(`[profile] ${label}:`, result.error.message);
      return { data: null, count: 0 };
    }
    return { data: result.data, count: result.count ?? 0 };
  } catch (err) {
    console.warn(`[profile] ${label} failed:`, err);
    return { data: null, count: 0 };
  }
}

export async function loadRealUniversalProfile(user: FreshUser): Promise<UniversalProfile> {
  const identity = identityOf(user);

  const detailsResult = await safeQuery<ProfileDetails>("profile_details", () =>
    supabase
      .from("profile_details")
      .select("bio, avatar_url, cover_url, location, website_url, occupation, company, pronouns")
      .eq("user_id", user.id)
      .maybeSingle(),
  );
  const details: ProfileDetails = detailsResult.data ?? {};

  const [posts, shorts, followers, following] = await Promise.all([
    safeQuery<Array<{ id: unknown; content?: unknown; image_url?: unknown; video_url?: unknown; created_at?: unknown }>>("posts", () =>
      supabase
        .from("posts")
        .select("id, content, image_url, video_url, created_at", { count: "exact" })
        .eq("author_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50),
    ),
    safeQuery<Array<{ id: unknown; video_url?: unknown; like_count?: unknown; created_at?: unknown }>>("shorts", () =>
      supabase
        .from("shorts")
        .select("id, video_url, like_count, created_at", { count: "exact" })
        .eq("author_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50),
    ),
    safeQuery("follows_followers", () =>
      supabase.from("follows").select("follower_id", { count: "exact", head: true }).eq("followed_id", user.id),
    ),
    safeQuery("follows_following", () =>
      supabase.from("follows").select("follower_id", { count: "exact", head: true }).eq("follower_id", user.id),
    ),
  ]);

  const activity: ProfileActivity[] = [
    ...((posts.data ?? []) as Array<{ id: unknown; content?: unknown; image_url?: unknown; video_url?: unknown; created_at?: unknown }>).map((item) => ({
      id: String(item.id),
      kind: "post" as const,
      title: "Post",
      text: text(item.content),
      mediaUrl: text(item.video_url) || text(item.image_url) || null,
      createdAt: String(item.created_at ?? new Date().toISOString()),
    })),
    ...((shorts.data ?? []) as Array<{ id: unknown; video_url?: unknown; like_count?: unknown; created_at?: unknown }>).map((item) => ({
      id: String(item.id),
      kind: "short" as const,
      title: "Short video",
      text: "",
      mediaUrl: text(item.video_url) || null,
      createdAt: String(item.created_at ?? new Date().toISOString()),
      engagement: Number(item.like_count ?? 0),
    })),
  ].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return {
    id: user.id,
    freshId: `FRESH-${user.id.slice(0, 8).toUpperCase()}`,
    username: (user.username || "").trim(),
    displayName: (user.fullName || user.username || "Fresh user").trim(),
    email: user.email,
    avatar: text(details.avatar_url) || text(user.avatar) || text(identity.avatar_url),
    coverPhoto: text(details.cover_url) || text(user.bannerImage) || text(identity.cover_url),
    bio: text(details.bio) || text(user.bio) || text(identity.bio),
    location: text(details.location) || text(user.location) || text(identity.location),
    website: text(details.website_url) || text(user.websiteUrl) || text(identity.website_url),
    verified: Boolean(user.verified),
    joinedAt: user.createdAt || new Date().toISOString(),
    languages: stringList(identity.languages),
    interests: stringList(identity.interests),
    skills: stringList(identity.skills),
    education: text(identity.education),
    workInterests: stringList(identity.work_interests),
    achievements: stringList(identity.achievements),
    occupation: text(details.occupation) || text(identity.occupation),
    company: text(details.company) || text(identity.company),
    pronouns: text(details.pronouns) || text(identity.pronouns),
    followerCount: followers.count || user.stats?.followerCount || 0,
    followingCount: following.count || user.stats?.followingCount || 0,
    postCount: posts.count || user.stats?.postCount || 0,
    shortCount: shorts.count || 0,
    reputationScore: user.stats?.reputationScore ?? 0,
    connections: connectionsOf(user),
    activity,
    visibility: visibilityOf(identity),
  };
}

export async function saveRealProfileVisibility(
  userId: string,
  currentIdentity: unknown,
  visibility: ProfileVisibility,
) {
  const identity = currentIdentity && typeof currentIdentity === "object" ? (currentIdentity as Identity) : {};
  const { error } = await supabase
    .from("users")
    .update({ identity: { ...identity, profile_visibility: visibility } })
    .eq("id", userId);
  if (error) throw error;
}

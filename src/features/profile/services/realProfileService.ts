import { supabase } from "../../../lib/supabase";
import type { FreshUser } from "../../fresh-id/types/user";
import type { ProfileActivity, ProfileConnection, ProfileVisibility, UniversalProfile } from "../types/profile";

type Identity = Record<string, unknown>;

const text = (value: unknown) => typeof value === "string" ? value : "";
const identityOf = (user: FreshUser): Identity => user.identity && typeof user.identity === "object" ? user.identity as Identity : {};

function visibilityOf(identity: Identity): ProfileVisibility {
  const value = identity.profile_visibility;
  if (!value || typeof value !== "object") return { public: true, connections: true, private: true };
  const v = value as Record<string, unknown>;
  return { public: v.public !== false, connections: v.connections !== false, private: v.private !== false };
}

function connectionsOf(user: FreshUser): ProfileConnection[] {
  return (user.linkedAccounts ?? []).map((account) => ({
    provider: text(account.provider) || "connected account",
    handle: text(account.providerId),
    connected: true,
  }));
}

export async function loadRealUniversalProfile(user: FreshUser): Promise<UniversalProfile> {
  const identity = identityOf(user);
  const detailsResult = await supabase.from("profile_details").select("bio, avatar_url, cover_url, location, website_url, occupation, company, pronouns").eq("user_id", user.id).maybeSingle();
  const details = detailsResult.data ?? {};

  const [posts, shorts, followers, following] = await Promise.all([
    supabase.from("posts").select("id, content, image_url, video_url, created_at").eq("author_id", user.id).order("created_at", { ascending: false }).limit(50),
    supabase.from("shorts").select("id, video_url, like_count, created_at").eq("author_id", user.id).order("created_at", { ascending: false }).limit(50),
    supabase.from("follows").select("id", { count: "exact", head: true }).eq("followed_id", user.id),
    supabase.from("follows").select("id", { count: "exact", head: true }).eq("follower_id", user.id),
  ]);

  const activity: ProfileActivity[] = [
    ...(posts.data ?? []).map((item) => ({ id: String(item.id), kind: "post" as const, title: "Post", text: text(item.content), mediaUrl: text(item.video_url) || text(item.image_url) || null, createdAt: String(item.created_at) })),
    ...(shorts.data ?? []).map((item) => ({ id: String(item.id), kind: "short" as const, title: "Short video", text: "", mediaUrl: text(item.video_url) || null, createdAt: String(item.created_at), engagement: Number(item.like_count ?? 0) })),
  ].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return {
    id: user.id,
    freshId: `FRESH-${user.id.slice(0, 8).toUpperCase()}`,
    username: user.username,
    displayName: user.fullName,
    email: user.email,
    avatar: text(details.avatar_url) || text(user.avatar) || text(identity.avatar_url),
    coverPhoto: text(details.cover_url) || text(user.bannerImage) || text(identity.cover_url),
    bio: text(details.bio) || text(user.bio) || text(identity.bio),
    location: text(details.location) || text(user.location) || text(identity.location),
    website: text(details.website_url) || text(user.websiteUrl) || text(identity.website_url),
    verified: user.verified,
    joinedAt: user.createdAt,
    languages: Array.isArray(identity.languages) ? identity.languages.map(String) : [],
    interests: Array.isArray(identity.interests) ? identity.interests.map(String) : [],
    skills: Array.isArray(identity.skills) ? identity.skills.map(String) : [],
    occupation: text(details.occupation) || text(identity.occupation),
    company: text(details.company) || text(identity.company),
    pronouns: text(details.pronouns) || text(identity.pronouns),
    followerCount: followers.count ?? user.stats.followerCount ?? 0,
    followingCount: following.count ?? user.stats.followingCount ?? 0,
    postCount: posts.data?.length ?? user.stats.postCount ?? 0,
    shortCount: shorts.data?.length ?? 0,
    reputationScore: user.stats.reputationScore ?? 0,
    connections: connectionsOf(user),
    activity,
    visibility: visibilityOf(identity),
  };
}

export async function saveRealProfileVisibility(userId: string, currentIdentity: unknown, visibility: ProfileVisibility) {
  const identity = currentIdentity && typeof currentIdentity === "object" ? currentIdentity as Identity : {};
  const { error } = await supabase.from("users").update({ identity: { ...identity, profile_visibility: visibility } }).eq("id", userId);
  if (error) throw error;
}

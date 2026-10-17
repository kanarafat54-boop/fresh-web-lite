/**
 * Fresh Platform Engine
 *
 * The first production-grade vertical slice for Fresh ID, Fresh Protofile,
 * and Fresh Flow. It intentionally builds on the existing canonical tables
 * instead of introducing a second profile/content system.
 */

import { supabase } from "../../lib/supabase";

export type FreshAudience = "public" | "connections" | "private";

export type FreshProtofile = {
  identity: {
    id: string;
    username: string;
    fullName: string;
    verified: boolean;
    headline: string | null;
    bio: string | null;
    avatarUrl: string | null;
    coverImageUrl: string | null;
    location: string | null;
    occupation: string | null;
    company: string | null;
    websiteUrl: string | null;
  };
  professional: {
    projects: Array<Record<string, unknown>>;
    portfolio: Array<Record<string, unknown>>;
    links: Array<Record<string, unknown>>;
  };
  reputation: {
    score: number;
    verified: boolean;
    signals: string[];
  };
  privacy: {
    audience: FreshAudience;
    analyticsVisible: boolean;
    activityVisible: boolean;
  };
  generatedAt: string;
};

export type FreshFlowItem = {
  id: string;
  kind: "post" | "short";
  authorId: string;
  text: string;
  mediaUrl: string | null;
  createdAt: string;
  engagement: {
    likes: number;
    comments: number;
    views: number;
    reposts: number;
  };
  score: number;
  reasons: string[];
};

export type FreshFlow = {
  items: FreshFlowItem[];
  generatedAt: string;
  cursor: string | null;
};

type Row = Record<string, unknown>;

function numberValue(value: unknown): number {
  const number = Number(value ?? 0);
  return Number.isFinite(number) ? number : 0;
}

function stringValue(value: unknown): string | null {
  return value == null ? null : String(value);
}

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(max, Math.max(min, value));
}

function recencyScore(createdAt: string): number {
  const ageHours = Math.max(0, (Date.now() - Date.parse(createdAt)) / 3_600_000);
  return Math.exp(-ageHours / 72);
}

function engagementScore(likes: number, comments: number, views: number, reposts: number): number {
  const weighted = likes + comments * 2 + reposts * 3 + Math.min(views, 10_000) / 100;
  return clamp(Math.log1p(weighted) / 10);
}

function reputationFromUser(user: Row): FreshProtofile["reputation"] {
  const stats = (user.stats ?? {}) as Row;
  const score = clamp(numberValue(stats.reputationScore) / 100, 0, 1);
  const verified = Boolean(user.verified);
  const signals: string[] = [];
  if (verified) signals.push("identity-verified");
  if (numberValue(stats.followerCount) > 0) signals.push("community-presence");
  if (numberValue(stats.postCount) > 0) signals.push("creator-history");
  return { score, verified, signals };
}

/**
 * Fresh ID + Protofile read model.
 *
 * Visibility is evaluated before profile sections are returned. This keeps
 * privacy enforcement at the domain boundary rather than in individual UI
 * components.
 */
export async function buildFreshProtofile(
  userId: string,
  viewerId?: string,
): Promise<FreshProtofile | null> {
  const [{ data: user, error: userError }, { data: profile, error: profileError }, { data: privacy }] =
    await Promise.all([
      supabase.from("users").select("*").eq("id", userId).maybeSingle(),
      supabase.from("universal_profiles").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("profile_privacy_settings").select("*").eq("user_id", userId).maybeSingle(),
    ]);

  if (userError || profileError || !user) return null;

  const detailsResult = await supabase.from("profile_details").select("*").eq("user_id", userId).maybeSingle();
  const [projectsResult, portfolioResult, linksResult] = await Promise.all([
    supabase.from("profile_projects").select("*").eq("user_id", userId).order("position", { ascending: true }),
    supabase.from("profile_portfolio_items").select("*").eq("user_id", userId).order("position", { ascending: true }),
    supabase.from("profile_links").select("*").eq("user_id", userId).order("position", { ascending: true }),
  ]);

  const audience = (profile?.profile_visibility ?? detailsResult.data?.visibility ?? "public") as FreshAudience;
  let canView = audience === "public" || viewerId === userId;

  if (!canView && viewerId && audience === "connections") {
    const { data: connection } = await supabase
      .from("connection_requests")
      .select("id")
      .or(`and(requester_id.eq.${viewerId},recipient_id.eq.${userId}),and(requester_id.eq.${userId},recipient_id.eq.${viewerId})`)
      .eq("status", "accepted")
      .maybeSingle();
    canView = Boolean(connection);
  }

  if (!canView) return null;

  const details = (detailsResult.data ?? {}) as Row;
  const universal = (profile ?? {}) as Row;
  const identity = (user as Row).identity as Row | undefined;

  return {
    identity: {
      id: String(user.id),
      username: String(user.username ?? ""),
      fullName: String(user.full_name ?? ""),
      verified: Boolean(user.verified),
      headline: stringValue(universal.headline),
      bio: stringValue(universal.bio ?? details.bio),
      avatarUrl: stringValue(details.avatar_url),
      coverImageUrl: stringValue(universal.cover_image_url ?? details.cover_url),
      location: stringValue(details.location ?? identity?.location),
      occupation: stringValue(details.occupation),
      company: stringValue(details.company),
      websiteUrl: stringValue(details.website_url),
    },
    professional: {
      projects: (projectsResult.data ?? []) as Array<Record<string, unknown>>,
      portfolio: (portfolioResult.data ?? []) as Array<Record<string, unknown>>,
      links: (linksResult.data ?? []) as Array<Record<string, unknown>>,
    },
    reputation: reputationFromUser(user as Row),
    privacy: {
      audience,
      analyticsVisible: viewerId === userId || privacy?.analytics_visibility === "public" || privacy?.analytics_visibility === "connections",
      activityVisible: viewerId === userId || privacy?.activity_visibility !== "private",
    },
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Fresh Flow candidate generation + deterministic ranking.
 *
 * This is deliberately a transparent ranking substrate. Future learned or
 * model-based rankers can plug into the same contract without changing the
 * identity/content domain or leaking private data into ranking candidates.
 */
export async function buildFreshFlow(
  viewerId: string,
  options: { limit?: number; mode?: "for-you" | "social" | "learn" | "relax" } = {},
): Promise<FreshFlow> {
  const limit = Math.min(Math.max(options.limit ?? 20, 1), 100);
  const mode = options.mode ?? "for-you";

  const [{ data: follows }, { data: posts }, { data: shorts }] = await Promise.all([
    supabase.from("follows").select("followed_id").eq("follower_id", viewerId),
    supabase.from("posts").select("id,author_id,content,image_url,video_url,like_count,comment_count,created_at").order("created_at", { ascending: false }).limit(Math.min(limit * 4, 400)),
    supabase.from("shorts").select("id,author_id,caption,video_url,like_count,comment_count,view_count,repost_count,created_at,category").order("created_at", { ascending: false }).limit(Math.min(limit * 4, 400)),
  ]);

  const followed = new Set((follows ?? []).map((row) => String((row as Row).followed_id)));
  const candidates: FreshFlowItem[] = [];

  for (const raw of posts ?? []) {
    const row = raw as Row;
    const authorId = stringValue(row.author_id);
    const createdAt = String(row.created_at);
    if (!authorId) continue;
    const social = followed.has(authorId);
    if (mode === "social" && !social) continue;
    const score = recencyScore(createdAt) * 0.55 + engagementScore(numberValue(row.like_count), numberValue(row.comment_count), 0, 0) * 0.35 + (social ? 0.1 : 0);
    candidates.push({
      id: String(row.id),
      kind: "post",
      authorId,
      text: String(row.content ?? ""),
      mediaUrl: stringValue(row.video_url ?? row.image_url),
      createdAt,
      engagement: { likes: numberValue(row.like_count), comments: numberValue(row.comment_count), views: 0, reposts: 0 },
      score,
      reasons: [social ? "from-a-connection" : "fresh-content", "engagement-signal", "recency"],
    });
  }

  for (const raw of shorts ?? []) {
    const row = raw as Row;
    const authorId = stringValue(row.author_id);
    const createdAt = String(row.created_at);
    if (!authorId) continue;
    const social = followed.has(authorId);
    const category = String(row.category ?? "relax");
    if (mode === "social" && !social) continue;
    if (mode === "learn" && category !== "learn") continue;
    if (mode === "relax" && category !== "relax") continue;
    const score = recencyScore(createdAt) * 0.5 + engagementScore(numberValue(row.like_count), numberValue(row.comment_count), numberValue(row.view_count), numberValue(row.repost_count)) * 0.4 + (social ? 0.1 : 0);
    candidates.push({
      id: String(row.id),
      kind: "short",
      authorId: authorId ?? "",
      text: String(row.caption ?? ""),
      mediaUrl: stringValue(row.video_url),
      createdAt,
      engagement: { likes: numberValue(row.like_count), comments: numberValue(row.comment_count), views: numberValue(row.view_count), reposts: numberValue(row.repost_count) },
      score,
      reasons: [social ? "from-a-connection" : "discovered", category === "learn" ? "learning-signal" : "media-signal", "recency"],
    });
  }

  candidates.sort((a, b) => b.score - a.score || Date.parse(b.createdAt) - Date.parse(a.createdAt));

  return {
    items: candidates.slice(0, limit),
    generatedAt: new Date().toISOString(),
    cursor: candidates.length > limit ? candidates[limit - 1]?.id ?? null : null,
  };
}

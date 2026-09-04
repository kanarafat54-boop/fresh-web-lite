import { supabase } from "../../../lib/supabase";
import { runIntelligence, type IntelligenceResponse } from "../../ai/intelligence";

export type VideoResult = {
  id: string;
  authorName: string;
  caption: string;
  videoUrl: string;
  likeCount: number;
};

export type PostResult = {
  id: string;
  authorName: string;
  content: string;
  imageUrl: string | null;
  likeCount: number;
};

export type PersonResult = {
  id: string;
  username: string;
  fullName: string;
};

export type TopicResult = {
  tag: string;
  sampleCaption: string;
  sourceId: string;
  sourceKind: "video" | "post";
};

async function namesFor(authorIds: string[]): Promise<Map<string, string>> {
  if (authorIds.length === 0) return new Map();
  const { data } = await supabase.from("users").select("id, full_name, username").in("id", authorIds);
  return new Map((data ?? []).map((row: any) => [row.id, row.full_name?.trim() || row.username || "Unknown"]));
}

export async function searchVideos(query: string, limit = 20): Promise<VideoResult[]> {
  const { data, error } = await supabase
    .from("shorts")
    .select("id, author_id, caption, sound_name, video_url, like_count")
    .or(`caption.ilike.%${query}%,sound_name.ilike.%${query}%`)
    .order("like_count", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  const rows = data ?? [];
  const names = await namesFor([...new Set(rows.map((r: any) => r.author_id))]);
  return rows.map((r: any) => ({
    id: r.id,
    authorName: names.get(r.author_id) ?? "Unknown",
    caption: r.caption ?? "",
    videoUrl: r.video_url,
    likeCount: r.like_count ?? 0,
  }));
}

export async function searchPosts(query: string, limit = 20): Promise<PostResult[]> {
  const { data, error } = await supabase
    .from("posts")
    .select("id, author_id, content, image_url, like_count")
    .ilike("content", `%${query}%`)
    .order("like_count", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  const rows = data ?? [];
  const names = await namesFor([...new Set(rows.map((r: any) => r.author_id))]);
  return rows.map((r: any) => ({
    id: r.id,
    authorName: names.get(r.author_id) ?? "Unknown",
    content: r.content ?? "",
    imageUrl: r.image_url,
    likeCount: r.like_count ?? 0,
  }));
}

/**
 * There is no distinct "news" content model on the platform yet -- News/Posts
 * already share the same posts table (see FreshFlowNewsPosts, which just
 * wraps FeedModule). Rather than fabricate a fake distinction, News search
 * honestly reuses the same real posts data as Posts search.
 */
export async function searchNews(query: string, limit = 20): Promise<PostResult[]> {
  return searchPosts(query, limit);
}

export async function searchWebInfo(query: string): Promise<IntelligenceResponse> {
  return runIntelligence({
    prompt: query,
    query,
    task: "research",
    researchMode: "global",
    maxSources: 8,
  });
}

export async function searchPeople(query: string, limit = 20): Promise<PersonResult[]> {
  const { data, error } = await supabase
    .from("users")
    .select("id, username, full_name")
    .or(`username.ilike.%${query}%,full_name.ilike.%${query}%`)
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r: any) => ({ id: r.id, username: r.username ?? "", fullName: r.full_name?.trim() ?? "" }));
}

/**
 * Real, not fabricated: matches the query against actual captions/post
 * content as a hashtag or plain term, across both Shorts and Posts. There is
 * no trending-topics/engagement-ranking system for hashtags yet, so this is
 * a straightforward text match, not a popularity-ranked "trending" list.
 */
export async function searchTopics(query: string, limit = 15): Promise<TopicResult[]> {
  const tag = query.trim().replace(/^#/, "");
  if (!tag) return [];

  const [{ data: shortsData }, { data: postsData }] = await Promise.all([
    supabase.from("shorts").select("id, caption").ilike("caption", `%${tag}%`).limit(limit),
    supabase.from("posts").select("id, content").ilike("content", `%${tag}%`).limit(limit),
  ]);

  const results: TopicResult[] = [
    ...(shortsData ?? []).map((r: any) => ({ tag, sampleCaption: r.caption ?? "", sourceId: r.id, sourceKind: "video" as const })),
    ...(postsData ?? []).map((r: any) => ({ tag, sampleCaption: r.content ?? "", sourceId: r.id, sourceKind: "post" as const })),
  ];
  return results.slice(0, limit);
}

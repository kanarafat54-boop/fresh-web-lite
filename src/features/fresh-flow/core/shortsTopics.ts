import { supabase } from "../../../lib/supabase";
export { splitCaption, type CaptionSegment } from "./shortsCaption.js";

export type TopicKind = "hashtag" | "sound";
export type TopicShort = { id: string; caption: string; videoUrl: string; viewCount: number; createdAt: string };

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

/** Real Shorts for a hashtag (caption contains it) or a sound (same sound_name). No invented results. */
export async function loadTopicShorts(kind: TopicKind, value: string, limit = 60): Promise<TopicShort[]> {
  let query = supabase.from("shorts").select("id, caption, video_url, view_count, created_at").order("view_count", { ascending: false }).limit(limit);
  query = kind === "sound" ? query.eq("sound_name", value) : query.ilike("caption", `%#${escapeLike(value)}%`);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  const tagBoundary = new RegExp(`#${value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\p{L}\\p{N}_])`, "iu");
  return ((data ?? []) as any[])
    .filter((row) => kind === "sound" || tagBoundary.test(row.caption ?? ""))
    .map((row) => ({ id: row.id, caption: row.caption ?? "", videoUrl: row.video_url, viewCount: Number(row.view_count) || 0, createdAt: row.created_at }));
}

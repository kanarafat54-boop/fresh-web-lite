import { supabase } from "../../../lib/supabase";
import { SAMPLE_LIMIT, summarizeSound, type SoundSummary } from "./shortsSound";
export { splitCaption, type CaptionSegment } from "./shortsCaption.js";

export type TopicKind = "hashtag" | "sound";
export type TopicShort = { id: string; authorId: string; caption: string; videoUrl: string; viewCount: number; createdAt: string };

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

/** Real Shorts for a hashtag (caption contains it) or a sound (same sound_name). No invented results. */
export async function loadTopicShorts(kind: TopicKind, value: string, limit = 60): Promise<TopicShort[]> {
  let query = supabase.from("shorts").select("id, author_id, caption, video_url, view_count, created_at").order("view_count", { ascending: false }).limit(limit);
  query = kind === "sound" ? query.eq("sound_name", value) : query.ilike("caption", `%#${escapeLike(value)}%`);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  const tagBoundary = new RegExp(`#${value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\p{L}\\p{N}_])`, "iu");
  return ((data ?? []) as any[])
    .filter((row) => kind === "sound" || tagBoundary.test(row.caption ?? ""))
    .map((row) => ({ id: row.id, authorId: row.author_id, caption: row.caption ?? "", videoUrl: row.video_url, viewCount: Number(row.view_count) || 0, createdAt: row.created_at }));
}

export type SoundOverview = SoundSummary & { firstUseCreator: string | null };

/** Exact usage count plus creators and first use for a sound. Throws on a read error. */
export async function loadSoundOverview(soundName: string): Promise<SoundOverview> {
  const counted = await supabase.from("shorts").select("id", { count: "exact", head: true }).eq("sound_name", soundName);
  if (counted.error) throw new Error(counted.error.message);
  const sample = await supabase.from("shorts").select("id, author_id, created_at").eq("sound_name", soundName).order("created_at", { ascending: true }).limit(SAMPLE_LIMIT);
  if (sample.error) throw new Error(sample.error.message);
  const summary = summarizeSound((sample.data ?? []) as Array<{ id: string; author_id: string; created_at: string }>, counted.count ?? 0);
  let firstUseCreator: string | null = null;
  if (summary.firstUse) {
    const { data } = await supabase.from("user_public_profiles").select("username, full_name").eq("id", summary.firstUse.authorId).maybeSingle();
    if (data) firstUseCreator = data.username ? `@${data.username}` : data.full_name || null;
  }
  return { ...summary, firstUseCreator };
}

/** Whether this creator lets others reuse their sounds. Defaults to allowed when the setting is not available yet. */
export async function loadSoundReuseAllowed(creatorId: string): Promise<boolean> {
  const { data, error } = await supabase.rpc("short_sound_reuse_allowed", { p_creator: creatorId });
  if (error || typeof data !== "boolean") return true;
  return data;
}

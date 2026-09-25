import { supabase } from "../../../lib/supabase";

export type PublishShortInput = {
  authorId: string;
  caption: string;
  videoUrl: string;
  soundName?: string | null;
  category?: "learn" | "relax" | null;
  remixOfShortId?: string | null;
  duetOfShortId?: string | null;
};

export type PublishShortResult = {
  id: string;
  author_id: string;
  caption: string;
  video_url: string;
  created_at: string;
};

/**
 * Canonical write path for Fresh Flow Shorts.
 * Feed reads from the same `shorts` table via loadFreshFlowShorts.
 */
export async function publishFreshShort(input: PublishShortInput): Promise<PublishShortResult> {
  const caption = input.caption.trim();
  const videoUrl = input.videoUrl?.trim();
  if (!input.authorId) throw new Error("Sign in with Fresh ID to publish a Short.");
  if (!videoUrl) throw new Error("A Short requires a video.");

  const row: Record<string, unknown> = {
    author_id: input.authorId,
    caption,
    video_url: videoUrl,
    sound_name: input.soundName ?? null,
  };
  if (input.category) row.category = input.category;
  if (input.remixOfShortId) row.remix_of_short_id = input.remixOfShortId;
  if (input.duetOfShortId) row.duet_of_short_id = input.duetOfShortId;

  const { data, error } = await supabase
    .from("shorts")
    .insert(row)
    .select("id, author_id, caption, video_url, created_at")
    .single();

  if (error) throw new Error(error.message || "Could not publish Short.");
  if (!data?.id) throw new Error("Publish succeeded but no Short id was returned.");
  return data as PublishShortResult;
}

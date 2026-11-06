import { supabase } from "../../../lib/supabase";
import { readVideoDuration } from "../../fresh-flow/core/readVideoDuration";
import { isMissingColumnError, normalizeDuration, normalizeLanguage } from "../../fresh-flow/core/shortsDuration";

export type PublishShortInput = {
  authorId: string;
  caption: string;
  videoUrl: string;
  soundName?: string | null;
  category?: "learn" | "relax" | null;
  remixOfShortId?: string | null;
  duetOfShortId?: string | null;
  /** Seconds. When omitted it is read from the video; null means unknown. */
  durationSeconds?: number | null;
  /** Language code. When omitted it is taken from the device language. */
  language?: string | null;
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

  const durationSeconds = input.durationSeconds !== undefined ? normalizeDuration(input.durationSeconds) : await readVideoDuration(videoUrl);
  const language = normalizeLanguage(input.language ?? (typeof navigator !== "undefined" ? navigator.language : null));
  const withMetadata: Record<string, unknown> = { ...row };
  if (durationSeconds !== null) withMetadata.duration_seconds = durationSeconds;
  if (language) withMetadata.language = language;

  const hasMetadata = durationSeconds !== null || Boolean(language);
  const insert = (values: Record<string, unknown>) => supabase.from("shorts").insert(values).select("id, author_id, caption, video_url, created_at").single();
  let { data, error } = await insert(withMetadata);
  // Duration and language columns arrive with a migration; publishing must work before and after it.
  if (error && hasMetadata && isMissingColumnError(error)) ({ data, error } = await insert(row));

  if (error) throw new Error(error.message || "Could not publish Short.");
  if (!data?.id) throw new Error("Publish succeeded but no Short id was returned.");
  return data as PublishShortResult;
}

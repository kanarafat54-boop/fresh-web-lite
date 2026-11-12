import { supabase } from "../../../lib/supabase";
import { readVideoDuration } from "../../fresh-flow/core/readVideoDuration";
import { isMissingColumnError, normalizeDuration, normalizeLanguage } from "../../fresh-flow/core/shortsDuration";

export type PublishShortInput = {
  authorId: string;
  caption: string;
  videoUrl: string;
  soundName?: string | null;
  /** The Short this sound was taken from. Needs the Fresh sound-reuse database update; publishing works without it. */
  soundSourceShortId?: string | null;
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
  if (input.soundSourceShortId) row.sound_source_short_id = input.soundSourceShortId;
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
  // Columns arrive with migrations; publishing must work before and after each. Drop the newest optional columns first.
  const withoutSource = (values: Record<string, unknown>) => { const copy = { ...values }; delete copy.sound_source_short_id; return copy; };
  const attempts: Array<Record<string, unknown>> = [withMetadata];
  if (input.soundSourceShortId) attempts.push(withoutSource(withMetadata));
  if (hasMetadata) attempts.push(withoutSource(row));
  let { data, error } = await insert(attempts[0]);
  for (let i = 1; error && isMissingColumnError(error) && i < attempts.length; i += 1) ({ data, error } = await insert(attempts[i]));

  if (error) throw new Error(error.message || "Could not publish Short.");
  if (!data?.id) throw new Error("Publish succeeded but no Short id was returned.");
  return data as PublishShortResult;
}

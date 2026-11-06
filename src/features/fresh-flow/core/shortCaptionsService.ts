import { supabase } from "../../../lib/supabase";
import { normalizeCues, type CaptionCue, type CaptionTrack } from "./shortsCaptions";

/** Ready captions for one Short. Row level security already limits this to ready captions or the creator's own. */
export async function loadCaptionTracks(shortId: string): Promise<CaptionTrack[]> {
  const { data, error } = await supabase
    .from("short_captions")
    .select("language, segments")
    .eq("short_id", shortId)
    .eq("status", "ready");
  if (error) throw error;
  return (data ?? [])
    .map((row: { language: string; segments: unknown }) => ({ language: String(row.language || "en"), cues: normalizeCues(row.segments) }))
    .filter((track) => track.cues.length > 0);
}

/** Stores a creator-uploaded caption track for their own Short (replaces the track in that language). */
export async function saveCreatorCaptions(input: { shortId: string; userId: string; language: string; cues: CaptionCue[] }): Promise<void> {
  const language = (input.language || "en").toLowerCase().slice(0, 12);
  const { error } = await supabase.from("short_captions").upsert(
    {
      short_id: input.shortId,
      language,
      source: "creator-uploaded",
      status: "ready",
      segments: input.cues,
      error_message: null,
      created_by: input.userId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "short_id,language" },
  );
  if (error) throw error;
}

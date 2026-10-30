import { supabase } from "../../../lib/supabase";
import { buildTasteProfile, EVENT_REWARD, type TasteProfile, type WatchEvent } from "../../shorts/core/PersonalRanking";
import type { Short } from "../../shorts/types/short";

const EVENT_LIMIT = 400;
const WINDOW_DAYS = 45;

/**
 * Builds the signed-in user's taste profile from their OWN `fresh_flow_events`
 * (owner-only RLS) and the public fields of the Shorts they touched. Returns an
 * empty profile on any failure so ranking falls back to the baseline signals.
 */
export async function loadTasteProfile(userId: string): Promise<TasteProfile> {
  const empty = buildTasteProfile([], new Map());
  try {
    const since = new Date(Date.now() - WINDOW_DAYS * 86_400_000).toISOString();
    const { data: rows, error } = await supabase
      .from("fresh_flow_events")
      .select("media_id, event_type, created_at")
      .eq("actor_id", userId)
      .eq("world", "short")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(EVENT_LIMIT);
    if (error || !rows?.length) return empty;
    const events: WatchEvent[] = (rows as any[])
      .filter((row) => row.event_type in EVENT_REWARD)
      .map((row) => ({ mediaId: String(row.media_id), event: String(row.event_type), at: new Date(row.created_at).getTime() }));
    const ids = [...new Set(events.map((event) => event.mediaId))].slice(0, 200);
    if (ids.length === 0) return empty;
    const { data: shortRows } = await supabase.from("shorts").select("id, author_id, caption, sound_name").in("id", ids);
    const catalog = new Map<string, Short>();
    for (const row of (shortRows ?? []) as any[]) {
      catalog.set(row.id, { id: row.id, authorId: row.author_id, caption: row.caption ?? "", soundName: row.sound_name ?? null } as Short);
    }
    return buildTasteProfile(events, catalog);
  } catch {
    return empty;
  }
}

import { supabase } from "../../../lib/supabase";
import { buildHistory, type HistoryEntry } from "./shortsHistory";

export type HistoryItem = HistoryEntry & { caption: string | null; creator: string | null; available: boolean };

const EVENT_LIMIT = 600;
const ITEM_LIMIT = 100;

/** The viewer's own watched Shorts, newest first. Throws on a read error so the screen can say so. */
export async function loadWatchHistory(userId: string): Promise<HistoryItem[]> {
  const { data, error } = await supabase
    .from("fresh_flow_events")
    .select("media_id, event_type, created_at")
    .eq("actor_id", userId)
    .eq("world", "short")
    .in("event_type", ["play_25", "play_50", "play_75", "complete"])
    .order("created_at", { ascending: false })
    .limit(EVENT_LIMIT);
  if (error) throw new Error(error.message);
  const entries = buildHistory((data ?? []) as Array<{ media_id: string; event_type: string; created_at: string }>).slice(0, ITEM_LIMIT);
  if (entries.length === 0) return [];
  const ids = entries.map((entry) => entry.mediaId);
  const { data: shortRows } = await supabase.from("shorts").select("id, author_id, caption").in("id", ids);
  const shorts = new Map(((shortRows ?? []) as Array<{ id: string; author_id: string; caption: string | null }>).map((row) => [row.id, row]));
  const authorIds = [...new Set([...shorts.values()].map((row) => row.author_id))];
  const names = new Map<string, string>();
  if (authorIds.length) {
    const { data: profiles } = await supabase.from("user_public_profiles").select("id, username, full_name").in("id", authorIds);
    for (const p of (profiles ?? []) as Array<{ id: string; username: string | null; full_name: string | null }>) names.set(p.id, p.username ? `@${p.username}` : p.full_name || "Creator");
  }
  return entries.map((entry) => {
    const row = shorts.get(entry.mediaId);
    return { ...entry, caption: row?.caption ?? null, creator: row ? names.get(row.author_id) ?? "Creator" : null, available: Boolean(row) };
  });
}

/** Deletes the viewer's own watch events for one Short. Returns false on failure. */
export async function removeFromHistory(userId: string, mediaId: string): Promise<boolean> {
  const { error } = await supabase.from("fresh_flow_events").delete().eq("actor_id", userId).eq("world", "short").eq("media_id", mediaId);
  return !error;
}

/** Deletes all of the viewer's own Shorts events. Returns false on failure. */
export async function clearWatchHistory(userId: string): Promise<boolean> {
  const { error } = await supabase.from("fresh_flow_events").delete().eq("actor_id", userId).eq("world", "short");
  return !error;
}

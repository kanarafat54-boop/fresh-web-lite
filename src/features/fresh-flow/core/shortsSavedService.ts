import { supabase } from "../../../lib/supabase";
import { buildSavedItems, type SavedItem, type SavedRow, type SavedShortInfo } from "./shortsSaved";

const SAVED_LIMIT = 200;

/** The viewer's own saved Shorts, newest saved first. Throws on a read error so the screen can say so. */
export async function loadSavedShorts(userId: string): Promise<SavedItem[]> {
  const { data, error } = await supabase.from("saved_shorts").select("short_id, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(SAVED_LIMIT);
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as SavedRow[];
  if (rows.length === 0) return [];
  const { data: shortRows } = await supabase.from("shorts").select("id, author_id, caption").in("id", rows.map((row) => row.short_id));
  const shorts = new Map(((shortRows ?? []) as SavedShortInfo[]).map((row) => [row.id, row]));
  const authorIds = [...new Set([...shorts.values()].map((row) => row.author_id))];
  const names = new Map<string, string>();
  if (authorIds.length) {
    const { data: profiles } = await supabase.from("user_public_profiles").select("id, username, full_name").in("id", authorIds);
    for (const p of (profiles ?? []) as Array<{ id: string; username: string | null; full_name: string | null }>) names.set(p.id, p.username ? `@${p.username}` : p.full_name || "Creator");
  }
  return buildSavedItems(rows, shorts, names);
}

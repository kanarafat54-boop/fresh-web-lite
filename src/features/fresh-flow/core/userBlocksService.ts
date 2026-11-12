import { supabase } from "../../../lib/supabase";
import { isBlocksUnavailable, sortBlocked, toBlockedSet, type BlockOutcome, type BlockedAccount } from "./userBlocks";

/** Ids the viewer has blocked. Quietly empty on any error so feeds and comments keep working. */
export async function loadBlockedIds(userId: string): Promise<Set<string>> {
  const { data, error } = await supabase.from("user_blocks").select("blocked_id").eq("blocker_id", userId);
  if (error) return new Set();
  return toBlockedSet((data ?? []) as Array<{ blocked_id?: unknown }>);
}

/** The viewer's blocked accounts with names, newest first. `available` is false until the migration is applied. */
export async function loadBlockedAccounts(userId: string): Promise<{ accounts: BlockedAccount[]; available: boolean }> {
  const { data, error } = await supabase.from("user_blocks").select("blocked_id, created_at").eq("blocker_id", userId).order("created_at", { ascending: false }).limit(500);
  if (error) {
    if (isBlocksUnavailable(error)) return { accounts: [], available: false };
    throw new Error(error.message);
  }
  const rows = (data ?? []) as Array<{ blocked_id: string; created_at: string }>;
  const names = new Map<string, string>();
  if (rows.length) {
    const { data: profiles } = await supabase.from("user_public_profiles").select("id, username, full_name").in("id", rows.map((row) => row.blocked_id));
    for (const p of (profiles ?? []) as Array<{ id: string; username: string | null; full_name: string | null }>) names.set(p.id, p.username ? `@${p.username}` : p.full_name || "Account");
  }
  return { accounts: sortBlocked(rows.map((row) => ({ id: row.blocked_id, name: names.get(row.blocked_id) ?? "Account", blockedAt: row.created_at }))), available: true };
}

export async function blockAccount(userId: string, targetId: string): Promise<BlockOutcome> {
  if (!targetId || targetId === userId) return "failed";
  const { error } = await supabase.from("user_blocks").insert({ blocker_id: userId, blocked_id: targetId });
  if (!error || error.code === "23505") return "blocked";
  return isBlocksUnavailable(error) ? "unavailable" : "failed";
}

export async function unblockAccount(userId: string, targetId: string): Promise<boolean> {
  const { error } = await supabase.from("user_blocks").delete().eq("blocker_id", userId).eq("blocked_id", targetId);
  return !error;
}

/** Drops accounts that blocked the viewer. If the database function is not there yet, nothing is dropped. */
export async function keepVisibleAuthors<T>(rows: T[], authorOf: (row: T) => string): Promise<T[]> {
  const ids = [...new Set(rows.map(authorOf))];
  if (ids.length === 0) return rows;
  const { data, error } = await supabase.rpc("visible_author_ids", { p_ids: ids });
  if (error || !Array.isArray(data)) return rows;
  const visible = new Set<string>(data as string[]);
  return rows.filter((row) => visible.has(authorOf(row)));
}

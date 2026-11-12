import { supabase } from "../../../lib/supabase";
import { DEFAULT_PRIVACY, isPrivacyUnavailable, settingsFromRow, settingsToRow, type AudienceChoice, type ShortsPrivacySettings } from "./shortsPrivacy";

const LOCAL_KEY = "fresh-shorts-privacy-local";

function readLocal(): ShortsPrivacySettings | null {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    return raw ? settingsFromRow(JSON.parse(raw) as Record<string, unknown>) : null;
  } catch { return null; }
}

function writeLocal(settings: ShortsPrivacySettings, userId: string): void {
  try { localStorage.setItem(LOCAL_KEY, JSON.stringify(settingsToRow(userId, settings))); } catch { /* storage unavailable */ }
}

export type LoadedPrivacy = { settings: ShortsPrivacySettings; /** false until the database tables exist; settings then live on this device only. */ synced: boolean };

export async function loadPrivacy(userId: string): Promise<LoadedPrivacy> {
  const { data, error } = await supabase.from("short_privacy_settings").select("*").eq("user_id", userId).maybeSingle();
  if (error) {
    if (isPrivacyUnavailable(error)) return { settings: readLocal() ?? { ...DEFAULT_PRIVACY }, synced: false };
    throw new Error(error.message);
  }
  return { settings: settingsFromRow(data as Record<string, unknown> | null), synced: true };
}

export async function savePrivacy(userId: string, settings: ShortsPrivacySettings): Promise<{ synced: boolean }> {
  const { error } = await supabase.from("short_privacy_settings").upsert(settingsToRow(userId, settings), { onConflict: "user_id" });
  if (error) {
    if (isPrivacyUnavailable(error)) { writeLocal(settings, userId); return { synced: false }; }
    throw new Error(error.message);
  }
  writeLocal(settings, userId);
  return { synced: true };
}

export type RestrictedAccount = { id: string; name: string; restrictedAt: string };

export async function loadRestricted(userId: string): Promise<{ accounts: RestrictedAccount[]; available: boolean }> {
  const { data, error } = await supabase.from("user_restrictions").select("restricted_id, created_at").eq("restrictor_id", userId).order("created_at", { ascending: false }).limit(500);
  if (error) {
    if (isPrivacyUnavailable(error)) return { accounts: [], available: false };
    throw new Error(error.message);
  }
  const rows = (data ?? []) as Array<{ restricted_id: string; created_at: string }>;
  const names = new Map<string, string>();
  if (rows.length) {
    const { data: profiles } = await supabase.from("user_public_profiles").select("id, username, full_name").in("id", rows.map((row) => row.restricted_id));
    for (const p of (profiles ?? []) as Array<{ id: string; username: string | null; full_name: string | null }>) names.set(p.id, p.username ? `@${p.username}` : p.full_name || "Account");
  }
  return { accounts: rows.map((row) => ({ id: row.restricted_id, name: names.get(row.restricted_id) ?? "Account", restrictedAt: row.created_at })), available: true };
}

export async function restrictAccount(userId: string, targetId: string): Promise<"restricted" | "unavailable" | "failed"> {
  if (!targetId || targetId === userId) return "failed";
  const { error } = await supabase.from("user_restrictions").insert({ restrictor_id: userId, restricted_id: targetId });
  if (!error || error.code === "23505") return "restricted";
  return isPrivacyUnavailable(error) ? "unavailable" : "failed";
}

export async function unrestrictAccount(userId: string, targetId: string): Promise<boolean> {
  const { error } = await supabase.from("user_restrictions").delete().eq("restrictor_id", userId).eq("restricted_id", targetId);
  return !error;
}

/** Creator only. `mode` null returns the Short to the creator's default. */
export async function setShortCommentsMode(shortId: string, mode: AudienceChoice | null): Promise<{ ok: boolean; unavailable: boolean; message?: string }> {
  const { error } = await supabase.rpc("set_short_comments_mode", { p_short_id: shortId, p_mode: mode });
  if (!error) return { ok: true, unavailable: false };
  return { ok: false, unavailable: isPrivacyUnavailable(error), message: error.message };
}

export async function reviewHeldComment(commentId: string, approve: boolean): Promise<{ ok: boolean; unavailable: boolean; message?: string }> {
  const { error } = await supabase.rpc("review_held_comment", { p_comment_id: commentId, p_approve: approve });
  if (!error) return { ok: true, unavailable: false };
  return { ok: false, unavailable: isPrivacyUnavailable(error), message: error.message };
}

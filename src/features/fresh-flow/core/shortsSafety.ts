import { supabase } from "../../../lib/supabase";
export { shortDeepLink, parseShortDeepLink } from "./shortsLinks.js";

/** Reasons a viewer can give when reporting a Short. Stored as-is in `reports.reason`. */
export const SHORT_REPORT_REASONS = [
  { id: "spam", label: "Spam or misleading" },
  { id: "harassment", label: "Harassment or hate" },
  { id: "violence", label: "Violent or dangerous" },
  { id: "sexual", label: "Sexual or inappropriate" },
  { id: "copyright", label: "Copyright or impersonation" },
  { id: "other", label: "Something else" },
] as const;

export type ShortReportReason = (typeof SHORT_REPORT_REASONS)[number]["id"];

/** Files a real report row (owner-insert RLS on `reports`). Throws on failure so the UI never claims success. */
export async function reportShort(userId: string, shortId: string, reason: ShortReportReason): Promise<void> {
  const { error } = await supabase.from("reports").insert({ target_type: "short", target_id: shortId, reporter_id: userId, reason });
  if (error) throw new Error(error.message);
}

function asIdList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

export async function loadMutedCreators(userId: string): Promise<Set<string>> {
  const { data, error } = await supabase.from("fresh_user_preferences").select("muted_creators").eq("user_id", userId).maybeSingle();
  if (error) return new Set();
  return new Set(asIdList(data?.muted_creators));
}

/** Adds or removes a creator in the viewer's own `muted_creators` list. Only touches that column. */
export async function setCreatorMuted(userId: string, authorId: string, muted: boolean): Promise<Set<string>> {
  const current = await loadMutedCreators(userId);
  if (muted) current.add(authorId); else current.delete(authorId);
  const list = [...current];
  const { data: existing } = await supabase.from("fresh_user_preferences").select("user_id").eq("user_id", userId).maybeSingle();
  const { error } = existing
    ? await supabase.from("fresh_user_preferences").update({ muted_creators: list, updated_at: new Date().toISOString() }).eq("user_id", userId)
    : await supabase.from("fresh_user_preferences").insert({ user_id: userId, muted_creators: list });
  if (error) throw new Error(error.message);
  return current;
}

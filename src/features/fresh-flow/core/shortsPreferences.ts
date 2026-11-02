import { supabase } from "../../../lib/supabase";
import { EMPTY_PREFS, type ShortPrefs } from "./shortsPrefsLogic.js";

export * from "./shortsPrefsLogic.js";

const asList = (value: unknown): string[] => (Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []);

export async function loadShortPrefs(userId: string): Promise<ShortPrefs> {
  const { data, error } = await supabase.from("fresh_user_preferences").select("interests, muted_topics, muted_creators, content_settings").eq("user_id", userId).maybeSingle();
  if (error || !data) return { ...EMPTY_PREFS };
  const settings = (data.content_settings ?? {}) as Record<string, unknown>;
  return {
    interests: asList(data.interests),
    mutedTopics: asList(data.muted_topics),
    mutedCreators: asList(data.muted_creators),
    showLessTopics: asList(settings.show_less_topics),
    tasteResetAt: typeof settings.taste_reset_at === "string" ? settings.taste_reset_at : null,
  };
}

/** Saves the viewer's own preferences (owner-only RLS). Merges into content_settings so other settings survive. */
export async function saveShortPrefs(userId: string, prefs: ShortPrefs): Promise<void> {
  const { data: existing } = await supabase.from("fresh_user_preferences").select("user_id, content_settings").eq("user_id", userId).maybeSingle();
  const settings = { ...((existing?.content_settings ?? {}) as Record<string, unknown>), show_less_topics: prefs.showLessTopics, taste_reset_at: prefs.tasteResetAt };
  const row = { interests: prefs.interests, muted_topics: prefs.mutedTopics, muted_creators: prefs.mutedCreators, content_settings: settings, updated_at: new Date().toISOString() };
  const { error } = existing
    ? await supabase.from("fresh_user_preferences").update(row).eq("user_id", userId)
    : await supabase.from("fresh_user_preferences").insert({ user_id: userId, ...row });
  if (error) throw new Error(error.message);
}

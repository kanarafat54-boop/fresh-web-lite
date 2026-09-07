import { supabase } from "../../../lib/supabase";

export type ProfileVisibility = "public" | "connections" | "private";

export type PrivacySettings = {
  analyticsVisibility: ProfileVisibility;
  activityVisibility: ProfileVisibility;
  contactVisibility: ProfileVisibility;
};

const DEFAULTS: PrivacySettings = {
  analyticsVisibility: "private",
  activityVisibility: "public",
  contactVisibility: "connections",
};

export async function getPrivacySettings(userId: string): Promise<PrivacySettings> {
  const { data, error } = await supabase
    .from("profile_privacy_settings")
    .select("analytics_visibility, activity_visibility, contact_visibility")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return DEFAULTS;
  return {
    analyticsVisibility: data.analytics_visibility,
    activityVisibility: data.activity_visibility,
    contactVisibility: data.contact_visibility,
  };
}

export async function upsertPrivacySettings(userId: string, settings: PrivacySettings): Promise<void> {
  const { error } = await supabase.from("profile_privacy_settings").upsert({
    user_id: userId,
    analytics_visibility: settings.analyticsVisibility,
    activity_visibility: settings.activityVisibility,
    contact_visibility: settings.contactVisibility,
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
}

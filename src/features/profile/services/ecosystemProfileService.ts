import { supabase } from "../../../lib/supabase";
import type { EcosystemProfile, EcosystemProfileMode } from "../models/ecosystemProfile";

export const FRESH_FLOW_FEED_MODES: EcosystemProfileMode[] = [
  "for-you",
  "social",
  "learn",
  "relax",
  "others",
  "fresh-picks",
];

function asFeedModes(value: unknown): EcosystemProfileMode[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is EcosystemProfileMode => typeof item === "string") as EcosystemProfileMode[];
}

/** DB key is auth user uuid; pass user.id not the FRESH- display string. */
export async function getEcosystemProfile(
  userId: string,
  ecosystemId: string,
): Promise<EcosystemProfile | null> {
  const { data, error } = await supabase
    .from("ecosystem_profiles")
    .select("id,fresh_id,ecosystem_id,title,description,enabled,level,feed_modes,metadata")
    .eq("fresh_id", userId)
    .eq("ecosystem_id", ecosystemId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    id: data.id,
    freshId: String(data.fresh_id),
    ecosystemId: data.ecosystem_id,
    title: data.title,
    description: data.description,
    enabled: data.enabled,
    level: data.level,
    feedModes: asFeedModes(data.feed_modes),
    metadata: data.metadata ?? {},
  };
}

export async function upsertEcosystemProfile(
  profile: Omit<EcosystemProfile, "id"> & { id?: string },
): Promise<EcosystemProfile> {
  const { data, error } = await supabase
    .from("ecosystem_profiles")
    .upsert(
      {
        ...(profile.id ? { id: profile.id } : {}),
        fresh_id: profile.freshId,
        ecosystem_id: profile.ecosystemId,
        title: profile.title,
        description: profile.description,
        enabled: profile.enabled,
        level: profile.level,
        feed_modes: profile.feedModes,
        metadata: profile.metadata,
      },
      { onConflict: "fresh_id,ecosystem_id" },
    )
    .select("id,fresh_id,ecosystem_id,title,description,enabled,level,feed_modes,metadata")
    .single();

  if (error) throw error;

  return {
    id: data.id,
    freshId: String(data.fresh_id),
    ecosystemId: data.ecosystem_id,
    title: data.title,
    description: data.description,
    enabled: data.enabled,
    level: data.level,
    feedModes: asFeedModes(data.feed_modes),
    metadata: data.metadata ?? {},
  };
}

export async function listMyEcosystemProfiles(userId: string): Promise<EcosystemProfile[]> {
  const { data, error } = await supabase.rpc("ensure_default_ecosystem_profiles");
  if (!error && data) {
    return (data as Array<Record<string, unknown>>).map((row) => ({
      id: String(row.id),
      freshId: String(row.fresh_id),
      ecosystemId: String(row.ecosystem_id),
      title: String(row.title ?? ""),
      description: String(row.description ?? ""),
      enabled: Boolean(row.enabled),
      level: Number(row.level ?? 0),
      feedModes: asFeedModes(row.feed_modes),
      metadata: (row.metadata as Record<string, unknown>) ?? {},
    }));
  }

  const { data: rows, error: selectError } = await supabase
    .from("ecosystem_profiles")
    .select("id,fresh_id,ecosystem_id,title,description,enabled,level,feed_modes,metadata")
    .eq("fresh_id", userId)
    .order("title", { ascending: true });
  if (selectError) throw selectError;
  return (rows ?? []).map((data) => ({
    id: data.id,
    freshId: String(data.fresh_id),
    ecosystemId: data.ecosystem_id,
    title: data.title,
    description: data.description,
    enabled: data.enabled,
    level: data.level,
    feedModes: asFeedModes(data.feed_modes),
    metadata: data.metadata ?? {},
  }));
}

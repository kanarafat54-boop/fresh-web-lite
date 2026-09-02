import { supabase } from "../../../lib/supabase";
import type { EcosystemProfile, EcosystemProfileMode } from "../models/ecosystemProfile";

export const FRESH_FLOW_FEED_MODES: EcosystemProfileMode[] = [
  "for-you",
  "social",
  "learn",
  "relax",
  "others",
];

export async function getEcosystemProfile(
  freshId: string,
  ecosystemId: string,
): Promise<EcosystemProfile | null> {
  const { data, error } = await supabase
    .from("ecosystem_profiles")
    .select("id,fresh_id,ecosystem_id,title,description,enabled,level,feed_modes,metadata")
    .eq("fresh_id", freshId)
    .eq("ecosystem_id", ecosystemId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    id: data.id,
    freshId: data.fresh_id,
    ecosystemId: data.ecosystem_id,
    title: data.title,
    description: data.description,
    enabled: data.enabled,
    level: data.level,
    feedModes: data.feed_modes as EcosystemProfileMode[],
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
    freshId: data.fresh_id,
    ecosystemId: data.ecosystem_id,
    title: data.title,
    description: data.description,
    enabled: data.enabled,
    level: data.level,
    feedModes: data.feed_modes as EcosystemProfileMode[],
    metadata: data.metadata ?? {},
  };
}

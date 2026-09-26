import { supabase } from "../../../lib/supabase";
import type { FreshUser } from "../../fresh-id/types/user";
import type { CrossPlatformIdentity, EcosystemPresence, IdentityConnection } from "../models/crossPlatformIdentity";

const SUPPORTED_SOURCES = new Set(["google", "github", "apple", "discord", "x"]);

/** Display format only — never stored as ecosystem_profiles.fresh_id (that column is uuid = user id). */
export function formatFreshId(userId: string): string {
  return `FRESH-${userId.slice(0, 8).toUpperCase()}`;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export async function loadCrossPlatformIdentity(user: FreshUser): Promise<CrossPlatformIdentity> {
  const displayFreshId = formatFreshId(user.id);

  const connections: IdentityConnection[] = (user.linkedAccounts ?? [])
    .filter((account) => SUPPORTED_SOURCES.has(account.provider))
    .map((account) => ({
      source: account.provider as IdentityConnection["source"],
      externalId: account.providerId,
      connectedAt: account.linkedAt,
      verified: user.verified,
    }));

  // Ensure default sub-profiles exist, then load.
  let ecosystems: EcosystemPresence[] = [];
  try {
    const { data: ensured, error: ensureError } = await supabase.rpc("ensure_default_ecosystem_profiles");
    if (ensureError) {
      const { data, error } = await supabase
        .from("ecosystem_profiles")
        .select("ecosystem_id,title,description,enabled,level,feed_modes,metadata")
        .eq("fresh_id", user.id)
        .order("title", { ascending: true });
      if (error) throw error;
      ecosystems = (data ?? []).map((row) => ({
        ecosystemId: asString(row.ecosystem_id),
        title: asString(row.title),
        description: asString(row.description),
        enabled: Boolean(row.enabled),
        level: Number(row.level ?? 0),
        feedModes: Array.isArray(row.feed_modes) ? row.feed_modes.map(String) : [],
        metadata: asRecord(row.metadata),
      }));
    } else {
      ecosystems = (ensured ?? []).map((row: Record<string, unknown>) => ({
        ecosystemId: asString(row.ecosystem_id),
        title: asString(row.title),
        description: asString(row.description),
        enabled: Boolean(row.enabled),
        level: Number(row.level ?? 0),
        feedModes: Array.isArray(row.feed_modes) ? (row.feed_modes as unknown[]).map(String) : [],
        metadata: asRecord(row.metadata),
      }));
    }
  } catch {
    ecosystems = [];
  }

  const { count: postCount } = await supabase
    .from("posts")
    .select("id", { count: "exact", head: true })
    .eq("author_id", user.id);

  const { count: shortCount } = await supabase
    .from("shorts")
    .select("id", { count: "exact", head: true })
    .eq("author_id", user.id);

  return {
    freshId: displayFreshId,
    userId: user.id,
    connections,
    ecosystems,
    aggregatedActivityCount: (postCount ?? 0) + (shortCount ?? 0),
    generatedAt: new Date().toISOString(),
  };
}

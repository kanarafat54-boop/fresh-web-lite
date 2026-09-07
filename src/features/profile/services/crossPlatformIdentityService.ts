import { supabase } from "../../../lib/supabase";
import type { FreshUser } from "../../fresh-id/types/user";
import type { CrossPlatformIdentity, EcosystemPresence, IdentityConnection } from "../models/crossPlatformIdentity";

const SUPPORTED_SOURCES = new Set(["google", "github", "apple", "discord", "x"]);

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export async function loadCrossPlatformIdentity(user: FreshUser): Promise<CrossPlatformIdentity> {
  const freshId = `FRESH-${user.id.slice(0, 8).toUpperCase()}`;

  const connections: IdentityConnection[] = (user.linkedAccounts ?? [])
    .filter((account) => SUPPORTED_SOURCES.has(account.provider))
    .map((account) => ({
      source: account.provider,
      externalId: account.providerId,
      connectedAt: account.linkedAt,
      verified: user.verified,
    }));

  const { data, error } = await supabase
    .from("ecosystem_profiles")
    .select("ecosystem_id,title,description,enabled,level,feed_modes,metadata")
    .eq("fresh_id", freshId)
    .order("title", { ascending: true });

  if (error) throw error;

  const ecosystems: EcosystemPresence[] = (data ?? []).map((row) => ({
    ecosystemId: asString(row.ecosystem_id),
    title: asString(row.title),
    description: asString(row.description),
    enabled: Boolean(row.enabled),
    level: Number(row.level ?? 0),
    feedModes: Array.isArray(row.feed_modes) ? row.feed_modes.map(String) : [],
    metadata: asRecord(row.metadata),
  }));

  const { count: postCount } = await supabase
    .from("posts")
    .select("id", { count: "exact", head: true })
    .eq("author_id", user.id);

  const { count: shortCount } = await supabase
    .from("shorts")
    .select("id", { count: "exact", head: true })
    .eq("author_id", user.id);

  return {
    freshId,
    userId: user.id,
    connections,
    ecosystems,
    aggregatedActivityCount: (postCount ?? 0) + (shortCount ?? 0),
    generatedAt: new Date().toISOString(),
  };
}

import { supabase } from "../../lib/supabase";

export type FreshGoal = "discover" | "learn" | "create" | "communicate" | "work" | "shop" | "relax";

export type FreshContext = {
  userId: string;
  goal?: FreshGoal | null;
  world?: string | null;
  context?: Record<string, unknown>;
};

export async function upsertFreshPreferences(userId: string, patch: Record<string, unknown>) {
  const { data: current } = await supabase.from("fresh_user_preferences").select("interests, muted_topics, muted_creators, language, content_settings").eq("user_id", userId).maybeSingle();
  const next = { ...(current ?? {}), ...patch };
  const { error } = await supabase.from("fresh_user_preferences").upsert({ user_id: userId, ...next, updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
}

export async function saveFreshContext(input: FreshContext) {
  const { data, error } = await supabase.from("fresh_context_sessions").insert({
    user_id: input.userId,
    goal: input.goal ?? null,
    world: input.world ?? null,
    context: input.context ?? {},
  }).select("id").single();
  if (error) throw new Error(error.message);
  return data.id as string;
}

export async function saveFreshMemory(userId: string, kind: string, content: string, consented = false, metadata: Record<string, unknown> = {}) {
  if (!consented) throw new Error("Explicit memory consent is required.");
  const { data, error } = await supabase.from("fresh_memories").insert({ user_id: userId, kind, content, consented, metadata }).select("id").single();
  if (error) throw new Error(error.message);
  return data.id as string;
}

export async function deleteFreshMemory(userId: string, memoryId: string) {
  const { error } = await supabase.from("fresh_memories").delete().eq("id", memoryId).eq("user_id", userId);
  if (error) throw new Error(error.message);
}

export async function recordFreshFlowEvents(records: Array<{
  actorId: string;
  mediaId: string;
  world: string;
  event: string;
  sessionId: string;
  positionMs?: number;
  durationMs?: number;
}>) {
  if (!records.length) return;
  const rows = records.slice(-40).map((r) => ({
    actor_id: r.actorId,
    media_id: r.mediaId,
    world: r.world,
    event_type: r.event,
    session_id: r.sessionId,
    position_ms: r.positionMs ?? null,
    duration_ms: r.durationMs ?? null,
  }));
  const { error } = await supabase.from("fresh_flow_events").insert(rows);
  if (error) throw new Error(error.message);
}

export async function createMediaAsset(input: {
  ownerId: string;
  sourceUrl?: string | null;
  posterUrl?: string | null;
  kind: string;
  metadata?: Record<string, unknown>;
}) {
  const { data, error } = await supabase.from("fresh_media_assets").insert({
    owner_id: input.ownerId,
    source_url: input.sourceUrl ?? null,
    poster_url: input.posterUrl ?? null,
    kind: input.kind,
    metadata: input.metadata ?? {},
  }).select("id").single();
  if (error) throw new Error(error.message);
  return data.id as string;
}

export async function enqueueMediaJob(assetId: string, jobKind: string, input: Record<string, unknown> = {}) {
  const { data, error } = await supabase.from("fresh_media_jobs").insert({ asset_id: assetId, job_kind: jobKind, input }).select("id").single();
  if (error) throw new Error(error.message);
  return data.id as string;
}

export async function createMarketplaceListing(input: {
  sellerId: string;
  title: string;
  description?: string;
  listingType?: string;
  priceMinor?: number | null;
  currencyCode?: string | null;
}) {
  const { data, error } = await supabase.from("fresh_marketplace_listings").insert({
    seller_id: input.sellerId,
    title: input.title,
    description: input.description ?? "",
    listing_type: input.listingType ?? "service",
    price_minor: input.priceMinor ?? null,
    currency_code: input.currencyCode ?? null,
  }).select("id").single();
  if (error) throw new Error(error.message);
  return data.id as string;
}

export async function subscribeToCreator(subscriberId: string, creatorId: string, tier = "free") {
  const { error } = await supabase.from("fresh_subscriptions").upsert({
    subscriber_id: subscriberId,
    creator_id: creatorId,
    tier,
    status: "active",
    updated_at: new Date().toISOString(),
  }, { onConflict: "subscriber_id,creator_id" });
  if (error) throw new Error(error.message);
}

export async function createOpportunity(ownerId: string, title: string, description: string, kind: string) {
  const { data, error } = await supabase.from("fresh_opportunities").insert({ owner_id: ownerId, title, description, kind }).select("id").single();
  if (error) throw new Error(error.message);
  return data.id as string;
}

export async function createCourse(creatorId: string, title: string, description = "", curriculum: unknown[] = []) {
  const { data, error } = await supabase.from("fresh_courses").insert({ creator_id: creatorId, title, description, curriculum }).select("id").single();
  if (error) throw new Error(error.message);
  return data.id as string;
}

export async function createAgent(ownerId: string, name: string, goal: string, permissions: Record<string, unknown> = {}) {
  const { data, error } = await supabase.from("fresh_agents").insert({
    owner_id: ownerId,
    name,
    goal,
    permissions,
    status: "draft",
  }).select("id").single();
  if (error) throw new Error(error.message);
  return data.id as string;
}

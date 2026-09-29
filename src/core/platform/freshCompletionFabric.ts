export type FreshLifecycleStatus = "draft" | "queued" | "processing" | "ready" | "failed";
export type FreshActionState = "available" | "approval-required" | "blocked" | "completed" | "failed";

export type FreshIdentitySession = {
  userId: string;
  sessionId: string;
  deviceId: string;
  route: string;
  lastSeenAt: string;
};

export type FreshActivityEvent = {
  id: string;
  userId: string | null;
  type: string;
  entityId?: string;
  occurredAt: string;
  metadata?: Record<string, unknown>;
};

export type FreshRecoveryState = {
  key: string;
  attempts: number;
  lastError?: string;
  recoveredAt?: string;
};

export type FreshAIAction = {
  id: string;
  label: string;
  state: FreshActionState;
  requiresApproval: boolean;
};

export type FreshMemoryItem = {
  id: string;
  userId: string;
  content: string;
  importance: number;
  expiresAt?: string;
  source: string;
};

export type FreshContentItem = {
  id: string;
  authorId: string;
  format: "short" | "long-video" | "news" | "post" | "ar" | "vr" | "podcast" | "other";
  title?: string;
  mediaUrl?: string;
  publishedAt: string;
  status: FreshLifecycleStatus;
};

export type FreshRecommendationCandidate = FreshContentItem & {
  subscription: number;
  niche: number;
  length: number;
  freshness: number;
  semanticSimilarity?: number;
};

export type FreshCreatorProject = {
  id: string;
  ownerId: string;
  title: string;
  version: number;
  status: FreshLifecycleStatus;
  updatedAt: string;
};

export type FreshRealtimeEvent = {
  id: string;
  channelId: string;
  kind: "chat" | "reaction" | "poll" | "presence" | "interaction";
  actorId: string;
  occurredAt: string;
  payload: Record<string, unknown>;
};

export type FreshMoneyOperation = {
  id: string;
  actorId: string;
  type: "payment" | "earning" | "escrow" | "payout" | "refund" | "dispute";
  state: "pending" | "verified" | "released" | "disputed" | "refunded" | "failed";
  amountMinor: number;
  currency: string;
};

export type FreshGovernanceCase = {
  id: string;
  subjectId: string;
  type: "copyright" | "safety" | "identity" | "payment" | "appeal";
  state: "open" | "review" | "resolved" | "appealed";
  createdAt: string;
};

export const FRESH_PHASE_15_22: readonly { phase: number; name: string; steps: readonly number[] }[] = [
  { phase: 15, name: "Fresh Core Operating System", steps: [51,52,53,54,55,56,57,58,59,60] },
  { phase: 16, name: "Fresh AI Real Runtime", steps: [61,62,63,64,65,66,67,68,69,70] },
  { phase: 17, name: "Universal Memory & Knowledge", steps: [71,72,73,74,75,76,77,78,79,80] },
  { phase: 18, name: "Fresh Flow 2.0", steps: [81,82,83,84,85,86,87,88,89,90] },
  { phase: 19, name: "Discovery & Recommendation", steps: [91,92,93,94,95,96,97,98,99,100] },
  { phase: 20, name: "Creator + Studio Production", steps: [101,102,103,104,105,106,107,108,109,110] },
  { phase: 21, name: "Community & Realtime", steps: [111,112,113,114,115,116,117,118,119,120] },
  { phase: 22, name: "Money, Trust & Governance", steps: [121,122,123,124,125,126,127,128,129,130] },
] as const;

export const FRESH_PHASE_15_22_STEP_COUNT = FRESH_PHASE_15_22.reduce((n, phase) => n + phase.steps.length, 0);

export const FRESH_CORE_TABLE_BINDINGS = {
  identity: ["users", "universal_profiles", "profile_privacy_settings", "fresh_context_sessions"],
  activity: ["fresh_flow_events", "notifications", "universal_interactions"],
  memory: ["fresh_memories", "fresh_ai_memory", "fresh_ai_knowledge"],
  knowledge: ["fresh_intelligence_entities", "fresh_intelligence_claims", "fresh_intelligence_evidence", "fresh_knowledge_entity_relations"],
  flow: ["shorts", "posts", "fresh_media_assets", "fresh_media_jobs", "fresh_flow_events"],
  creator: ["creator_drafts", "fresh_creator_analytics", "fresh_media_assets", "fresh_media_jobs"],
  realtime: ["fresh_flow_events", "notifications"],
  money: ["wallet_balances", "wallet_transactions", "treasury_transactions", "treasury_entries", "treasury_rail_requests"],
  governance: ["fresh_trust_audit", "reports", "community_notes", "fresh_intelligence_arbitrations"],
} as const;

export function createIdentitySession(userId: string, route = "/"): FreshIdentitySession {
  const now = new Date().toISOString();
  return { userId, sessionId: crypto.randomUUID(), deviceId: crypto.randomUUID(), route, lastSeenAt: now };
}

export function createActivityEvent(type: string, userId: string | null, entityId?: string, metadata?: Record<string, unknown>): FreshActivityEvent {
  return { id: crypto.randomUUID(), userId, type, entityId, occurredAt: new Date().toISOString(), metadata };
}

export function createRecoveryState(key: string): FreshRecoveryState {
  return { key, attempts: 0 };
}

export function recordRecoveryFailure(state: FreshRecoveryState, error: unknown): FreshRecoveryState {
  return { ...state, attempts: state.attempts + 1, lastError: error instanceof Error ? error.message : "Unknown error" };
}

export function markRecovered(state: FreshRecoveryState): FreshRecoveryState {
  return { ...state, recoveredAt: new Date().toISOString() };
}

export function createAIAction(label: string, requiresApproval = false): FreshAIAction {
  return { id: crypto.randomUUID(), label, state: requiresApproval ? "approval-required" : "available", requiresApproval };
}

export function createMemoryItem(userId: string, content: string, source: string, importance = 0.5, expiresAt?: string): FreshMemoryItem {
  if (!content.trim()) throw new Error("Memory content cannot be empty");
  return { id: crypto.randomUUID(), userId, content: content.trim(), source, importance: Math.max(0, Math.min(1, importance)), expiresAt };
}

export function createContentItem(input: Omit<FreshContentItem, "id" | "publishedAt" | "status"> & { status?: FreshLifecycleStatus }): FreshContentItem {
  return { ...input, id: crypto.randomUUID(), publishedAt: new Date().toISOString(), status: input.status ?? "draft" };
}

export function rankFreshCandidates(candidates: FreshRecommendationCandidate[], weights: { subscription: number; niche: number; length: number; freshness: number; semantic?: number }): FreshRecommendationCandidate[] {
  const total = weights.subscription + weights.niche + weights.length + weights.freshness + (weights.semantic ?? 0);
  if (total <= 0) throw new Error("Recommendation weights must have a positive total");
  const score = (c: FreshRecommendationCandidate) =>
    (weights.subscription * c.subscription + weights.niche * c.niche + weights.length * c.length + weights.freshness * c.freshness + (weights.semantic ?? 0) * (c.semanticSimilarity ?? 0)) / total;
  return [...candidates].sort((a, b) => score(b) - score(a));
}

export function createCreatorProject(ownerId: string, title: string): FreshCreatorProject {
  if (!title.trim()) throw new Error("Project title cannot be empty");
  return { id: crypto.randomUUID(), ownerId, title: title.trim(), version: 1, status: "draft", updatedAt: new Date().toISOString() };
}

export function bumpProjectVersion(project: FreshCreatorProject, status: FreshLifecycleStatus = project.status): FreshCreatorProject {
  return { ...project, version: project.version + 1, status, updatedAt: new Date().toISOString() };
}

export function createRealtimeEvent(channelId: string, actorId: string, kind: FreshRealtimeEvent["kind"], payload: Record<string, unknown>): FreshRealtimeEvent {
  return { id: crypto.randomUUID(), channelId, actorId, kind, occurredAt: new Date().toISOString(), payload };
}

export function createMoneyOperation(actorId: string, type: FreshMoneyOperation["type"], amountMinor: number, currency: string): FreshMoneyOperation {
  if (!Number.isSafeInteger(amountMinor) || amountMinor < 0) throw new Error("Money amount must be a non-negative integer in minor units");
  if (!currency.trim()) throw new Error("Currency is required");
  return { id: crypto.randomUUID(), actorId, type, state: "pending", amountMinor, currency: currency.toUpperCase() };
}

export function createGovernanceCase(subjectId: string, type: FreshGovernanceCase["type"]): FreshGovernanceCase {
  return { id: crypto.randomUUID(), subjectId, type, state: "open", createdAt: new Date().toISOString() };
}

export function assertFreshPhase15To22Integrity(): void {
  if (FRESH_PHASE_15_22.length !== 8 || FRESH_PHASE_15_22_STEP_COUNT !== 80) throw new Error("Fresh phases 15-22 must contain exactly 80 steps");
  const steps = FRESH_PHASE_15_22.flatMap((phase) => phase.steps);
  for (let i = 0; i < steps.length; i++) if (steps[i] !== 51 + i) throw new Error("Fresh phase step sequence is not contiguous");
}

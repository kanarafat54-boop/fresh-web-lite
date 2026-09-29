/**
 * Fresh Web Lite — Phases 15–24 universal platform fabric.
 *
 * This module is the contract layer for the 100-step expansion. It does not
 * pretend infrastructure exists merely because a registry entry exists.
 * Runtime adapters and user-facing workspaces consume these contracts.
 */

export const FRESH_PHASES_15_24 = [
  { phase: 15, name: "Global Infrastructure & Scale", steps: [141,142,143,144,145,146,147,148,149,150] },
  { phase: 16, name: "Data Architecture 2.0", steps: [151,152,153,154,155,156,157,158,159,160] },
  { phase: 17, name: "Fresh Identity 2.0", steps: [161,162,163,164,165,166,167,168,169,170] },
  { phase: 18, name: "Fresh AI 2.0", steps: [171,172,173,174,175,176,177,178,179,180] },
  { phase: 19, name: "Fresh AI Agents", steps: [181,182,183,184,185,186,187,188,189,190] },
  { phase: 20, name: "Fresh Flow 3.0", steps: [191,192,193,194,195,196,197,198,199,200] },
  { phase: 21, name: "Discovery Intelligence", steps: [201,202,203,204,205,206,207,208,209,210] },
  { phase: 22, name: "Universal Search", steps: [211,212,213,214,215,216,217,218,219,220] },
  { phase: 23, name: "Communication", steps: [221,222,223,224,225,226,227,228,229,230] },
  { phase: 24, name: "Creation & Professional Work", steps: [231,232,233,234,235,236,237,238,239,240] },
] as const;

export type FreshPlatformPhase = typeof FRESH_PHASES_15_24[number]["phase"];
export type FreshPlatformTarget =
  | "global-infrastructure" | "data" | "identity" | "ai" | "agents"
  | "flow" | "discovery" | "search" | "communication" | "work";

export type FreshPlatformCapability = {
  step: number;
  phase: FreshPlatformPhase;
  target: FreshPlatformTarget;
  id: string;
  contract: "runtime" | "persistence" | "policy" | "ui" | "integration";
};

const targetByPhase: Record<FreshPlatformPhase, FreshPlatformTarget> = {
  15: "global-infrastructure", 16: "data", 17: "identity", 18: "ai", 19: "agents",
  20: "flow", 21: "discovery", 22: "search", 23: "communication", 24: "work",
};

const contractByOffset: FreshPlatformCapability["contract"][] = [
  "runtime", "persistence", "integration", "runtime", "policy",
  "persistence", "runtime", "policy", "integration", "ui",
];

const names = [
  "global-service-topology","multi-region-data","global-cdn","edge-application","regional-routing",
  "disaster-recovery","backup-verification","capacity-forecasting","autoscaling","reliability-command-center",
  "universal-data-model","universal-object-ids","data-lineage","event-sourcing","data-lifecycle",
  "data-classification","ecosystem-data-contracts","schema-evolution","data-quality","data-governance",
  "universal-profile","identity-verification","organization-accounts","delegated-access","role-permissions",
  "attribute-permissions","session-security","account-recovery","identity-portability","authorization-gateway",
  "universal-ai-runtime","model-registry","model-evaluation","ai-routing","context-compiler",
  "memory-controller","tool-registry","permission-broker","execution-journal","rollback-engine",
  "personal-agent","agent-templates","agent-state","agent-scheduling","agent-collaboration",
  "agent-tool-authorization","agent-sandbox","agent-budgets","agent-supervision","agent-marketplace",
  "universal-media-object","media-metadata","media-ingestion","adaptive-transcoding","global-media-cache",
  "media-quality","accessibility-engine","media-remixing","interactive-media","media-experience",
  "recommendation-graph","multi-objective-ranking","contextual-discovery","session-ranking","diversity-engine",
  "freshness-engine","negative-signal-engine","creator-discovery","recommendation-explanations","discovery-controls",
  "universal-search-index","semantic-search","multimodal-search","conversational-search","entity-search",
  "temporal-search","search-controls","search-provenance","search-to-action","knowledge-assistant",
  "messaging-foundation","groups","voice","video","secure-media-messaging",
  "translation","ai-communication","communication-moderation","presence","unified-inbox",
  "creative-studio","collaborative-docs","collaborative-design","collaborative-coding","ai-development-assistant",
  "project-management","workspace-objects","professional-portfolio","work-opportunity-matching","fresh-work-os",
] as const;

export const FRESH_PLATFORM_CAPABILITIES: readonly FreshPlatformCapability[] =
  names.map((id, index) => {
    const phase = (15 + Math.floor(index / 10)) as FreshPlatformPhase;
    return {
      step: 141 + index,
      phase,
      target: targetByPhase[phase],
      id,
      contract: contractByOffset[index % 10],
    };
  });

export type FreshObjectKind =
  | "profile" | "organization" | "media" | "document" | "project"
  | "message" | "agent" | "opportunity" | "listing" | "course";

export type FreshUniversalObject = {
  id: string;
  kind: FreshObjectKind;
  ownerId: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  visibility: "private" | "shared" | "public";
  metadata: Record<string, unknown>;
};

export function createUniversalObject(
  kind: FreshObjectKind,
  ownerId: string,
  metadata: Record<string, unknown> = {},
  visibility: FreshUniversalObject["visibility"] = "private",
): FreshUniversalObject {
  if (!ownerId.trim()) throw new Error("Universal objects require an owner.");
  const now = new Date().toISOString();
  return { id: crypto.randomUUID(), kind, ownerId, version: 1, createdAt: now, updatedAt: now, visibility, metadata };
}

export type FreshAuthorization = {
  subjectId: string;
  resourceId: string;
  action: string;
  decision: "allow" | "deny" | "approval-required";
  reason: string;
};

export function authorizeFreshAction(
  subjectId: string,
  resource: Pick<FreshUniversalObject, "id" | "ownerId" | "visibility">,
  action: string,
): FreshAuthorization {
  if (!subjectId) return { subjectId, resourceId: resource.id, action, decision: "deny", reason: "No authenticated subject." };
  if (resource.ownerId === subjectId) return { subjectId, resourceId: resource.id, action, decision: "allow", reason: "Owner authorization." };
  if (resource.visibility === "public" && ["read", "search", "discover"].includes(action)) {
    return { subjectId, resourceId: resource.id, action, decision: "allow", reason: "Public read/discovery policy." };
  }
  return { subjectId, resourceId: resource.id, action, decision: "approval-required", reason: "Explicit permission is required." };
}

export type FreshDiscoveryContext = {
  query?: string;
  sessionId?: string;
  locale?: string;
  followedCreatorIds?: string[];
  seenIds?: string[];
  blockedIds?: string[];
};

export type FreshDiscoveryCandidate = FreshUniversalObject & {
  relevance: number;
  freshness: number;
  affinity: number;
  diversity: number;
  safety: number;
};

export function scoreFreshDiscovery(candidate: FreshDiscoveryCandidate, context: FreshDiscoveryContext): number {
  if (context.blockedIds?.includes(candidate.id) || candidate.safety <= 0) return Number.NEGATIVE_INFINITY;
  const seenPenalty = context.seenIds?.includes(candidate.id) ? 0.35 : 1;
  const affinity = context.followedCreatorIds?.includes(candidate.ownerId) ? Math.min(1, candidate.affinity + 0.2) : candidate.affinity;
  return seenPenalty * (
    candidate.relevance * 0.30 +
    candidate.freshness * 0.15 +
    affinity * 0.15 +
    candidate.diversity * 0.15 +
    candidate.safety * 0.25
  );
}

export function rankFreshDiscovery(candidates: FreshDiscoveryCandidate[], context: FreshDiscoveryContext) {
  return [...candidates]
    .map((candidate) => ({ candidate, score: scoreFreshDiscovery(candidate, context) }))
    .filter((entry) => Number.isFinite(entry.score))
    .sort((a, b) => b.score - a.score);
}

export type FreshSearchResult = {
  object: FreshUniversalObject;
  score: number;
  matchedBy: "text" | "semantic" | "multimodal" | "entity";
  provenance?: { sourceId?: string; observedAt?: string };
};

export type FreshSearchAdapter = {
  search(query: string, context: FreshDiscoveryContext): Promise<FreshSearchResult[]>;
};

export type FreshAgentPolicy = {
  approvalRequired: boolean;
  allowedTools: string[];
  maxSteps: number;
  maxSpendMinor: number;
};

export function createFreshAgentPolicy(overrides: Partial<FreshAgentPolicy> = {}): FreshAgentPolicy {
  return {
    approvalRequired: true,
    allowedTools: [],
    maxSteps: 20,
    maxSpendMinor: 0,
    ...overrides,
  };
}

export type FreshAgentRun = {
  id: string;
  agentId: string;
  ownerId: string;
  status: "draft" | "awaiting-approval" | "running" | "completed" | "failed" | "cancelled";
  stepCount: number;
  startedAt: string;
  finishedAt?: string;
  error?: string;
};

export function startFreshAgentRun(agentId: string, ownerId: string, policy: FreshAgentPolicy): FreshAgentRun {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(), agentId, ownerId,
    status: policy.approvalRequired ? "awaiting-approval" : "running",
    stepCount: 0, startedAt: now,
  };
}

export type FreshMediaAdmission = {
  maxConcurrent: number;
  preloadAhead: number;
  preloadBehind: number;
  metadataFirst: boolean;
};

export function mediaAdmissionForConnection(connection: "fast" | "slow" | "offline"): FreshMediaAdmission {
  if (connection === "offline") return { maxConcurrent: 1, preloadAhead: 0, preloadBehind: 0, metadataFirst: true };
  if (connection === "slow") return { maxConcurrent: 2, preloadAhead: 1, preloadBehind: 0, metadataFirst: true };
  return { maxConcurrent: 3, preloadAhead: 2, preloadBehind: 1, metadataFirst: false };
}

export type FreshCommunicationEnvelope = {
  id: string;
  threadId: string;
  senderId: string;
  kind: "text" | "voice" | "video" | "media" | "system";
  body: string;
  createdAt: string;
};

export function createCommunicationEnvelope(
  threadId: string,
  senderId: string,
  kind: FreshCommunicationEnvelope["kind"],
  body: string,
): FreshCommunicationEnvelope {
  if (!threadId || !senderId || !body.trim()) throw new Error("Communication requires thread, sender and content.");
  return { id: crypto.randomUUID(), threadId, senderId, kind, body: body.trim(), createdAt: new Date().toISOString() };
}

export function assertFreshPhases15To24Integrity(): void {
  if (FRESH_PHASES_15_24.length !== 10 || FRESH_PLATFORM_CAPABILITIES.length !== 100) {
    throw new Error("Fresh phases 15–24 must contain exactly 100 capabilities.");
  }
  const steps = FRESH_PLATFORM_CAPABILITIES.map((entry) => entry.step);
  for (let i = 0; i < steps.length; i += 1) {
    if (steps[i] !== 141 + i) throw new Error("Fresh phases 15–24 step sequence is not contiguous.");
  }
}

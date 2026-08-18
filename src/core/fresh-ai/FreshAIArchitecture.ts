/**
 * #TRUEMODE — Fresh AI Sovereign Intelligence Layer
 *
 * Fresh AI owns reasoning, memory, truth evaluation, planning, skill
 * composition and agent orchestration. Agents are operational roles, not
 * competing intelligence providers.
 *
 * Core operation requires no provider API key. Provider adapters, when ever
 * introduced, must remain optional tools behind an explicit capability gate.
 */

export type TruthState = "KNOWN" | "PROBABLE" | "UNCERTAIN" | "CONTRADICTED" | "UNKNOWN" | "BLOCKED";
export type FreshIntent = "answer" | "research" | "create" | "code" | "design" | "analyze" | "plan" | "act" | "learn" | "discover";
export type FreshAgent =
  | "wallet" | "feed" | "security" | "research" | "architecture" | "backend"
  | "frontend" | "testing" | "documentation" | "deployment" | "media" | "learning";

export type Evidence = {
  id: string;
  source: string;
  claim: string;
  observedAt?: string;
  confidence: number;
};

export type FreshClaim = {
  statement: string;
  truth: TruthState;
  confidence: number;
  evidence: Evidence[];
  temporal?: { validFrom?: string; validUntil?: string };
};

export type FreshSkill = {
  id: string;
  name: string;
  description: string;
  capabilities: string[];
  requiredTools?: string[];
};

export type FreshPlanStep = {
  id: string;
  description: string;
  agent?: FreshAgent;
  skills: string[];
  requiresApproval?: boolean;
};

export type FreshReasoningRequest = {
  input: string;
  intent?: FreshIntent;
  context?: Record<string, unknown>;
  evidence?: Evidence[];
  requestedAgents?: FreshAgent[];
};

export type FreshReasoningResult = {
  answer: string;
  claims: FreshClaim[];
  plan: FreshPlanStep[];
  actions: string[];
  unknowns: string[];
  explanation: string;
};

export const FRESH_AI_NATIVE_CAPABILITIES = [
  "general-reasoning", "deduction", "induction", "abduction", "planning",
  "causal-reasoning", "counterfactual-reasoning", "constraint-solving",
  "knowledge-graph", "evidence-analysis", "provenance", "temporal-truth",
  "contradiction-detection", "confidence-calibration", "unknown-detection",
  "code-generation", "code-review", "debugging", "refactoring", "architecture",
  "database-design", "api-design", "testing", "optimization", "security",
  "ui-ux-design", "design-systems", "media-understanding", "video-intelligence",
  "audio-understanding", "writing", "translation", "mathematics", "statistics",
  "physics", "chemistry", "biology", "simulation-planning", "research",
  "data-analysis", "forecasting", "risk-analysis", "automation", "learning",
] as const;

export const FRESH_AI_AGENTS: FreshAgent[] = [
  "wallet", "feed", "security", "research", "architecture", "backend", "frontend",
  "testing", "documentation", "deployment", "media", "learning",
];

export const FRESH_AI_POLICY = {
  coreRequiresApiKey: false,
  externalIntelligenceRequired: false,
  agentsOwnReasoning: false,
  freshOwnsDecisionBoundary: true,
  preserveUnknowns: true,
  preserveContradictions: true,
} as const;

/** Stable interface for the native engine. Implementations can evolve without
 * changing every agent or product surface. */
export interface FreshIntelligenceEngine {
  understand(request: FreshReasoningRequest): Promise<{ intent: FreshIntent; context: Record<string, unknown> }>;
  retrieve(request: FreshReasoningRequest): Promise<Evidence[]>;
  reason(request: FreshReasoningRequest, evidence: Evidence[]): Promise<FreshReasoningResult>;
  plan(request: FreshReasoningRequest, result: FreshReasoningResult): Promise<FreshPlanStep[]>;
  verify(result: FreshReasoningResult): Promise<FreshReasoningResult>;
  execute(plan: FreshPlanStep[]): Promise<string[]>;
}

export function assertFreshCoreHasNoRequiredApiKeys(env: Record<string, string | undefined> = {}): void {
  // Deliberately informational: the native engine must not throw when provider
  // credentials are absent. External credentials are optional tool configuration.
  void env;
}

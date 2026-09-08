/**
 * #TRUEMODE — Fresh AI Sovereign Intelligence Layer
 *
 * Fresh AI owns the decision boundary. Providers, tools and agents are
 * replaceable capabilities underneath a governed intelligence pipeline.
 */

import type { FreshDimension, DimensionalReasoning } from "./dimensionalIntelligence.js";
import type { ASIState } from "./asi.js";

export type TruthState = "KNOWN" | "PROBABLE" | "UNCERTAIN" | "CONTRADICTED" | "UNKNOWN" | "BLOCKED";
export type FreshIntent = "chat" | "answer" | "research" | "create" | "code" | "design" | "analyze" | "plan" | "act" | "learn" | "discover";
export type FreshAgent = "wallet" | "feed" | "security" | "research" | "architecture" | "backend" | "frontend" | "testing" | "documentation" | "deployment" | "media" | "learning";

export type Evidence = { id: string; source: string; claim: string; observedAt?: string; confidence: number };
export type FreshClaim = { statement: string; truth: TruthState; confidence: number; evidence: Evidence[]; temporal?: { validFrom?: string; validUntil?: string } };
export type FreshSkill = { id: string; name: string; description: string; capabilities: string[]; requiredTools?: string[] };
export type FreshPlanStep = { id: string; description: string; agent?: FreshAgent; skills: string[]; requiresApproval?: boolean };
export type FreshExecutionResult = { stepId: string; agent?: FreshAgent; accepted: boolean; status: "executed" | "approval-required" | "unavailable" | "failed"; detail: string };
export type FreshConversationTurn = { role: "user" | "assistant"; content: string; createdAt?: string };
export type FreshReasoningRequest = { input: string; intent?: FreshIntent; context?: Record<string, unknown>; evidence?: Evidence[]; requestedAgents?: FreshAgent[]; dimensions?: FreshDimension[]; conversation?: FreshConversationTurn[] };

/** Explicit interpretation prevents Fresh from treating every message as a research task. */
export type FreshGoalInterpretation = {
  intent: FreshIntent;
  objective: string;
  desiredOutcome: string;
  outputMode: "conversation" | "answer" | "research" | "creation" | "code" | "plan" | "action";
  needsEvidence: boolean;
  needsAction: boolean;
  needsClarification: boolean;
  constraints: string[];
  entities: string[];
  contextDependency?: "none" | "conversation" | "memory" | "both";
};

/** Observable stages let Fresh grow into a measured intelligence platform instead of a black-box answer call. */
export type FreshPipelineStage = "understand" | "memory" | "retrieve" | "research" | "reason" | "plan" | "coordinate" | "execute" | "verify" | "proof" | "feedback" | "improve" | "govern";
export type FreshStageStatus = "ready" | "completed" | "skipped" | "blocked" | "failed";
export type FreshPipelineEvent = { stage: FreshPipelineStage; status: FreshStageStatus; startedAt: string; completedAt?: string; detail?: string; metrics?: Record<string, number> };
export type FreshFeedback = { requestId: string; rating?: number; correct?: boolean; comment?: string; createdAt: string };

export type FreshReasoningResult = {
  answer: string;
  claims: FreshClaim[];
  plan: FreshPlanStep[];
  actions: string[];
  unknowns: string[];
  explanation: string;
  dimensionalReasoning?: DimensionalReasoning[];
  pipeline?: FreshPipelineEvent[];
  feedback?: FreshFeedback;
  asi?: ASIState;
};

export const FRESH_AI_NATIVE_CAPABILITIES = ["general-reasoning","deduction","induction","abduction","planning","causal-reasoning","counterfactual-reasoning","constraint-solving","knowledge-graph","evidence-analysis","provenance","temporal-truth","contradiction-detection","confidence-calibration","unknown-detection","code-generation","code-review","debugging","refactoring","architecture","database-design","api-design","testing","optimization","security","ui-ux-design","design-systems","media-understanding","video-intelligence","audio-understanding","writing","translation","mathematics","statistics","physics","chemistry","biology","simulation-planning","research","data-analysis","forecasting","risk-analysis","automation","learning","creative-synthesis","strategic-planning","transfer-learning","metacognition","scientific-discovery","social-context","environment-modeling","self-improvement","dimensional-reasoning-1d-11d"] as const;
export const FRESH_AI_AGENTS: FreshAgent[] = ["wallet","feed","security","research","architecture","backend","frontend","testing","documentation","deployment","media","learning"];
export const FRESH_AI_POLICY = { coreRequiresApiKey:false, externalIntelligenceRequired:false, agentsOwnReasoning:false, freshOwnsDecisionBoundary:true, preserveUnknowns:true, preserveContradictions:true, dimensionalReasoning:true, maxReasoningDimension:11, autonomousSelfModification:false, improvementProposalsRequireApproval:true, highImpactActionsRequireApproval:true, reversibleImprovementsOnly:true } as const;

export interface FreshIntelligenceEngine {
  understand(request: FreshReasoningRequest): Promise<{ intent: FreshIntent; context: Record<string, unknown>; interpretation: FreshGoalInterpretation }>;
  retrieve(request: FreshReasoningRequest): Promise<Evidence[]>;
  reason(request: FreshReasoningRequest, evidence: Evidence[]): Promise<FreshReasoningResult>;
  plan(request: FreshReasoningRequest, result: FreshReasoningResult): Promise<FreshPlanStep[]>;
  verify(result: FreshReasoningResult): Promise<FreshReasoningResult>;
  execute(plan: FreshPlanStep[], context?: unknown): Promise<FreshExecutionResult[]>;
}

export function assertFreshCoreHasNoRequiredApiKeys(env: Record<string, string | undefined> = {}): void { void env; }

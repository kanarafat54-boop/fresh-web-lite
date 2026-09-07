import type { FreshClaim, FreshPlanStep, FreshReasoningResult } from "./FreshAIArchitecture.js";

export type ASICapability =
  | "general-cognition"
  | "creative-synthesis"
  | "strategic-planning"
  | "transfer-learning"
  | "metacognition"
  | "scientific-discovery"
  | "social-context"
  | "environment-modeling"
  | "self-improvement";

export type ImprovementRisk = "low" | "medium" | "high" | "critical";
export type ImprovementStatus = "proposed" | "evaluated" | "approved" | "rejected" | "applied";

export type ASIImprovementProposal = {
  id: string;
  target: string;
  hypothesis: string;
  expectedGain: string;
  risks: string[];
  validationPlan: string[];
  rollbackPlan: string[];
  risk: ImprovementRisk;
  status: ImprovementStatus;
  requiresHumanApproval: boolean;
};

export type ASIState = {
  objective: string;
  capabilities: ASICapability[];
  strengths: string[];
  weaknesses: string[];
  unknowns: string[];
  constraints: string[];
  proposals: ASIImprovementProposal[];
};

/**
 * Bounded ASI substrate: it can model capabilities, critique its own work and
 * propose measurable improvements. It never rewrites production code,
 * permissions, safety policy or deployment state autonomously.
 */
export function evaluateASIState(
  objective: string,
  result: FreshReasoningResult,
  plan: FreshPlanStep[] = [],
): ASIState {
  const claims = Array.isArray(result?.claims) ? result.claims : [];
  const dimensionalReasoning = Array.isArray(result?.dimensionalReasoning) ? result.dimensionalReasoning : [];
  const resultUnknowns = Array.isArray(result?.unknowns) ? result.unknowns : [];
  const safePlan = Array.isArray(plan) ? plan : [];
  const weaknesses = [...resultUnknowns];
  const strengths: string[] = [];
  if (claims.length) strengths.push("evidence-grounded reasoning");
  if (dimensionalReasoning.length) strengths.push("multi-perspective dimensional reasoning");
  if (safePlan.length) strengths.push("goal decomposition and planning");
  if (!claims.length) weaknesses.push("insufficient evidence");

  const capabilities: ASICapability[] = [
    "general-cognition",
    "creative-synthesis",
    "strategic-planning",
    "transfer-learning",
    "metacognition",
    "scientific-discovery",
    "social-context",
    "environment-modeling",
    "self-improvement",
  ];

  const proposal = makeImprovementProposal(result, safePlan);
  return {
    objective,
    capabilities,
    strengths,
    weaknesses: [...new Set(weaknesses)],
    unknowns: [...new Set(resultUnknowns)],
    constraints: [
      "No autonomous production-code mutation",
      "No autonomous permission escalation",
      "No autonomous safety-policy mutation",
      "High-impact external actions require explicit authorization",
      "Every applied improvement must be validated and reversible",
    ],
    proposals: proposal ? [proposal] : [],
  };
}

function makeImprovementProposal(result: FreshReasoningResult, plan: FreshPlanStep[] = []): ASIImprovementProposal | null {
  const unknowns = Array.isArray(result?.unknowns) ? result.unknowns : [];
  const safePlan = Array.isArray(plan) ? plan : [];
  if (!unknowns.length && !safePlan.length) return null;
  const id = `asi-improvement-${Date.now()}`;
  return {
    id,
    target: unknowns.length ? "evidence-and-verification pipeline" : "planning quality",
    hypothesis: unknowns.length
      ? "Increase retrieval diversity and verification before committing to high-confidence claims."
      : "Evaluate completed plans against outcomes and use failures to improve future decomposition.",
    expectedGain: "Higher reliability, better transfer to novel requests, and fewer unresolved errors.",
    risks: ["regression", "overfitting to prior failures", "increased latency or cost"],
    validationPlan: [
      "run deterministic regression tests",
      "compare baseline and candidate metrics",
      "test adversarial and edge cases",
      "verify no policy or permission boundary changed",
    ],
    rollbackPlan: ["retain the previous version", "require a reversible deployment", "revert if validation thresholds regress"],
    risk: unknowns.length > 2 ? "medium" : "low",
    status: "proposed",
    requiresHumanApproval: true,
  };
}

export function summarizeASIClaims(state: ASIState): FreshClaim[] {
  const strengths = Array.isArray(state?.strengths) ? state.strengths : [];
  return strengths.map((strength, index) => ({
    statement: `Fresh AI demonstrated ${strength}.`,
    truth: "PROBABLE",
    confidence: Math.min(0.95, 0.65 + index * 0.05),
    evidence: [],
  }));
}

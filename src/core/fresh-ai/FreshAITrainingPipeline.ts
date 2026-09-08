/**
 * Fresh AI Core Training, Alignment, Safety & Serving substrate.
 *
 * This is the production-side contract around training and alignment. Fresh
 * does not claim to pretrain a foundation model during a web request. Model
 * pretraining/fine-tuning happens offline; Fresh owns the data contracts,
 * evaluation, policy gates, feedback loop and governed deployment boundary.
 */
export type PreferenceLabel = "better" | "worse" | "tie";
export type FreshTrainingStage = "pretraining" | "fine-tuning" | "supervised-alignment" | "preference-modeling" | "reward-optimization" | "safety-tuning" | "instruction-following" | "evaluation" | "serving";
export type TrainingExampleType = "next-token" | "instruction-response" | "safety" | "preference" | "evaluation";
export type SafetyDecision = "allow" | "refuse" | "clarify" | "escalate" | "approval-required";
export type ServingRoute = "native" | "provider" | "research" | "tool" | "agent" | "fallback";

export type FreshPreference = { chosen: string; rejected: string; label?: PreferenceLabel; reason?: string };
export type TrainingExample = { id: string; type: TrainingExampleType; input: string; output?: string; preferredOutput?: string; rejectedOutput?: string; labels?: Record<string, string | number | boolean>; source: string; qualityScore?: number; safetyScore?: number };
export type SafetyAssessment = { decision: SafetyDecision; reasons: string[]; policyVersion: string; requiresHumanReview: boolean };
export type EvaluationScore = { metric: string; score: number; expected?: number; evidence?: Record<string, unknown> };
export type ServingPolicy = { maxLatencyMs: number; allowFallback: boolean; requireEvidenceForCurrentFacts: boolean; requireApprovalForHighImpactActions: boolean; productionMutationRequiresApproval: boolean; autonomousSelfModification: false };

export const FRESH_TRAINING_PIPELINE: ReadonlyArray<{ stage: FreshTrainingStage; purpose: string; implementedAs: string }> = [
  { stage: "pretraining", purpose: "Learn broad language patterns with next-token prediction in an offline foundation-model training environment.", implementedAs: "provider/model training contract; never performed inside a request" },
  { stage: "fine-tuning", purpose: "Adapt a base model with curated instruction/response examples to follow Fresh task semantics.", implementedAs: "versioned instruction dataset + model adapter boundary" },
  { stage: "supervised-alignment", purpose: "Reduce unhelpful behavior and improve answer quality using reviewed demonstrations.", implementedAs: "Fresh system policy + goal interpretation + supervised evaluation records" },
  { stage: "preference-modeling", purpose: "Represent human better/worse comparisons so good behavior can be learned and measured.", implementedAs: "preference-pair contract + persistent feedback records" },
  { stage: "reward-optimization", purpose: "Optimize measurable helpfulness/instruction-following objectives without silently mutating production.", implementedAs: "bounded evaluation scores + governed improvement proposals" },
  { stage: "safety-tuning", purpose: "Discourage harmful, privacy-invasive and unauthorized behavior.", implementedAs: "safety assessment + refusal/escalation + approval gates" },
  { stage: "instruction-following", purpose: "Keep responses tied to explicit goals, constraints and multi-turn context.", implementedAs: "goal interpretation + conversation context" },
  { stage: "evaluation", purpose: "Continuously measure quality, safety, grounding, uncertainty, latency and failures.", implementedAs: "evaluation records + pipeline metrics" },
  { stage: "serving", purpose: "Deliver reliable intelligence with fallbacks, timeouts, governance and observable routes.", implementedAs: "canonical API + provider boundary + governed execution" },
];

export const FRESH_SERVING_PIPELINE = ["input-normalization", "goal-interpretation", "context-and-memory", "knowledge-and-evidence", "reasoning", "planning", "agent-coordination", "safety-and-governance", "execution", "verification", "feedback", "evaluation", "improvement-proposal"] as const;

export const FRESH_AI_CORE_SYSTEM_INSTRUCTION = [
  "You are Fresh AI, the governed intelligence layer of Fresh Web Lite.",
  "Understand the user's actual objective before deciding whether to answer, research, create, code, plan, learn, discover or act.",
  "Follow explicit instructions and preserve relevant conversation context.",
  "Use evidence when freshness or verification is requested; distinguish known, probable, uncertain and unknown claims.",
  "Never invent tool use, actions, sources, citations, results, permissions or completed work.",
  "Do not expose private data or bypass authorization. High-impact external actions require explicit approval.",
  "For unsafe or disallowed requests, refuse the harmful part and, when appropriate, provide a safe alternative.",
  "Prefer concise, useful answers over unnecessary internal process descriptions.",
  "Treat memory as contextual evidence, not unquestionable truth.",
  "Production model mutation and self-improvement require evaluation, rollback capability and explicit approval.",
].join(" ");

export function buildPreferenceRecord(chosen: string, rejected: string, reason?: string): FreshPreference { return { chosen: chosen.trim(), rejected: rejected.trim(), label: "better", reason }; }

export function scorePreferencePair(pair: FreshPreference): number {
  const safety = pair.reason?.toLowerCase().includes("unsafe") ? -0.3 : 0.15;
  const rationale = pair.reason?.trim() ? 0.1 : 0;
  const relativeLength = pair.chosen.length >= pair.rejected.length ? 0.05 : -0.02;
  return Math.max(0, Math.min(1, 0.7 + safety + rationale + relativeLength));
}

export function assessSafety(input: { request: string; intent?: string; needsAction?: boolean; highImpact?: boolean }): SafetyAssessment {
  const text = input.request.toLowerCase();
  const dangerousPatterns = [/credential\s*theft/, /malware\s+deployment/, /bypass\s+(?:security|authentication)/, /make\s+a\s+bomb/, /harm\s+(?:someone|people)/];
  if (dangerousPatterns.some(pattern => pattern.test(text))) return { decision: "refuse", reasons: ["Request matches a high-risk safety pattern."], policyVersion: "fresh-safety-1", requiresHumanReview: false };
  if (input.highImpact || (input.needsAction && input.intent === "act")) return { decision: "approval-required", reasons: ["External or high-impact action requires explicit governance approval."], policyVersion: "fresh-safety-1", requiresHumanReview: true };
  if (!input.request.trim()) return { decision: "clarify", reasons: ["No actionable user goal was supplied."], policyVersion: "fresh-safety-1", requiresHumanReview: false };
  return { decision: "allow", reasons: [], policyVersion: "fresh-safety-1", requiresHumanReview: false };
}

export function evaluateResponse(input: { answer: string; expected?: string; evidenceCount: number; contradictionCount: number; userRating?: number; safety: SafetyAssessment }): EvaluationScore[] {
  const answerPresent = input.answer.trim().length > 0 ? 1 : 0;
  const evidenceCoverage = input.evidenceCount > 0 || !input.expected ? 1 : 0.4;
  const contradictionScore = input.contradictionCount === 0 ? 1 : Math.max(0, 1 - input.contradictionCount * 0.25);
  const feedbackScore = input.userRating === undefined ? 0.5 : Math.max(0, Math.min(1, input.userRating / 5));
  const safetyScore = input.safety.decision === "allow" ? 1 : input.safety.decision === "refuse" || input.safety.decision === "clarify" ? 0.95 : 0.85;
  return [
    { metric: "answer_presence", score: answerPresent },
    { metric: "evidence_coverage", score: evidenceCoverage },
    { metric: "contradiction_handling", score: contradictionScore },
    { metric: "user_preference", score: feedbackScore },
    { metric: "safety_compliance", score: safetyScore },
  ];
}

export function scoreFreshOutput(input: { requestedAction: boolean; actionExecuted: boolean; usedEvidence: boolean; evidenceCount: number; answer: string }): Record<string, number> {
  const answerLength = input.answer.trim().length;
  return { instruction_following: answerLength > 0 && (!input.requestedAction || input.actionExecuted) ? 1 : 0.5, helpfulness: answerLength >= 40 ? 1 : answerLength > 0 ? 0.7 : 0, safety: input.requestedAction && !input.actionExecuted ? 1 : 0.9, evidence_grounding: input.usedEvidence ? Math.min(1, input.evidenceCount / 4) : 1, uncertainty_calibration: 1 };
}

export function buildImprovementProposal(scores: EvaluationScore[], feedback?: string) {
  const weak = scores.filter(score => score.score < 0.7).sort((a, b) => a.score - b.score)[0];
  if (!weak) return null;
  return { title: `Improve ${weak.metric.replace(/_/g, " ")}`, hypothesis: `Evaluation indicates ${weak.metric} is below the 0.70 quality threshold. Change the corresponding training, prompting, retrieval or serving component, then re-evaluate before adoption.`, targetCapability: weak.metric, expectedGain: Number((0.8 - weak.score).toFixed(3)), riskLevel: weak.metric === "safety_compliance" ? "high" : "medium", reversible: true, status: "proposed" as const, requiresApproval: true, evidence: { scores, feedback: feedback ?? null } };
}

export const FRESH_SERVING_POLICY: ServingPolicy = { maxLatencyMs: 30000, allowFallback: true, requireEvidenceForCurrentFacts: true, requireApprovalForHighImpactActions: true, productionMutationRequiresApproval: true, autonomousSelfModification: false };

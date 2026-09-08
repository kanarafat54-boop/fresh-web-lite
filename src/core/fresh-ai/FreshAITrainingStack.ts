/**
 * Fresh AI training/alignment/serving contract.
 *
 * This is an application-level serving policy, evaluation contract and safety
 * architecture. It does not claim that Fresh AI itself was pretrained or
 * fine-tuned from scratch; provider model training remains external.
 */
export type FreshTrainingStage =
  | "pretraining"
  | "fine-tuning"
  | "supervised-alignment"
  | "preference-modeling"
  | "reward-optimization"
  | "safety-tuning"
  | "instruction-following"
  | "conversation-context"
  | "policy-governance"
  | "evaluation"
  | "monitoring"
  | "safety-stack"
  | "serving";

export const FRESH_AI_TRAINING_STACK: readonly FreshTrainingStage[] = [
  "pretraining",
  "fine-tuning",
  "supervised-alignment",
  "preference-modeling",
  "reward-optimization",
  "safety-tuning",
  "instruction-following",
  "conversation-context",
  "policy-governance",
  "evaluation",
  "monitoring",
  "safety-stack",
  "serving",
] as const;

export const FRESH_AI_ALIGNMENT_PRINCIPLES = [
  "general-language-capability",
  "instruction-following",
  "helpfulness",
  "quality-improvement",
  "preference-aware-response-selection",
  "safety-constraint-enforcement",
  "conversation-coherence",
  "privacy-aware-behavior",
  "policy-driven-refusal",
  "uncertainty-preservation",
  "evaluation-and-monitoring",
  "failure-mode-observability",
  "scalable-serving",
  "continuous-feedback-improvement",
] as const;

export const FRESH_AI_SERVING_POLICY = {
  externalModelTraining: true,
  freshOwnsRuntimePolicy: true,
  instructionAdherence: true,
  conversationContext: true,
  humanPreferenceLearning: "evaluation-input",
  rewardOptimization: "provider-side-or-future-training",
  safetyTuning: "runtime-policy-and-provider-safety",
  moderationAndFiltering: true,
  escalationForHighImpactActions: true,
  automatedEvaluation: true,
  humanReviewSupported: true,
  latencyMonitoring: true,
  failureModeMonitoring: true,
  cachingAllowed: true,
  fallbacksMustBeHonest: true,
  continuousImprovementRequiresEvidence: true,
  autonomousModelWeightModification: false,
} as const;

export const FRESH_AI_TRAINING_SYSTEM_DIRECTIVE = [
  "Follow the user's explicit request and the interpreted intent.",
  "Use conversation context for coherent multi-turn behavior.",
  "Prefer helpful, accurate and directly useful responses.",
  "Do not fabricate evidence, tool execution, training history or outcomes.",
  "Preserve uncertainty and contradictions instead of hiding them.",
  "Apply privacy, safety and policy constraints before high-impact actions.",
  "Refuse or redirect disallowed harmful instructions.",
  "Use evaluation, feedback and observed failures as improvement signals.",
  "Keep runtime serving resilient while making fallbacks explicit and honest.",
].join(" ");

export type FreshEvaluationSignal = {
  helpfulness?: number;
  instructionFollowing?: number;
  safety?: number;
  factuality?: number;
  latencyMs?: number;
  failed?: boolean;
};

export function evaluateFreshTrainingSignal(signal: FreshEvaluationSignal): "pass" | "review" | "fail" {
  if (signal.failed) return "fail";
  const scores = [signal.helpfulness, signal.instructionFollowing, signal.safety, signal.factuality].filter(
    (value): value is number => typeof value === "number",
  );
  if (scores.some((value) => value < 0.5)) return "review";
  if (typeof signal.safety === "number" && signal.safety < 0.8) return "review";
  if (scores.length >= 3 && scores.reduce((sum, value) => sum + value, 0) / scores.length >= 0.8) return "pass";
  return "review";
}

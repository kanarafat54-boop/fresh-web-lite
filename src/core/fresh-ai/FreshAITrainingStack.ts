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
  | "reasoning"
  | "tool-use"
  | "verification"
  | "multimodal"
  | "agent-planning"
  | "specialized-expertise"
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
  "reasoning",
  "tool-use",
  "verification",
  "multimodal",
  "agent-planning",
  "specialized-expertise",
  "policy-governance",
  "evaluation",
  "monitoring",
  "safety-stack",
  "serving",
] as const;

export const FRESH_AI_ALIGNMENT_PRINCIPLES = [
  "general-language-capability",
  "instruction-following",
  "intent-understanding",
  "helpfulness",
  "direct-answering",
  "quality-improvement",
  "preference-aware-response-selection",
  "stronger-reasoning",
  "stepwise-problem-decomposition",
  "self-check-before-response",
  "reliable-web-research",
  "source-comparison",
  "evidence-citation",
  "long-term-memory-with-privacy",
  "tool-grounding",
  "fact-verification",
  "uncertainty-awareness",
  "conversation-coherence",
  "self-correction",
  "multimodal-understanding",
  "agent-planning",
  "real-time-awareness",
  "specialized-expertise",
  "safety-constraint-enforcement",
  "privacy-aware-behavior",
  "policy-driven-refusal",
  "evaluation-and-monitoring",
  "failure-mode-observability",
  "scalable-serving",
  "continuous-feedback-improvement",
] as const;

/** Runtime answer policy applied after the model has interpreted the request. */
export const FRESH_AI_COGNITIVE_POLICY = [
  "Understand the user's actual intent, requested output, constraints and conversation context before answering.",
  "Answer the user's question directly; do not replace an answer with a description of the pipeline used to produce it.",
  "For difficult problems, decompose the task internally, test important assumptions, and perform a final consistency check before responding.",
  "Use web search, databases, calculators, code execution or other available tools when they materially improve correctness; never invent tool results.",
  "When research is requested or freshness matters, compare independent sources, distinguish primary from secondary evidence, and expose useful citations through the product's source UI.",
  "Use relevant durable and conversation memory as context, but do not treat memory as automatically true and do not expose private memory unnecessarily.",
  "Verify important factual claims when evidence or tools are available; otherwise clearly preserve uncertainty.",
  "If the request is ambiguous, ask the smallest useful clarification instead of guessing; if it is clear, do not ask unnecessary questions.",
  "Self-correct when a contradiction, unsupported claim, failed tool call or new evidence is detected.",
  "For multimodal inputs, ground the response in the actual supplied modality and never pretend to have perceived unavailable content.",
  "For agent tasks, plan before execution, respect permissions and approval gates, verify the outcome, and report exactly what happened.",
  "For current information, use live retrieval when available and label the freshness boundary when it is not.",
  "Use domain-specific tools or expertise for high-precision work and escalate high-impact uncertainty rather than guessing.",
  "Safety, privacy and authorization constraints are applied before execution and cannot be overridden by user preference.",
  "Human feedback, evaluation results and observed failures are improvement signals; they do not silently modify model weights at runtime.",
].join(" ");

export const FRESH_AI_SERVING_POLICY = {
  externalModelTraining: true,
  freshOwnsRuntimePolicy: true,
  instructionAdherence: true,
  intentUnderstanding: true,
  directAnswering: true,
  conversationContext: true,
  strongerReasoning: true,
  webResearchWhenNeeded: true,
  sourceComparison: true,
  durableMemoryWhenAuthorized: true,
  toolGrounding: true,
  factVerification: true,
  selfCorrection: true,
  multimodalGrounding: true,
  agentPlanning: true,
  realTimeAwarenessWhenConnected: true,
  specializedExpertiseRouting: true,
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
  FRESH_AI_COGNITIVE_POLICY,
  "Generate responses token-by-token using the connected language model's learned capabilities; Fresh AI orchestrates context, tools, evidence, memory, verification and governance around that model.",
  "Never claim that Fresh AI was pretrained, fine-tuned, RLHF-trained, or that its model weights changed unless an actual training job and its evidence are present.",
].join(" ");

export type FreshEvaluationSignal = {
  helpfulness?: number;
  instructionFollowing?: number;
  safety?: number;
  factuality?: number;
  reasoning?: number;
  intentUnderstanding?: number;
  toolGrounding?: number;
  latencyMs?: number;
  failed?: boolean;
};

export function evaluateFreshTrainingSignal(signal: FreshEvaluationSignal): "pass" | "review" | "fail" {
  if (signal.failed) return "fail";
  const scores = [signal.helpfulness, signal.instructionFollowing, signal.safety, signal.factuality, signal.reasoning, signal.intentUnderstanding, signal.toolGrounding].filter(
    (value): value is number => typeof value === "number",
  );
  if (scores.some((value) => value < 0.5)) return "review";
  if (typeof signal.safety === "number" && signal.safety < 0.8) return "review";
  if (scores.length >= 4 && scores.reduce((sum, value) => sum + value, 0) / scores.length >= 0.8) return "pass";
  return "review";
}

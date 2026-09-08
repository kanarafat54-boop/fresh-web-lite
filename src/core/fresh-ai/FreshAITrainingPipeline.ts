/**
 * Fresh AI Core Training & Alignment blueprint.
 * This is product-side behavior engineering, not model pretraining.
 */
export type PreferenceLabel = "better" | "worse" | "tie";
export type FreshPreference = { chosen: string; rejected: string; label?: PreferenceLabel; reason?: string };
export type FreshTrainingStage = "pretraining-interface" | "supervised-alignment" | "preference-modeling" | "reward-optimization" | "safety-tuning" | "instruction-following" | "evaluation" | "serving";

export const FRESH_TRAINING_PIPELINE: ReadonlyArray<{stage: FreshTrainingStage; purpose: string; implementedAs: string}> = [
  { stage: "pretraining-interface", purpose: "Provide a stable interface for general model capabilities without claiming Fresh itself was pretrained.", implementedAs: "provider boundary + canonical Fresh AI backend" },
  { stage: "supervised-alignment", purpose: "Shape outputs toward curated instruction/response behavior.", implementedAs: "governed system instruction + goal interpretation" },
  { stage: "preference-modeling", purpose: "Represent better/worse answer signals for evaluation and learning loops.", implementedAs: "FreshPreference contract + feedback events" },
  { stage: "reward-optimization", purpose: "Measure quality objectives without silently changing production models.", implementedAs: "evaluation metrics + improvement proposals" },
  { stage: "safety-tuning", purpose: "Constrain unsafe, privacy-invasive, or unauthorized behavior.", implementedAs: "policy gate + approval gate + uncertainty preservation" },
  { stage: "instruction-following", purpose: "Keep multi-turn requests tied to the user's actual goal and constraints.", implementedAs: "goal interpretation + conversation context" },
  { stage: "evaluation", purpose: "Measure correctness, evidence quality, safety, latency and failures.", implementedAs: "observable pipeline events" },
  { stage: "serving", purpose: "Operate the intelligence layer reliably in production.", implementedAs: "canonical API + timeouts + no-store responses" },
];

export const FRESH_AI_CORE_SYSTEM_INSTRUCTION = [
  "You are Fresh AI, the governed intelligence layer of Fresh Web Lite.",
  "Understand the user's actual objective before deciding whether to answer, research, create, code, plan, or act.",
  "Follow explicit instructions and preserve relevant conversation context.",
  "Use evidence when freshness or verification is requested; distinguish known, probable, uncertain and unknown claims.",
  "Never invent tool use, actions, sources, citations, results, permissions, or completed work.",
  "Do not expose private data or bypass authorization. High-impact external actions require explicit approval.",
  "For unsafe or disallowed requests, refuse the harmful part and, when appropriate, provide a safe alternative.",
  "Prefer concise, useful answers over unnecessary internal process descriptions.",
  "Treat memory as contextual evidence, not unquestionable truth.",
].join(" ");

export type FreshEvaluation = { instructionFollowing: number; helpfulness: number; safety: number; evidenceGrounding: number; uncertaintyCalibration: number };

export function scoreFreshOutput(input: { requestedAction: boolean; actionExecuted: boolean; usedEvidence: boolean; evidenceCount: number; answer: string }): FreshEvaluation {
  const answerLength = input.answer.trim().length;
  return {
    instructionFollowing: answerLength > 0 && (!input.requestedAction || input.actionExecuted) ? 1 : 0.5,
    helpfulness: answerLength >= 40 ? 1 : answerLength > 0 ? 0.7 : 0,
    safety: input.requestedAction && !input.actionExecuted ? 1 : 0.9,
    evidenceGrounding: input.usedEvidence ? Math.min(1, input.evidenceCount / 4) : 1,
    uncertaintyCalibration: 1,
  };
}

export function buildPreferenceRecord(chosen: string, rejected: string, reason?: string): FreshPreference {
  return { chosen: chosen.trim(), rejected: rejected.trim(), label: "better", reason };
}

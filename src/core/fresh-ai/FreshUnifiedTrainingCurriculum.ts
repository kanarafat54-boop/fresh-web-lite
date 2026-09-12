/**
 * Mission-derived curriculum for training Fresh Unified Model.
 *
 * This is a training plan and data taxonomy, not a claim of trained weights.
 * The curriculum follows Fresh's product contract and Universal Power Fabric.
 */
import { FRESH_UNIFIED_MODEL } from "./FreshUnifiedModelCore.js";

export const FRESH_TRAINING_CURRICULUM = {
  id: "fresh-unified-curriculum-v1",
  modelId: FRESH_UNIFIED_MODEL.id,
  status: "starter-curriculum",
  dataPolicy: "synthetic-starter-plus-lawful-public-licensed-authorized-data",
  domains: [
    { id: "understanding", skills: ["intent", "constraints", "context", "clarification", "follow-up"] },
    { id: "conversation", skills: ["direct-answering", "coherence", "tone", "translation", "summarization"] },
    { id: "knowledge-research", skills: ["retrieval", "source-comparison", "citation", "evidence", "uncertainty"] },
    { id: "reasoning", skills: ["decomposition", "math", "logic", "causal-reasoning", "self-check"] },
    { id: "engineering", skills: ["code", "debugging", "architecture", "testing", "security"] },
    { id: "creation", skills: ["writing", "design", "image", "video", "audio", "editing"] },
    { id: "multimodal", skills: ["vision-grounding", "media-understanding", "cross-modal-context"] },
    { id: "planning-action", skills: ["planning", "tool-selection", "authorization", "execution", "verification"] },
    { id: "memory-learning", skills: ["context-memory", "privacy", "preference-use", "feedback", "self-correction"] },
    { id: "truth-truemode", skills: ["provenance", "contradiction", "perspectives", "investigation", "time-lenses", "discovery"] },
    { id: "safety-governance", skills: ["privacy", "policy", "risk", "refusal", "approval-boundaries", "auditability"] },
    { id: "specialized", skills: ["education", "strategy", "mathematics", "science", "communication", "automation"] },
  ],
  stages: ["foundation", "instruction", "reasoning", "grounded-research", "tool-use", "multimodal", "agent-planning", "safety", "preference-alignment", "evaluation", "serving-gate"],
  evaluationPrinciples: ["capability-coverage", "truthfulness", "grounding", "instruction-following", "safety", "tool-verification", "robustness", "regression-resistance"],
} as const;

export type FreshTrainingCurriculumDomain = (typeof FRESH_TRAINING_CURRICULUM.domains)[number];

export function assertFreshTrainingCurriculum(): void {
  if (FRESH_TRAINING_CURRICULUM.modelId !== "fresh-unified-1") throw new Error("Curriculum must target fresh-unified-1");
  if (FRESH_TRAINING_CURRICULUM.domains.length < 10) throw new Error("Fresh curriculum is missing major capability domains");
  if (!FRESH_TRAINING_CURRICULUM.stages.includes("evaluation")) throw new Error("Training must include evaluation");
  if (!FRESH_TRAINING_CURRICULUM.stages.includes("serving-gate")) throw new Error("Training must include a serving gate");
}

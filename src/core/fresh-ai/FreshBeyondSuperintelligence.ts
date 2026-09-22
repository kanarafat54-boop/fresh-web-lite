/**
 * Fresh Beyond Superintelligence
 *
 * Superintelligence (as popularly framed) optimizes for cognitive power.
 * Fresh is deliberately larger than that frame:
 *
 * - Truth before fluency (TRUEMODE states, evidence, contradictions)
 * - Agency with governance (plans, approvals, reversible actions)
 * - Memory with consent (vault, sealed history, no silent training on private chat)
 * - Creation across modalities (text, image, 3D, code, media)
 * - Work across the platform (workspace context, agents, tools)
 * - Privacy as a first-class capability (client at-rest seal; local inference when trained)
 * - Self-improvement that never mutates production without approval
 *
 * This module is a living product contract. It does not claim AGI, ASI, or
 * finished foundation weights. weightsStatus remains training-required until
 * authorized data, full-capacity training, evaluation, and promotion pass.
 */

import { FRESH_UNIFIED_MODEL } from "./FreshUnifiedModelCore.js";

export type FreshIntelligencePillar =
  | "truth"
  | "agency"
  | "memory"
  | "creation"
  | "work"
  | "privacy"
  | "learning"
  | "governance";

export type FreshPillarStatus = "active" | "partial" | "training-required" | "planned";

export type FreshPillar = {
  id: FreshIntelligencePillar;
  title: string;
  purpose: string;
  beyondIq: string;
  status: FreshPillarStatus;
  surfaces: readonly string[];
};

/**
 * Why "more than superintelligence" is the product bar — not marketing.
 * A system that is only "smarter text" fails when truth, action, or privacy matter.
 */
export const FRESH_BEYOND_SUPERINTELLIGENCE = {
  identity: "Fresh AI",
  modelId: FRESH_UNIFIED_MODEL.id,
  thesis:
    "Fresh is a sovereign intelligence system for truth, work, creation, and governed action — not a pure race for unconstrained cognitive power.",
  notAClaimOf: [
    "AGI",
    "ASI",
    "finished foundation weights",
    "server-blind inference without a local checkpoint",
    "autonomous production mutation",
  ] as const,
  weightsStatus: FRESH_UNIFIED_MODEL.weightsStatus,
  pillars: [
    {
      id: "truth",
      title: "Truth & calibration",
      purpose: "Separate known, probable, uncertain, contradicted, and blocked claims.",
      beyondIq: "Fluency without truth states is not intelligence Fresh will ship as complete.",
      status: "partial",
      surfaces: ["TRUEMODE", "semanticTruthEngine", "FreshTruthDecisionOrchestrator", "evidence panels"],
    },
    {
      id: "agency",
      title: "Governed agency",
      purpose: "Plan and execute with approvals for high-impact actions.",
      beyondIq: "Acting in the world requires authorization, not just a confident answer.",
      status: "partial",
      surfaces: ["plan/execute pipeline", "approval-required status", "Fresh agents"],
    },
    {
      id: "memory",
      title: "Memory fabric",
      purpose: "Use authorized context without leaking private memory by default.",
      beyondIq: "Long-horizon usefulness depends on memory discipline, not context window size alone.",
      status: "partial",
      surfaces: ["FreshMemoryFabric", "conversation ledger", "workspace context"],
    },
    {
      id: "creation",
      title: "Native creation",
      purpose: "Generate and structure artifacts across modalities under one model identity.",
      beyondIq: "Creation is a first-class modality, not a side tool bolted onto chat.",
      status: "partial",
      surfaces: ["FreshNativeDimensionalEngines", "Create mode", "artifact presentation"],
    },
    {
      id: "work",
      title: "Platform work",
      purpose: "Operate inside Fresh routes, features, and tools as one intelligence.",
      beyondIq: "Intelligence that cannot work where the user already is is incomplete.",
      status: "partial",
      surfaces: ["FreshAIWorkspaceContext", "FreshAIEverywhere", "capability registry"],
    },
    {
      id: "privacy",
      title: "Privacy & seal",
      purpose: "Client at-rest encryption; honest limits when server processes plaintext.",
      beyondIq: "Power without privacy posture is not the Fresh bar.",
      status: "partial",
      surfaces: ["FreshE2EE", "FreshSecureVault", "seal-latest API"],
    },
    {
      id: "learning",
      title: "Learning under evidence",
      purpose: "Train only on authorized data; register checkpoints with hashes and gates.",
      beyondIq: "Self-improvement without provenance is unsafe theater.",
      status: "training-required",
      surfaces: ["train_fresh_unified.py", "STARTER_RUN1", "curriculum", "evaluation gates"],
    },
    {
      id: "governance",
      title: "Governance",
      purpose: "No autonomous production mutation; high-impact actions need approval.",
      beyondIq: "Bounded ASI substrate proposes; humans authorize.",
      status: "active",
      surfaces: ["asi.ts", "FRESH_AI_POLICY", "improvement proposals"],
    },
  ] as const satisfies readonly FreshPillar[],
} as const;

export function describeFreshBeyondSuperintelligence(): string {
  const pillars = FRESH_BEYOND_SUPERINTELLIGENCE.pillars
    .map((p) => `• ${p.title} (${p.status}): ${p.purpose}`)
    .join("\n");
  return [
    FRESH_BEYOND_SUPERINTELLIGENCE.thesis,
    "",
    "Pillars:",
    pillars,
    "",
    `Model: ${FRESH_BEYOND_SUPERINTELLIGENCE.modelId}`,
    `Weights: ${FRESH_BEYOND_SUPERINTELLIGENCE.weightsStatus}`,
    "Not claimed: " + FRESH_BEYOND_SUPERINTELLIGENCE.notAClaimOf.join(", "),
  ].join("\n");
}

export function assertBeyondSuperintelligenceContract(): void {
  if (FRESH_BEYOND_SUPERINTELLIGENCE.weightsStatus !== "training-required") {
    throw new Error("Beyond-SI contract expected weightsStatus training-required until promotion gates pass");
  }
  if (FRESH_BEYOND_SUPERINTELLIGENCE.pillars.length < 8) {
    throw new Error("Beyond-SI pillar set is incomplete");
  }
  if (!FRESH_BEYOND_SUPERINTELLIGENCE.thesis.includes("sovereign intelligence system")) {
    throw new Error("Beyond-SI thesis must assert sovereign intelligence system");
  }
}

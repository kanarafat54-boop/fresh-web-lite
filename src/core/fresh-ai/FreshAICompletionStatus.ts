/**
 * Honest completion matrix for Fresh AI application layer.
 *
 * Readiness is capability-specific. Repository architecture and contract tests
 * do not prove that every capability is production-ready or live-verified.
 * Do not publish a single completion percentage for the overall product.
 */

import { FRESH_UNIFIED_MODEL } from "./FreshUnifiedModelCore.js";
import { FRESH_BEYOND_SUPERINTELLIGENCE } from "./FreshBeyondSuperintelligence.js";

export type CompletionItem = {
  id: string;
  area: string;
  status: "done" | "partial" | "blocked" | "training-required";
  note: string;
};

export const FRESH_AI_COMPLETION: {
  claim: string;
  items: readonly CompletionItem[];
} = {
  claim:
    "Fresh AI has a substantial architectural foundation, but production readiness is not established. Completion is capability-specific; unverified aggregate percentages are not used.",
  items: [
    {
      id: "chat-gateway",
      area: "Intelligence gateway + ask API",
      status: "partial",
      note: "Canonical /api/ai/ask → gateway exists; production request success and persistence still require configured-environment smoke tests",
    },
    {
      id: "ui-unified",
      area: "FreshAIUnified UI",
      status: "partial",
      note: "Unified composer, modes, evidence, approvals and vault bar exist; browser/accessibility verification remains open",
    },
    {
      id: "e2ee-at-rest",
      area: "Client at-rest encryption",
      status: "done",
      note: "AES-256-GCM + PBKDF2; seal-latest; salt/kid persistence for re-unlock",
    },
    {
      id: "e2ee-live",
      area: "Server-blind live inference",
      status: "blocked",
      note: "Requires on-device checkpoint; live /api/ai still sees plaintext goal",
    },
    {
      id: "truth",
      area: "TRUEMODE / truth orchestration",
      status: "partial",
      note: "Semantic truth engine + evidence panels; deeper UI labels optional",
    },
    {
      id: "governance",
      area: "Governed actions + ASI substrate",
      status: "partial",
      note: "Approval gates and fail-closed runtime exist; live tool execution, audit and rollback coverage remain incomplete",
    },
    {
      id: "beyond-si",
      area: "Beyond Superintelligence doctrine",
      status: "done",
      note: "Eight pillars codified; not a claim of AGI/ASI",
    },
    {
      id: "weights",
      area: "fresh-unified-1 foundation weights",
      status: "training-required",
      note: `Status: ${FRESH_UNIFIED_MODEL.weightsStatus}; starter-run1 is pipeline evidence only`,
    },
    {
      id: "privacy-vault",
      area: "Vault unlock / lock / seal",
      status: "done",
      note: "Passphrase + ephemeral; sealed turns via conversations API",
    },
    {
      id: "workspace",
      area: "Workspace-aware context",
      status: "partial",
      note: "Route/surface/capabilities enter the request pipeline; cross-feature context and end-to-end persistence still need verification",
    },
  ],
} as const;

export function summarizeFreshAICompletion(): string {
  const lines = FRESH_AI_COMPLETION.items.map(
    (item) => `[${item.status}] ${item.area}: ${item.note}`,
  );
  return [
    "Fresh AI readiness: capability-specific; no overall completion percentage",
    FRESH_AI_COMPLETION.claim,
    `Model: ${FRESH_UNIFIED_MODEL.id} · weights: ${FRESH_UNIFIED_MODEL.weightsStatus}`,
    `Doctrine: ${FRESH_BEYOND_SUPERINTELLIGENCE.thesis}`,
    "",
    ...lines,
  ].join("\n");
}

export function assertFreshAICompletionHonesty(): void {
  if ("appLayerPercent" in FRESH_AI_COMPLETION) {
    throw new Error("Do not use an unverified overall completion percentage");
  }
  const weights = FRESH_AI_COMPLETION.items.find((item) => item.id === "weights");
  if (weights?.status !== "training-required") {
    throw new Error("Weights item must remain training-required until promotion");
  }
  const live = FRESH_AI_COMPLETION.items.find((item) => item.id === "e2ee-live");
  if (live?.status !== "blocked") {
    throw new Error("Live server-blind E2EE must stay blocked until local inference");
  }
}

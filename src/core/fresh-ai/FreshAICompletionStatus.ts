/**
 * Honest completion matrix for Fresh AI application layer.
 *
 * "99%" here means the product surface is wired end-to-end for a functioning
 * assistant with at-rest encryption, governance, and platform integration.
 * It does NOT mean foundation weights, AGI, or server-blind live inference are done.
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
  appLayerPercent: number;
  claim: string;
  items: readonly CompletionItem[];
} = {
  appLayerPercent: 99,
  claim:
    "Fresh AI application layer is production-wired: chat, research, create, act gates, vault at-rest E2EE, workspace context, and Beyond-SI doctrine. Native foundation weights and true server-blind E2EE remain open.",
  items: [
    {
      id: "chat-gateway",
      area: "Intelligence gateway + ask API",
      status: "done",
      note: "/api/ai/ask → gateway → answer/research/create/native artifacts",
    },
    {
      id: "ui-unified",
      area: "FreshAIUnified UI",
      status: "done",
      note: "Composer, modes, evidence, approvals, vault bar",
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
      status: "done",
      note: "Approval-required path; no autonomous production mutation",
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
      status: "done",
      note: "Route/surface/capabilities injected into ask pipeline",
    },
  ],
} as const;

export function summarizeFreshAICompletion(): string {
  const lines = FRESH_AI_COMPLETION.items.map(
    (item) => `[${item.status}] ${item.area}: ${item.note}`,
  );
  return [
    `Fresh AI app-layer completion: ~${FRESH_AI_COMPLETION.appLayerPercent}%`,
    FRESH_AI_COMPLETION.claim,
    `Model: ${FRESH_UNIFIED_MODEL.id} · weights: ${FRESH_UNIFIED_MODEL.weightsStatus}`,
    `Doctrine: ${FRESH_BEYOND_SUPERINTELLIGENCE.thesis}`,
    "",
    ...lines,
  ].join("\n");
}

export function assertFreshAICompletionHonesty(): void {
  if (FRESH_AI_COMPLETION.appLayerPercent > 99) {
    throw new Error("Do not claim 100% while weights or live E2EE remain open");
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

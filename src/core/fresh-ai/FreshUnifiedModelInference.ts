/**
 * Canonical Fresh Unified Model inference boundary.
 *
 * This is the only serving contract that may turn a registered
 * `fresh-unified-1` checkpoint into model output. It intentionally has no
 * provider SDK dependency and never falls back to another model.
 *
 * A real checkpoint backend can be attached later without changing product
 * contracts, capability routing, or API callers.
 */
import { FRESH_UNIFIED_MODEL } from "./FreshUnifiedModelCore.js";

export type FreshUnifiedModality = (typeof FRESH_UNIFIED_MODEL.modalities)[number];

export type FreshUnifiedInferenceRequest = {
  modality: FreshUnifiedModality;
  input: string;
  checkpointId?: string | null;
  maxTokens?: number;
};

export type FreshUnifiedInferenceResult = {
  modelId: "fresh-unified-1";
  modality: FreshUnifiedModality;
  native: true;
  status: "ready" | "training-required";
  checkpointId: string | null;
  text?: string;
  reason?: string;
};

export const FRESH_UNIFIED_INFERENCE_RUNTIME = {
  id: "fresh-unified-inference-runtime",
  modelId: FRESH_UNIFIED_MODEL.id,
  providerIndependent: true,
  externalProviderRequired: false,
  checkpointEnv: "FRESH_UNIFIED_CHECKPOINT_ID",
} as const;

function registeredCheckpoint(explicit?: string | null): string | null {
  const value = explicit?.trim() || process.env.FRESH_UNIFIED_CHECKPOINT_ID?.trim();
  return value || null;
}

export function inferFreshUnified(request: FreshUnifiedInferenceRequest): FreshUnifiedInferenceResult {
  if (!request.input.trim()) throw new Error("Fresh Unified inference requires input");

  const checkpointId = registeredCheckpoint(request.checkpointId);
  if (!checkpointId) {
    return {
      modelId: "fresh-unified-1",
      modality: request.modality,
      native: true,
      status: "training-required",
      checkpointId: null,
      reason: "No Fresh-trained checkpoint is registered."
    };
  }

  // Do not fake inference. A backend must load the Fresh checkpoint and execute
  // its weights here before this boundary can report `ready`.
  return {
    modelId: "fresh-unified-1",
    modality: request.modality,
    native: true,
    status: "training-required",
    checkpointId,
    reason: "Checkpoint is registered, but the native neural backend is not installed."
  };
}

export function assertFreshUnifiedInferenceIntegrity(): void {
  if (FRESH_UNIFIED_INFERENCE_RUNTIME.modelId !== FRESH_UNIFIED_MODEL.id) {
    throw new Error("Fresh inference must use fresh-unified-1");
  }
  if (!FRESH_UNIFIED_INFERENCE_RUNTIME.providerIndependent || FRESH_UNIFIED_INFERENCE_RUNTIME.externalProviderRequired) {
    throw new Error("Fresh inference cannot require an external provider");
  }
}

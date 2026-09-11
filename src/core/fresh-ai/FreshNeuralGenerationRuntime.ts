/**
 * Fresh-owned neural generation runtime boundary.
 *
 * `fresh-unified-1` remains the single model identity. Image and avatar creation
 * are modalities/heads of that model, not provider-specific bots.
 *
 * This runtime deliberately refuses to fabricate an image until a Fresh-trained
 * checkpoint is installed. Training and checkpoint serving are the next phase.
 */
import { FRESH_UNIFIED_MODEL } from "./FreshUnifiedModelCore.js";

export type FreshNeuralGenerationKind = "image" | "avatar";
export type FreshNeuralGenerationRequest = {
  kind: FreshNeuralGenerationKind;
  prompt: string;
  userId?: string;
  referenceImage?: { mimeType: string; bytes: Uint8Array };
  size?: "1024x1024" | "1024x1536" | "1536x1024" | "auto";
};

export type FreshNeuralGenerationResult = {
  modelId: "fresh-unified-1";
  kind: FreshNeuralGenerationKind;
  native: true;
  status: "ready" | "training-required";
  checkpointId: string | null;
  output?: { b64Json: string; mimeType: "image/png" };
  reason?: string;
};

export const FRESH_NEURAL_GENERATION_RUNTIME = {
  id: "fresh-neural-generation-runtime",
  version: "0.1.0",
  modelId: FRESH_UNIFIED_MODEL.id,
  owner: "Fresh AI",
  providerIndependent: true,
  externalProviderRequired: false,
  supportedKinds: ["image", "avatar"] as const,
  checkpointSource: "fresh-trained",
  checkpointEnv: "FRESH_UNIFIED_CHECKPOINT_ID",
} as const;

function checkpointId(): string | null {
  const value = process.env.FRESH_UNIFIED_CHECKPOINT_ID?.trim();
  return value || null;
}

export function generateFreshNeuralMedia(request: FreshNeuralGenerationRequest): FreshNeuralGenerationResult {
  if (!request.prompt.trim()) throw new Error("Fresh neural generation requires a prompt");
  const checkpoint = checkpointId();
  if (!checkpoint) {
    return {
      modelId: "fresh-unified-1",
      kind: request.kind,
      native: true,
      status: "training-required",
      checkpointId: null,
      reason: "No Fresh-trained checkpoint is installed. Train and register the Fresh Unified checkpoint before serving neural image generation.",
    };
  }
  // The checkpoint-backed inference implementation is intentionally the next
  // training/serving phase. Never substitute a provider API or procedural SVG.
  return {
    modelId: "fresh-unified-1",
    kind: request.kind,
    native: true,
    status: "training-required",
    checkpointId: checkpoint,
    reason: "Checkpoint is registered, but its neural inference backend is not yet enabled in this runtime.",
  };
}

export function assertFreshNeuralGenerationIntegrity(): void {
  if (FRESH_NEURAL_GENERATION_RUNTIME.modelId !== FRESH_UNIFIED_MODEL.id) throw new Error("Neural generation must use the Fresh Unified Model");
  if (!FRESH_NEURAL_GENERATION_RUNTIME.providerIndependent || FRESH_NEURAL_GENERATION_RUNTIME.externalProviderRequired) throw new Error("Fresh neural generation cannot require an external provider");
}

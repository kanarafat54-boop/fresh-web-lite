/**
 * Fresh Unified Model Core
 *
 * Fresh AI has ONE model identity. Capabilities are modalities/skills of that
 * model, not separate vendor brains. This contract is deliberately provider-
 * independent: an eventual Fresh-trained checkpoint can implement it directly,
 * while today's native engines provide deterministic execution where available.
 *
 * IMPORTANT: this file does not pretend that TypeScript is a foundation-model
 * checkpoint. It defines the sovereign model boundary that the real trained
 * Fresh model/runtime will implement.
 */

export type FreshModelModality =
  | "text"
  | "vision"
  | "image"
  | "3d"
  | "video"
  | "audio"
  | "code"
  | "simulation"
  | "action";

export type FreshUnifiedModelRequest = {
  input: string;
  modalities?: readonly FreshModelModality[];
  context?: Record<string, unknown>;
  attachments?: readonly unknown[];
  sessionId?: string;
  requestId?: string;
};

export type FreshUnifiedModelResult = {
  modelId: "fresh-unified-1";
  modelFamily: "fresh-unified";
  native: true;
  modalities: FreshModelModality[];
  answer?: string;
  artifacts: readonly unknown[];
  engineTrace: readonly string[];
};

/**
 * The single-model contract. There is intentionally no provider/model key in
 * the request: Fresh owns the model identity and chooses internal execution.
 */
export interface FreshUnifiedModel {
  readonly id: "fresh-unified-1";
  readonly family: "fresh-unified";
  infer(request: FreshUnifiedModelRequest): Promise<FreshUnifiedModelResult>;
}

/**
 * Registry metadata for the sovereign model. This is the point at which a
 * future trained Fresh checkpoint, tokenizer, accelerator runtime and weights
 * are attached without changing the product/API contract.
 */
export const FRESH_UNIFIED_MODEL = {
  id: "fresh-unified-1",
  family: "fresh-unified",
  owner: "Fresh AI",
  providerIndependent: true,
  externalProviderRequired: false,
  modalities: [
    "text", "vision", "image", "3d", "video", "audio", "code",
    "simulation", "action",
  ] as const,
  architectureStatus: "sovereign-runtime-contract",
  weightsStatus: "future-fresh-trained-checkpoint",
} as const;

export function assertFreshUnifiedModelIntegrity(): void {
  if (FRESH_UNIFIED_MODEL.owner !== "Fresh AI") {
    throw new Error("Fresh Unified Model must be owned by Fresh AI");
  }
  if (FRESH_UNIFIED_MODEL.providerIndependent !== true || FRESH_UNIFIED_MODEL.externalProviderRequired !== false) {
    throw new Error("Fresh Unified Model cannot require an external AI provider");
  }
  if (new Set(FRESH_UNIFIED_MODEL.modalities).size !== FRESH_UNIFIED_MODEL.modalities.length) {
    throw new Error("Fresh Unified Model contains duplicate modalities");
  }
}

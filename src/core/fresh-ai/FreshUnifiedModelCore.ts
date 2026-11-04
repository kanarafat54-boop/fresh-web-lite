/**
 * Fresh Unified Model Core
 *
 * Fresh AI has ONE model identity. Capabilities are modalities/skills of that
 * model, not separate vendor brains. This contract is deliberately provider-
 * independent: the Fresh-trained checkpoint implements it directly.
 *
 * IMPORTANT: this file does not pretend that TypeScript is a foundation-model
 * checkpoint. It defines the sovereign model boundary that the trained Fresh
 * model/runtime implements.
 */

export type FreshModelModality =
  | "text" | "vision" | "image" | "3d" | "video" | "audio" | "code" | "simulation" | "action";

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

export interface FreshUnifiedModel {
  readonly id: "fresh-unified-1";
  readonly family: "fresh-unified";
  infer(request: FreshUnifiedModelRequest): Promise<FreshUnifiedModelResult>;
}

/** The single attachment point for the future Fresh-trained checkpoint. */
export const FRESH_UNIFIED_MODEL = {
  id: "fresh-unified-1",
  family: "fresh-unified",
  owner: "Fresh AI",
  providerIndependent: true,
  externalProviderRequired: false,
  modalities: ["text", "vision", "image", "3d", "video", "audio", "code", "simulation", "action"] as const,
  architectureStatus: "training-ready-sovereign-runtime",
  weightsStatus: "training-required",
  /** Latest completed from-scratch training run. It is real but not production-promoted. */
  latestTrainingRunId: "fresh-unified-1-run3",
  latestCheckpointSha256: "298b558e89edab77745834389cb2b1979e632979f9be7b4adad1892c2f2fc25d",
  latestTrainingPerplexity: 41.96267214492321,
  latestTrainingParameters: 49947136,
  latestTrainingStatus: "completed-not-promoted",
  checkpointEnv: "FRESH_UNIFIED_CHECKPOINT_ID",
} as const;

export function assertFreshUnifiedModelIntegrity(): void {
  if (FRESH_UNIFIED_MODEL.owner !== "Fresh AI") throw new Error("Fresh Unified Model must be owned by Fresh AI");
  if (FRESH_UNIFIED_MODEL.providerIndependent !== true || FRESH_UNIFIED_MODEL.externalProviderRequired !== false) throw new Error("Fresh Unified Model cannot require an external AI provider");
  if (new Set(FRESH_UNIFIED_MODEL.modalities).size !== FRESH_UNIFIED_MODEL.modalities.length) throw new Error("Fresh Unified Model contains duplicate modalities");
  if (!FRESH_UNIFIED_MODEL.checkpointEnv) throw new Error("Fresh Unified Model checkpoint registration is missing");
}

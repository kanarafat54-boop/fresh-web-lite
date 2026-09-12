/**
 * Fresh Unified Model training/checkpoint contract.
 *
 * This module is intentionally provider-independent. It does not pretend that
 * TypeScript contracts are model weights; it defines the executable boundary
 * that a real Fresh training backend must satisfy.
 */
import { FRESH_UNIFIED_MODEL } from "./FreshUnifiedModelCore.js";

export type FreshTrainingExample = {
  id: string;
  input: string;
  target: string;
  metadata?: Record<string, string>;
};

export type FreshTrainingConfig = {
  modelId: "fresh-unified-1";
  datasetId: string;
  outputCheckpointId: string;
  epochs: number;
  learningRate: number;
  seed: number;
};

export type FreshCheckpointManifest = {
  modelId: "fresh-unified-1";
  checkpointId: string;
  datasetId: string;
  format: "fresh-unified-checkpoint-v1";
  status: "registered" | "validated";
};

export const FRESH_TRAINING_CONTRACT = {
  id: "fresh-unified-training-v1",
  modelId: FRESH_UNIFIED_MODEL.id,
  owner: "Fresh AI",
  providerIndependent: true,
  requiresExternalModelProvider: false,
  checkpointEnv: "FRESH_UNIFIED_CHECKPOINT_ID",
  checkpointFormat: "fresh-unified-checkpoint-v1",
} as const;

export function validateFreshTrainingConfig(config: FreshTrainingConfig): void {
  if (config.modelId !== FRESH_UNIFIED_MODEL.id) throw new Error("Training must target fresh-unified-1");
  if (!config.datasetId.trim()) throw new Error("Training requires a dataset ID");
  if (!config.outputCheckpointId.trim()) throw new Error("Training requires an output checkpoint ID");
  if (!Number.isFinite(config.epochs) || config.epochs < 1) throw new Error("epochs must be >= 1");
  if (!Number.isFinite(config.learningRate) || config.learningRate <= 0) throw new Error("learningRate must be > 0");
}

export function validateFreshCheckpointManifest(manifest: FreshCheckpointManifest): void {
  if (manifest.modelId !== FRESH_UNIFIED_MODEL.id) throw new Error("Checkpoint belongs to a different model");
  if (!manifest.checkpointId.trim()) throw new Error("Checkpoint ID is required");
  if (!manifest.datasetId.trim()) throw new Error("Checkpoint dataset ID is required");
  if (manifest.format !== FRESH_TRAINING_CONTRACT.checkpointFormat) throw new Error("Unsupported Fresh checkpoint format");
  if (manifest.status !== "registered" && manifest.status !== "validated") throw new Error("Invalid checkpoint status");
}

export function assertFreshTrainingContract(): void {
  if (FRESH_TRAINING_CONTRACT.modelId !== FRESH_UNIFIED_MODEL.id) throw new Error("Training must use the Fresh Unified Model");
  if (!FRESH_TRAINING_CONTRACT.providerIndependent || FRESH_TRAINING_CONTRACT.requiresExternalModelProvider) throw new Error("Fresh training cannot require an external model provider");
}

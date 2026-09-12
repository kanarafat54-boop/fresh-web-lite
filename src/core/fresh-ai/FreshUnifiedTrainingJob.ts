/**
 * Executable specification for a real Fresh Unified Model training run.
 *
 * This is a provider-neutral job contract. It records the inputs and gates a
 * backend must honor; it does not simulate training or claim that weights exist.
 */
import { FRESH_UNIFIED_MODEL } from "./FreshUnifiedModelCore.js";

export const FRESH_TRAINING_JOB_CONTRACT = {
  id: "fresh-unified-training-job-v1",
  modelId: FRESH_UNIFIED_MODEL.id,
  providerIndependent: true,
  requiresExternalModelProvider: false,
} as const;

export type FreshTrainingJobStatus =
  | "planned" | "queued" | "running" | "evaluating" | "validated" | "failed";

export type FreshTrainingJob = {
  jobId: string;
  modelId: "fresh-unified-1";
  datasetId: string;
  datasetSha256: string;
  curriculumId: string;
  tokenizer: { name: string; version: string };
  seed: number;
  epochs: number;
  steps?: number;
  learningRate: number;
  batchSize: number;
  microBatchSize: number;
  sequenceLength: number;
  precision: "fp32" | "fp16" | "bf16";
  outputCheckpointId: string;
  evaluationGateIds: string[];
  safetyGateIds: string[];
  requiredDataLicenses: string[];
  hardware: { accelerator: string; minimumCount: number; minimumVramGb: number };
  status: FreshTrainingJobStatus;
};

export function validateFreshTrainingJob(job: FreshTrainingJob): void {
  if (job.modelId !== FRESH_UNIFIED_MODEL.id) throw new Error("Training job must target fresh-unified-1");
  if (!job.jobId.trim() || !job.datasetId.trim() || !job.datasetSha256.trim()) throw new Error("Training job identity and dataset digest are required");
  if (!job.curriculumId.trim() || !job.outputCheckpointId.trim()) throw new Error("Curriculum and checkpoint IDs are required");
  if (!job.tokenizer.name.trim() || !job.tokenizer.version.trim()) throw new Error("Tokenizer name and version are required");
  if (!Number.isInteger(job.seed) || job.seed < 0) throw new Error("seed must be a non-negative integer");
  if (!Number.isFinite(job.learningRate) || job.learningRate <= 0) throw new Error("learningRate must be > 0");
  if (!Number.isInteger(job.epochs) || job.epochs < 1) throw new Error("epochs must be >= 1");
  if (job.steps !== undefined && (!Number.isInteger(job.steps) || job.steps < 1)) throw new Error("steps must be >= 1 when supplied");
  for (const [name, value] of [["batchSize", job.batchSize], ["microBatchSize", job.microBatchSize], ["sequenceLength", job.sequenceLength]] as const) {
    if (!Number.isInteger(value) || value < 1) throw new Error(`${name} must be >= 1`);
  }
  if (job.microBatchSize > job.batchSize) throw new Error("microBatchSize cannot exceed batchSize");
  if (job.evaluationGateIds.length === 0 || job.safetyGateIds.length === 0) throw new Error("Training requires evaluation and safety gates");
  if (job.requiredDataLicenses.length === 0) throw new Error("Training requires explicit data provenance/license policy");
  if (!job.hardware.accelerator.trim() || !Number.isInteger(job.hardware.minimumCount) || job.hardware.minimumCount < 1 || !Number.isFinite(job.hardware.minimumVramGb) || job.hardware.minimumVramGb <= 0) throw new Error("Hardware requirements are invalid");
}

export function assertFreshTrainingJobContract(): void {
  if (FRESH_TRAINING_JOB_CONTRACT.modelId !== FRESH_UNIFIED_MODEL.id || !FRESH_TRAINING_JOB_CONTRACT.providerIndependent || FRESH_TRAINING_JOB_CONTRACT.requiresExternalModelProvider) {
    throw new Error("Fresh training jobs must remain sovereign and provider-independent");
  }
}

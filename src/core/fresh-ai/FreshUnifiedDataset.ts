/**
 * Fresh Unified Model dataset contract and deterministic preparation helpers.
 *
 * This prepares data for a real Fresh training backend. It does not claim to
 * contain model weights and never treats ChatGPT/Gemini/provider output as the
 * Fresh model itself.
 */
import { createHash } from "node:crypto";
import type { FreshTrainingExample } from "./FreshUnifiedModelTraining.js";
import { FRESH_UNIFIED_MODEL } from "./FreshUnifiedModelCore.js";

export type FreshDatasetManifest = {
  datasetId: string;
  modelId: "fresh-unified-1";
  format: "fresh-unified-jsonl-v1";
  exampleCount: number;
  sha256: string;
  status: "validated";
};

export const FRESH_DATASET_CONTRACT = {
  id: "fresh-unified-dataset-v1",
  modelId: FRESH_UNIFIED_MODEL.id,
  providerIndependent: true,
  acceptedFormat: "fresh-unified-jsonl-v1",
} as const;

export function validateFreshTrainingExamples(examples: FreshTrainingExample[]): void {
  if (!examples.length) throw new Error("Fresh dataset must contain at least one example");
  const ids = new Set<string>();
  for (const example of examples) {
    if (!example.id.trim()) throw new Error("Every dataset example requires an id");
    if (ids.has(example.id)) throw new Error(`Duplicate dataset example id: ${example.id}`);
    ids.add(example.id);
    if (!example.input.trim()) throw new Error(`Dataset example ${example.id} has empty input`);
    if (!example.target.trim()) throw new Error(`Dataset example ${example.id} has empty target`);
  }
}

export function buildFreshDatasetManifest(datasetId: string, examples: FreshTrainingExample[]): FreshDatasetManifest {
  if (!datasetId.trim()) throw new Error("Dataset ID is required");
  validateFreshTrainingExamples(examples);
  const canonical = examples.map((e) => JSON.stringify({ id: e.id, input: e.input, target: e.target, metadata: e.metadata ?? {} })).join("\n");
  return {
    datasetId,
    modelId: "fresh-unified-1",
    format: "fresh-unified-jsonl-v1",
    exampleCount: examples.length,
    sha256: createHash("sha256").update(canonical).digest("hex"),
    status: "validated",
  };
}

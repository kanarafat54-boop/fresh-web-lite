/** Fresh Unified Model evaluation contract. */
import { FRESH_UNIFIED_MODEL } from "./FreshUnifiedModelCore.js";

export type FreshEvaluationCase = {
  id: string;
  input: string;
  expectedBehavior: string;
  tags: string[];
};

export type FreshEvaluationReport = {
  modelId: "fresh-unified-1";
  checkpointId: string;
  datasetId: string;
  caseCount: number;
  passed: number;
  score: number;
  status: "passed" | "failed";
};

export const FRESH_EVALUATION_CONTRACT = {
  id: "fresh-unified-evaluation-v1",
  modelId: FRESH_UNIFIED_MODEL.id,
  providerIndependent: true,
  requiresExternalModelProvider: false,
  minimumScore: 0.8,
} as const;

export function buildFreshEvaluationReport(input: Omit<FreshEvaluationReport, "modelId" | "score" | "status">): FreshEvaluationReport {
  if (input.caseCount < 1) throw new Error("Evaluation requires at least one case");
  if (input.passed < 0 || input.passed > input.caseCount) throw new Error("Invalid evaluation pass count");
  if (!input.checkpointId.trim()) throw new Error("Evaluation requires a checkpoint ID");
  if (!input.datasetId.trim()) throw new Error("Evaluation requires a dataset ID");
  const score = input.passed / input.caseCount;
  return {
    ...input,
    modelId: "fresh-unified-1",
    score,
    status: score >= FRESH_EVALUATION_CONTRACT.minimumScore ? "passed" : "failed",
  };
}

/**
 * Fresh Unified Model Runtime.
 *
 * This is the executable sovereign boundary for fresh-unified-1. It does not
 * pretend that deterministic TypeScript is a trained foundation model. A
 * trained checkpoint/runtime can be attached here later without changing the
 * product contract. Native Fresh engines are used directly when they can
 * satisfy the request without an external model provider.
 */
import { FRESH_UNIFIED_MODEL, type FreshModelModality, type FreshUnifiedModel, type FreshUnifiedModelRequest, type FreshUnifiedModelResult } from "./FreshUnifiedModelCore.js";
import { detectFreshNativeDimension, generateFreshNativeDimensionalArtifact } from "./FreshNativeDimensionalEngines.js";
import { FreshReasoningEngine } from "../ai/FreshReasoningEngine.js";

export type FreshUnifiedModelRuntimeOptions = {
  trainedInference?: (request: FreshUnifiedModelRequest) => Promise<FreshUnifiedModelResult>;
};

const modalityForDimension = (dimension: number): FreshModelModality => dimension === 2 || dimension === 3 ? "3d" : dimension === 4 ? "video" : "simulation";

export class FreshUnifiedModelRuntime implements FreshUnifiedModel {
  readonly id = FRESH_UNIFIED_MODEL.id;
  readonly family = FRESH_UNIFIED_MODEL.family;
  private readonly trainedInference?: FreshUnifiedModelRuntimeOptions["trainedInference"];

  constructor(options: FreshUnifiedModelRuntimeOptions = {}) {
    this.trainedInference = options.trainedInference;
  }

  async infer(request: FreshUnifiedModelRequest): Promise<FreshUnifiedModelResult> {
    const input = request.input.trim();
    if (!input) throw new Error("Fresh Unified Model requires non-empty input");

    if (this.trainedInference) return this.trainedInference(request);

    const dimension = detectFreshNativeDimension(input);
    if (dimension !== undefined) {
      const artifact = generateFreshNativeDimensionalArtifact(input, dimension);
      if (artifact) {
        return {
          modelId: this.id,
          modelFamily: this.family,
          native: true,
          modalities: [modalityForDimension(dimension)],
          artifacts: [artifact],
          engineTrace: ["fresh-unified-1", artifact.engine, "fresh-native-execution"],
        };
      }
    }

    // Native reasoning is an internal capability of the single Fresh model,
    // not a second model identity. Keep this result structured until a trained
    // checkpoint is attached so the runtime never fabricates generated text.
    const reasoning = new FreshReasoningEngine();
    const analysis = reasoning.reason({ input, context: request.context ?? {} });
    return {
      modelId: this.id,
      modelFamily: this.family,
      native: true,
      modalities: ["text", "code", "simulation"],
      answer: analysis.explanation,
      artifacts: [],
      engineTrace: ["fresh-unified-1", "fresh-native-reasoning-substrate"],
    };
  }
}

export const FRESH_UNIFIED_MODEL_RUNTIME = new FreshUnifiedModelRuntime();

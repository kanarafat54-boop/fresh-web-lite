/**
 * Fresh Unified Model Runtime.
 *
 * Executable sovereign boundary for fresh-unified-1. Native Fresh engines are
 * used directly when they can satisfy a request without an external provider.
 * A trained Fresh checkpoint can later be attached through trainedInference.
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

  constructor(options: FreshUnifiedModelRuntimeOptions = {}) { this.trainedInference = options.trainedInference; }

  async infer(request: FreshUnifiedModelRequest): Promise<FreshUnifiedModelResult> {
    const input = request.input.trim();
    if (!input) throw new Error("Fresh Unified Model requires non-empty input");
    if (this.trainedInference) return this.trainedInference(request);

    const dimension = detectFreshNativeDimension(input);
    if (dimension !== undefined) {
      const artifact = generateFreshNativeDimensionalArtifact(input, dimension);
      if (artifact) return {
        modelId: this.id,
        modelFamily: this.family,
        native: true,
        modalities: [modalityForDimension(dimension)],
        artifacts: [artifact],
        engineTrace: ["fresh-unified-1", artifact.engine, "fresh-native-execution"],
      };
    }

    const reasoning = new FreshReasoningEngine();
    const analysis = reasoning.reason(input, request.context ?? {});
    return {
      modelId: this.id,
      modelFamily: this.family,
      native: true,
      modalities: ["text", "code", "simulation"],
      answer: analysis.conclusion,
      artifacts: [],
      engineTrace: ["fresh-unified-1", "fresh-native-reasoning-substrate"],
    };
  }
}

export const FRESH_UNIFIED_MODEL_RUNTIME = new FreshUnifiedModelRuntime();

/**
 * Canonical registry and execution boundary for Fresh-owned generation.
 *
 * Native generation is deterministic and dependency-free. It is intentionally
 * separate from provider adapters: external models may enrich interoperability,
 * but native dimensional generation does not require a provider API key.
 */
import {
  FRESH_NATIVE_DIMENSIONAL_ENGINES,
  generateFreshNativeDimensionalArtifact,
  detectFreshNativeDimension,
  type FreshDimensionalArtifact,
  type FreshNativeDimension,
} from "./FreshNativeDimensionalEngines.js";

export type FreshNativeGenerationRequest = {
  input: string;
  dimension?: FreshNativeDimension;
  userId?: string;
  route?: string;
};

export type FreshNativeGenerationResult = {
  provider: "fresh-native";
  source: "fresh-native-engine";
  native: true;
  dimension: FreshNativeDimension;
  engine: string;
  artifact: FreshDimensionalArtifact;
};

export const FRESH_NATIVE_GENERATION_FABRIC = {
  id: "fresh-native-generation",
  name: "Fresh Native Generation Fabric",
  version: "1.0",
  providerIndependent: true,
  dimensions: FRESH_NATIVE_DIMENSIONAL_ENGINES,
} as const;

export function resolveFreshNativeGeneration(input: string, dimension?: FreshNativeDimension) {
  const resolvedDimension = dimension ?? detectFreshNativeDimension(input);
  if (!resolvedDimension) return undefined;
  const engine = FRESH_NATIVE_DIMENSIONAL_ENGINES.find((item) => item.dimension === resolvedDimension);
  if (!engine) return undefined;
  return { dimension: resolvedDimension, engine };
}

export function generateFreshNative(request: FreshNativeGenerationRequest): FreshNativeGenerationResult | undefined {
  const resolved = resolveFreshNativeGeneration(request.input, request.dimension);
  if (!resolved) return undefined;
  const artifact = generateFreshNativeDimensionalArtifact(request.input, resolved.dimension);
  if (!artifact) return undefined;
  return {
    provider: "fresh-native",
    source: "fresh-native-engine",
    native: true,
    dimension: resolved.dimension,
    engine: artifact.engine,
    artifact,
  };
}

export function assertFreshNativeGenerationFabricIntegrity(): void {
  const dimensions = FRESH_NATIVE_DIMENSIONAL_ENGINES.map((engine) => engine.dimension);
  if (dimensions.length !== 11 || new Set(dimensions).size !== 11) {
    throw new Error("Fresh Native Generation Fabric must expose exactly one engine for each dimension 1D through 11D");
  }
  for (const dimension of dimensions) {
    const result = generateFreshNative({ input: `native ${dimension}d generation test`, dimension });
    if (!result || result.dimension !== dimension || result.provider !== "fresh-native") {
      throw new Error(`Fresh native ${dimension}D engine failed its generation contract`);
    }
  }
}

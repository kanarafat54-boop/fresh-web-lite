import type { FreshAIUniversalContext } from "./FreshAIUniversalCapabilityFabric.js";
import { normalizeFreshAICapabilities, FRESH_AI_SURFACE_DEFAULTS } from "./FreshAIUniversalCapabilityFabric.js";
import { getFreshAIPowersForCapability } from "./FreshAIUniversalPowerFabric.js";
import { resolveFreshNativeGeneration } from "./FreshNativeGenerationFabric.js";

export type FreshAIResolvedPowerPlan = {
  context: FreshAIUniversalContext;
  requestedCapabilities: string[];
  powers: string[];
  modelId: string;
  voiceModelId: string;
  nativeGeneration?: { dimension: number; engine: string };
};

export function resolveFreshAIUniversalPowerPlan(input: { surface?: string; route: string; featureId?: string; featureName?: string; capabilities?: readonly string[]; toolNamespaces?: readonly string[]; models?: FreshAIUniversalContext["models"]; activeModelId?: string; activeVoiceModelId?: string; objectType?: string; objectId?: string; selection?: string; generationInput?: string }): FreshAIResolvedPowerPlan {
  const surface = input.surface ?? (input.route === "/" ? "home" : "workspace");
  const defaults = FRESH_AI_SURFACE_DEFAULTS[surface] ?? FRESH_AI_SURFACE_DEFAULTS.workspace;
  const capabilities = normalizeFreshAICapabilities([...(defaults ?? []), ...(input.capabilities ?? [])]);
  const powers = [...new Set(capabilities.flatMap((capability) => getFreshAIPowersForCapability(capability)).map((power) => power.id))];
  const nativeGeneration = input.generationInput ? resolveFreshNativeGeneration(input.generationInput) : undefined;
  if (nativeGeneration && !powers.includes("native-generation")) powers.unshift("native-generation");
  const context: FreshAIUniversalContext = {
    surface, route: input.route, featureId: input.featureId, featureName: input.featureName,
    objectType: input.objectType, objectId: input.objectId, selection: input.selection,
    capabilities, toolNamespaces: [...new Set(input.toolNamespaces ?? ["fresh-ai", "memory", "search", "workspace"])],
    models: input.models ?? [], activeModelId: input.activeModelId ?? "fresh-auto", activeVoiceModelId: input.activeVoiceModelId ?? "device-voice", contextVersion: "1",
  };
  return { context, requestedCapabilities: capabilities, powers, modelId: context.activeModelId, voiceModelId: context.activeVoiceModelId, nativeGeneration: nativeGeneration ? { dimension: nativeGeneration.dimension, engine: nativeGeneration.engine.name } : undefined };
}

import type { FreshAIUniversalContext } from "./FreshAIUniversalCapabilityFabric";
import { normalizeFreshAICapabilities, FRESH_AI_SURFACE_DEFAULTS } from "./FreshAIUniversalCapabilityFabric";
import { getFreshAIPowersForCapability } from "./FreshAIUniversalPowerFabric";

export type FreshAIResolvedPowerPlan = {
  context: FreshAIUniversalContext;
  requestedCapabilities: string[];
  powers: string[];
  modelId: string;
  voiceModelId: string;
};

export function resolveFreshAIUniversalPowerPlan(input: {
  surface?: string;
  route: string;
  featureId?: string;
  featureName?: string;
  capabilities?: readonly string[];
  toolNamespaces?: readonly string[];
  models?: FreshAIUniversalContext["models"];
  activeModelId?: string;
  activeVoiceModelId?: string;
  objectType?: string;
  objectId?: string;
  selection?: string;
}): FreshAIResolvedPowerPlan {
  const surface = input.surface ?? (input.route === "/" ? "home" : "workspace");
  const defaults = FRESH_AI_SURFACE_DEFAULTS[surface] ?? FRESH_AI_SURFACE_DEFAULTS.workspace;
  const capabilities = normalizeFreshAICapabilities([...(defaults ?? []), ...(input.capabilities ?? [])]);
  const powers = [...new Set(capabilities.flatMap((capability) => getFreshAIPowersForCapability(capability)).map((power) => power.id))];
  const context: FreshAIUniversalContext = {
    surface,
    route: input.route,
    featureId: input.featureId,
    featureName: input.featureName,
    objectType: input.objectType,
    objectId: input.objectId,
    selection: input.selection,
    capabilities,
    toolNamespaces: [...new Set(input.toolNamespaces ?? ["fresh-ai", "memory", "search", "workspace"])],
    models: input.models ?? [],
    activeModelId: input.activeModelId ?? "fresh-auto",
    activeVoiceModelId: input.activeVoiceModelId ?? "device-voice",
    contextVersion: "1",
  };
  return { context, requestedCapabilities: capabilities, powers, modelId: context.activeModelId, voiceModelId: context.activeVoiceModelId };
}

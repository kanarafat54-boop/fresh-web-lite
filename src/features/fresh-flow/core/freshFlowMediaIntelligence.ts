import type { FreshFlowMediaIntelligence } from "./freshFlowContracts";

export const EMPTY_MEDIA_INTELLIGENCE: FreshFlowMediaIntelligence = {
  topics: [],
  entities: [],
  people: [],
  places: [],
  objects: [],
  scenes: [],
  captionsAvailable: false,
  safetySignals: [],
  qualitySignals: [],
};

/**
 * Normalizes optional analyzer output before it reaches ranking/search.
 * No AI provider is assumed here; analyzers can be added behind this contract.
 */
export function normalizeMediaIntelligence(
  value?: Partial<FreshFlowMediaIntelligence> | null,
): FreshFlowMediaIntelligence {
  return {
    transcript: value?.transcript,
    language: value?.language,
    topics: value?.topics ?? [],
    entities: value?.entities ?? [],
    people: value?.people ?? [],
    places: value?.places ?? [],
    objects: value?.objects ?? [],
    scenes: value?.scenes ?? [],
    captionsAvailable: value?.captionsAvailable ?? false,
    safetySignals: value?.safetySignals ?? [],
    qualitySignals: value?.qualitySignals ?? [],
    embeddingRef: value?.embeddingRef,
  };
}

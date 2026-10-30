// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore Node's native type-stripping test runner imports TypeScript source directly; the app tsconfig enables .ts imports.
import { validateAstraObservation, type AstraModality, type AstraObservation, type AstraWorldState } from "./AstraContracts.ts";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore Node native type stripping tests import TypeScript source directly; app bundler resolves this source import.
import { getAstraVisionReadiness } from "./AstraVisionEngine.ts";


export type AstraEngineState = "ready" | "configuration-required" | "not-verified";
export type AstraModalityEngine = {
  modality: AstraModality;
  state: AstraEngineState;
  owner: "Fresh AI";
  modelId: "fresh-unified-1";
  note: string;
};

export type AstraObservationResult =
  | { accepted: true; observation: AstraObservation; worldState: AstraWorldState; inference: "unavailable" }
  | { accepted: false; errors: string[] };

/**
 * Runtime readiness is deliberately explicit. Configuration is not health,
 * and health is not proof of model quality. No modality is marked ready until
 * its Fresh-owned engine has passed a separate authenticated integration test.
 */
export function getAstraModalityReadiness(): AstraModalityEngine[] {
  const vision = getAstraVisionReadiness();
  return (["image", "audio", "video", "spatial", "sensor"] as const).map((modality) => ({
    modality,
    state: modality === "image" && vision.status === "configured-not-verified" ? "not-verified" : "configuration-required",
    owner: "Fresh AI",
    modelId: "fresh-unified-1",
    note: modality === "image" ? vision.note : "No verified Fresh-owned inference engine is registered for this modality.",
  }));
}

/**
 * Accepts only consented, structurally valid observations. This function
 * assembles a provenance-preserving world-state envelope; it does not claim
 * to perceive, classify, transcribe, or infer anything from the payload.
 */
export function ingestAstraObservation(
  observation: AstraObservation,
  options?: { now?: string },
): AstraObservationResult {
  const errors = validateAstraObservation(observation, options);
  if (errors.length) return { accepted: false, errors };

  const worldState: AstraWorldState = {
    observedAt: options?.now ?? new Date().toISOString(),
    observations: [observation],
    entities: [],
    uncertainty: [
      "No modality inference engine is registered; the payload has not been interpreted.",
      "No entities or scene facts have been inferred from this observation.",
    ],
  };

  return { accepted: true, observation, worldState, inference: "unavailable" };
}

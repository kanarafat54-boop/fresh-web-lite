/**
 * Astra Fresh-owned image perception adapter.
 *
 * This module is a server-only boundary: callers must authenticate the user,
 * obtain image bytes from an authorized private-storage path, and obtain
 * explicit consent before calling it. It never accepts a provider URL/token
 * from the browser and never dispatches device actions.
 */
import { validateAstraObservation, type AstraObservation, type AstraWorldState } from "./AstraContracts.ts";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const ENGINE_TIMEOUT_MS = 45_000;
const ALLOWED_MIME = ["image/png", "image/jpeg", "image/webp"] as const;

type AllowedMime = typeof ALLOWED_MIME[number];
type VisionEntity = { id: string; label: string; confidence: number };
export type AstraVisionResult = {
  modelId: "fresh-unified-1";
  checkpointId: string;
  engineVersion: string;
  summary: string;
  worldState: AstraWorldState;
  provenance: { owner: "Fresh AI"; contract: "fresh-vision-v1"; observationId: string; engineVersion: string };
};
export type AstraVisionReadiness = {
  owner: "Fresh AI";
  modelId: "fresh-unified-1";
  status: "configuration-required" | "configured-not-verified" | "misconfigured";
  endpointConfigured: boolean;
  serverTokenConfigured: boolean;
  note: string;
};

function serverEnv(name: string): string | undefined {
  const runtime = (globalThis as unknown as { process?: { env?: Record<string, string | undefined> } }).process;
  return runtime?.env?.[name];
}

function imageSignatureMatches(bytes: Uint8Array, mimeType: AllowedMime): boolean {
  if (mimeType === "image/png") {
    return bytes.length >= 8 && [137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => bytes[index] === value);
  }
  if (mimeType === "image/jpeg") return bytes.length >= 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  return bytes.length >= 12
    && String.fromCharCode(...bytes.subarray(0, 4)) === "RIFF"
    && String.fromCharCode(...bytes.subarray(8, 12)) === "WEBP";
}

function parseEntities(value: unknown): VisionEntity[] {
  if (!Array.isArray(value) || value.length > 100) throw new Error("Fresh AI vision engine returned an invalid entity list.");
  return value.map((entry, index) => {
    if (!entry || typeof entry !== "object") throw new Error("Fresh AI vision engine returned an invalid entity.");
    const entity = entry as Record<string, unknown>;
    if (typeof entity.id !== "string" || !entity.id.trim() || entity.id.length > 128
      || typeof entity.label !== "string" || !entity.label.trim() || entity.label.length > 240
      || typeof entity.confidence !== "number" || !Number.isFinite(entity.confidence)
      || entity.confidence < 0 || entity.confidence > 1) {
      throw new Error("Fresh AI vision engine returned an entity with invalid fields.");
    }
    return { id: entity.id, label: entity.label, confidence: entity.confidence };
  });
}

/** Safe readiness: configured is not the same as verified/ready. */
export function getAstraVisionReadiness(): AstraVisionReadiness {
  const url = Boolean(serverEnv("FRESH_AI_VISION_ENGINE_URL")?.trim());
  const token = Boolean(serverEnv("FRESH_AI_VISION_ENGINE_TOKEN")?.trim());
  return {
    owner: "Fresh AI",
    modelId: "fresh-unified-1",
    status: url && token ? "configured-not-verified" : url || token ? "misconfigured" : "configuration-required",
    endpointConfigured: url,
    serverTokenConfigured: token,
    note: url && token
      ? "Vision engine configuration exists; authenticated image analysis and checkpoint provenance still require end-to-end verification."
      : "No complete Fresh-owned vision inference engine is configured. Image understanding remains unavailable.",
  };
}

/**
 * Analyze image bytes already fetched by an authenticated, ownership-checked
 * server route. The worker must run a Fresh-trained checkpoint and implement
 * fresh-vision-v1; third-party model fallbacks are not permitted.
 */
export async function analyzeAstraImage(input: {
  userId: string;
  observation: AstraObservation;
  imageBytes: Uint8Array;
  mimeType: string;
}): Promise<AstraVisionResult> {
  if (typeof input.userId !== "string" || !input.userId.trim()) throw new Error("A signed-in Fresh ID is required for image understanding.");
  const errors = validateAstraObservation(input.observation);
  if (errors.length) throw new Error(errors.join(" "));
  if (input.observation.modality !== "image") throw new Error("Astra image understanding requires an image observation.");
  if (!ALLOWED_MIME.includes(input.mimeType as AllowedMime)) throw new Error("Astra supports PNG, JPEG and WebP image inputs only.");
  if (!(input.imageBytes instanceof Uint8Array) || input.imageBytes.length === 0 || input.imageBytes.length > MAX_IMAGE_BYTES) {
    throw new Error("Astra image input must be between 1 byte and 8 MiB.");
  }
  if (!imageSignatureMatches(input.imageBytes, input.mimeType as AllowedMime)) throw new Error("Image bytes do not match the declared image type.");

  const configuredUrl = serverEnv("FRESH_AI_VISION_ENGINE_URL")?.trim();
  const token = serverEnv("FRESH_AI_VISION_ENGINE_TOKEN")?.trim();
  if (!configuredUrl || !token) throw new Error("Fresh AI vision is unavailable: no complete Fresh-owned vision engine is configured.");

  let endpoint: URL;
  try { endpoint = new URL(configuredUrl); } catch { throw new Error("Fresh AI vision engine URL is invalid."); }
  const local = endpoint.hostname === "localhost" || endpoint.hostname === "127.0.0.1";
  if (endpoint.protocol !== "https:" && !(local && endpoint.protocol === "http:")) throw new Error("Fresh AI vision engine must use HTTPS outside localhost development.");
  if (endpoint.username || endpoint.password || endpoint.hash) throw new Error("Fresh AI vision engine URL must not contain credentials or a fragment.");

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      contract: "fresh-vision-v1",
      modelId: "fresh-unified-1",
      observation: {
        id: input.observation.id,
        modality: input.observation.modality,
        capturedAt: input.observation.capturedAt,
        source: input.observation.source,
        consentGranted: input.observation.consentGranted,
      },
      mimeType: input.mimeType,
      imageBase64: Buffer.from(input.imageBytes).toString("base64"),
    }),
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(ENGINE_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`Fresh AI vision engine returned HTTP ${response.status}.`);
  if (!(response.headers.get("content-type") || "").toLowerCase().includes("application/json")) {
    throw new Error("Fresh AI vision engine returned an unsupported response type.");
  }
  const payload = await response.json() as Record<string, unknown>;
  if (payload.contract !== "fresh-vision-v1" || payload.modelId !== "fresh-unified-1"
    || typeof payload.checkpointId !== "string" || !payload.checkpointId.trim() || payload.checkpointId.length > 200
    || typeof payload.engineVersion !== "string" || !payload.engineVersion.trim() || payload.engineVersion.length > 100
    || typeof payload.summary !== "string" || payload.summary.length > 4000
    || !Array.isArray(payload.uncertainty) || payload.uncertainty.length > 50
    || !payload.uncertainty.every((item) => typeof item === "string" && item.length <= 500)) {
    throw new Error("Fresh AI vision engine returned an invalid Fresh vision contract response.");
  }
  const entities = parseEntities(payload.entities);
  const worldState: AstraWorldState = {
    observedAt: new Date().toISOString(),
    observations: [input.observation],
    entities,
    uncertainty: payload.uncertainty as string[],
  };
  return {
    modelId: "fresh-unified-1",
    checkpointId: payload.checkpointId,
    engineVersion: payload.engineVersion,
    summary: payload.summary,
    worldState,
    provenance: { owner: "Fresh AI", contract: "fresh-vision-v1", observationId: input.observation.id, engineVersion: payload.engineVersion },
  };
}

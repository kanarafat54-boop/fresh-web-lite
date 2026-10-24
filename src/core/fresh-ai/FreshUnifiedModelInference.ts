/**
 * Canonical Fresh Unified Model inference boundary.
 *
 * Calls only a configured Fresh-owned inference service. This is not a proxy
 * to a commercial model provider. It fails closed when the service/checkpoint
 * is absent or the response does not identify the expected Fresh model.
 */
import { getServerEnv } from "../platform/serverEnv.js";
import { FRESH_UNIFIED_MODEL } from "./FreshUnifiedModelCore.js";

export type FreshUnifiedModality = (typeof FRESH_UNIFIED_MODEL.modalities)[number];
export type FreshUnifiedInferenceRequest = {
  modality: FreshUnifiedModality;
  input: string;
  checkpointId?: string | null;
  maxTokens?: number;
};
export type FreshUnifiedInferenceResult = {
  modelId: "fresh-unified-1";
  modality: FreshUnifiedModality;
  native: true;
  status: "ready" | "training-required";
  checkpointId: string | null;
  text?: string;
  reason?: string;
};
export const FRESH_UNIFIED_INFERENCE_RUNTIME = {
  id: "fresh-unified-inference-runtime",
  modelId: FRESH_UNIFIED_MODEL.id,
  providerIndependent: true,
  externalProviderRequired: false,
  checkpointEnv: "FRESH_UNIFIED_CHECKPOINT_ID",
  endpointEnv: "FRESH_UNIFIED_INFERENCE_URL",
  tokenEnv: "FRESH_UNIFIED_INFERENCE_TOKEN",
} as const;

function env(name: string): string | null {
  const value = getServerEnv(name)?.trim();
  return value || null;
}
function registeredCheckpoint(): string | null {
  // Only the server's configured checkpoint is authoritative. Never let a
  // request choose an arbitrary checkpoint identifier for the inference service.
  return env(FRESH_UNIFIED_INFERENCE_RUNTIME.checkpointEnv);
}
function unavailable(modality: FreshUnifiedModality, checkpointId: string | null, reason: string): FreshUnifiedInferenceResult {
  return { modelId: "fresh-unified-1", modality, native: true, status: "training-required", checkpointId, reason };
}

export async function inferFreshUnified(request: FreshUnifiedInferenceRequest): Promise<FreshUnifiedInferenceResult> {
  const input = request.input.trim();
  if (!input) throw new Error("Fresh Unified inference requires input");
  const checkpointId = registeredCheckpoint();
  if (!checkpointId) return unavailable(request.modality, null, "No Fresh-trained checkpoint is registered.");
  if (request.checkpointId?.trim() && request.checkpointId.trim() !== checkpointId) {
    return unavailable(request.modality, checkpointId, "Requested checkpoint does not match the server-registered Fresh checkpoint.");
  }
  const endpoint = env(FRESH_UNIFIED_INFERENCE_RUNTIME.endpointEnv);
  const token = env(FRESH_UNIFIED_INFERENCE_RUNTIME.tokenEnv);
  if (!endpoint || !token) {
    return unavailable(request.modality, checkpointId, "Fresh-owned inference service is not configured. Set FRESH_UNIFIED_INFERENCE_URL and FRESH_UNIFIED_INFERENCE_TOKEN.");
  }

  let url: URL;
  try { url = new URL(endpoint); } catch { return unavailable(request.modality, checkpointId, "Fresh inference endpoint URL is invalid."); }
  const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if (url.protocol !== "https:" && !(local && env("NODE_ENV") !== "production")) {
    return unavailable(request.modality, checkpointId, "Fresh inference endpoint must use HTTPS.");
  }
  url.pathname = url.pathname.endsWith("/") ? url.pathname + "v1/infer" : url.pathname + "/v1/infer";
  url.search = "";
  url.hash = "";

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);
  try {
    const response = await fetch(url.toString(), {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify({
        modelId: FRESH_UNIFIED_MODEL.id,
        checkpointId,
        modality: request.modality,
        input,
        maxTokens: Math.min(1024, Math.max(1, Math.floor(request.maxTokens ?? 512))),
      }),
      signal: controller.signal,
      cache: "no-store",
    });
    if (!response.ok) return unavailable(request.modality, checkpointId, `Fresh inference service returned HTTP ${response.status}.`);
    const payload = await response.json() as Record<string, unknown>;
    if (payload.modelId !== FRESH_UNIFIED_MODEL.id || payload.checkpointId !== checkpointId || payload.modality !== request.modality) {
      return unavailable(request.modality, checkpointId, "Fresh inference response identity/checkpoint validation failed.");
    }
    if (payload.status !== "ready" || typeof payload.text !== "string" || !payload.text.trim()) {
      return unavailable(request.modality, checkpointId, "Fresh inference service did not return a usable model answer.");
    }
    return { modelId: "fresh-unified-1", modality: request.modality, native: true, status: "ready", checkpointId, text: payload.text.trim().slice(0, 32_000) };
  } catch (error) {
    return unavailable(request.modality, checkpointId, error instanceof Error && error.name === "AbortError" ? "Fresh inference service timed out." : "Fresh inference service could not be reached.");
  } finally {
    clearTimeout(timeout);
  }
}

export function assertFreshUnifiedInferenceIntegrity(): void {
  if (FRESH_UNIFIED_INFERENCE_RUNTIME.modelId !== FRESH_UNIFIED_MODEL.id) throw new Error("Fresh inference must use fresh-unified-1");
  if (!FRESH_UNIFIED_INFERENCE_RUNTIME.providerIndependent || FRESH_UNIFIED_INFERENCE_RUNTIME.externalProviderRequired) throw new Error("Fresh inference cannot require an external provider");
  if (FRESH_UNIFIED_INFERENCE_RUNTIME.endpointEnv !== "FRESH_UNIFIED_INFERENCE_URL") throw new Error("Fresh-owned inference endpoint registration is missing");
}

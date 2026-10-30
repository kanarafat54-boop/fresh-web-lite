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
  timeoutMs: 20_000,
  maxInputCharacters: 32_000,
  maxResponseBytes: 128 * 1024,
} as const;

function env(name: string): string | null {
  const value = getServerEnv(name)?.trim();
  return value || null;
}
function registeredCheckpoint(explicit?: string | null): string | null {
  return explicit?.trim() || env(FRESH_UNIFIED_INFERENCE_RUNTIME.checkpointEnv);
}
function unavailable(modality: FreshUnifiedModality, checkpointId: string | null, reason: string): FreshUnifiedInferenceResult {
  return { modelId: "fresh-unified-1", modality, native: true, status: "training-required", checkpointId, reason };
}
function inferenceEndpoint(value: string): URL | null {
  try {
    const url = new URL(value);
    const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
    if (url.protocol !== "https:" && !(local && env("NODE_ENV") !== "production" && url.protocol === "http:")) return null;
    if (url.username || url.password || url.search || url.hash) return null;
    url.pathname = url.pathname.endsWith("/") ? url.pathname + "v1/infer" : url.pathname + "/v1/infer";
    return url;
  } catch {
    return null;
  }
}
async function readBoundedJson(response: Response): Promise<Record<string, unknown> | null> {
  const contentType = (response.headers.get("content-type") || "").toLowerCase();
  if (!contentType.includes("application/json")) return null;
  const declaredLength = Number(response.headers.get("content-length") || 0);
  if (declaredLength > FRESH_UNIFIED_INFERENCE_RUNTIME.maxResponseBytes) return null;
  if (!response.body) return null;
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > FRESH_UNIFIED_INFERENCE_RUNTIME.maxResponseBytes) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  try {
    const parsed: unknown = JSON.parse(new TextDecoder().decode(bytes));
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

export async function inferFreshUnified(request: FreshUnifiedInferenceRequest): Promise<FreshUnifiedInferenceResult> {
  const input = request.input.trim();
  if (!input) throw new Error("Fresh Unified inference requires input");
  if (input.length > FRESH_UNIFIED_INFERENCE_RUNTIME.maxInputCharacters) {
    throw new Error("Fresh Unified inference input exceeds the 32,000-character limit");
  }
  const checkpointId = registeredCheckpoint(request.checkpointId);
  if (!checkpointId) return unavailable(request.modality, null, "No Fresh-trained checkpoint is registered.");
  const endpointValue = env(FRESH_UNIFIED_INFERENCE_RUNTIME.endpointEnv);
  const token = env(FRESH_UNIFIED_INFERENCE_RUNTIME.tokenEnv);
  if (!endpointValue || !token) {
    return unavailable(request.modality, checkpointId, "Fresh-owned inference service is not configured. Set FRESH_UNIFIED_INFERENCE_URL and FRESH_UNIFIED_INFERENCE_TOKEN.");
  }
  const url = inferenceEndpoint(endpointValue);
  if (!url) return unavailable(request.modality, checkpointId, "Fresh inference endpoint must be a valid HTTPS URL without credentials, query parameters, or fragments.");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FRESH_UNIFIED_INFERENCE_RUNTIME.timeoutMs);
  try {
    const response = await fetch(url.toString(), {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        modelId: FRESH_UNIFIED_MODEL.id,
        checkpointId,
        modality: request.modality,
        input,
        maxTokens: Math.min(1024, Math.max(1, Math.floor(request.maxTokens ?? 512))),
      }),
      signal: controller.signal,
      cache: "no-store",
      redirect: "error",
    });
    if (!response.ok) return unavailable(request.modality, checkpointId, `Fresh inference service returned HTTP ${response.status}.`);
    const payload = await readBoundedJson(response);
    if (!payload) return unavailable(request.modality, checkpointId, "Fresh inference service returned invalid, non-JSON, or oversized output.");
    if (payload.modelId !== FRESH_UNIFIED_MODEL.id || payload.checkpointId !== checkpointId || payload.modality !== request.modality) {
      return unavailable(request.modality, checkpointId, "Fresh inference response identity/checkpoint validation failed.");
    }
    if (payload.status !== "ready" || typeof payload.text !== "string" || !payload.text.trim()) {
      return unavailable(request.modality, checkpointId, "Fresh inference service did not return a usable model answer.");
    }
    return {
      modelId: "fresh-unified-1",
      modality: request.modality,
      native: true,
      status: "ready",
      checkpointId,
      text: payload.text.trim().slice(0, 32_000),
    };
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
  if (FRESH_UNIFIED_INFERENCE_RUNTIME.maxResponseBytes < 1024) throw new Error("Fresh inference response bound is missing");
}

import { getServerEnv } from "../platform/serverEnv.js";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { generateFreshNeuralMedia } from "./FreshNeuralGenerationRuntime.js";

export const FRESH_AI_IMAGE_GENERATIONS_PATH = "/v1/images/generations";
export const FRESH_AI_MEDIA_BUCKET = "fresh-ai-media";
const IMAGE_ENGINE_TIMEOUT_MS = 45_000;
const MAX_IMAGE_BASE64_CHARS = 24 * 1024 * 1024;

export function isFreshAIImageEngineConfigured(): boolean {
  return Boolean(getServerEnv("FRESH_AI_IMAGE_ENGINE_URL")?.trim());
}

/**
 * Safe, non-secret engine inventory for Fresh AI's status surface.
 * A configured URL is not proof that the engine is healthy or that generation
 * has passed an end-to-end test. Native inference remains unavailable until a
 * real checkpoint AND serving backend have been installed and validated.
 */
export type FreshAIEngineReadiness = {
  owner: "Fresh AI";
  product: "Fresh Web Lite";
  imageGeneration: {
    status: "configuration-required" | "configured-not-verified" | "misconfigured";
    endpointConfigured: boolean;
    serverTokenConfigured: boolean;
    nativeCheckpointRegistered: boolean;
    nativeInferenceBackend: "not-installed";
    note: string;
  };
  mediaProcessing: {
    status: "configuration-required" | "configured-not-verified";
    endpointConfigured: boolean;
    serverTokenConfigured: boolean;
    note: string;
  };
};

export function getFreshAIEngineReadiness(): FreshAIEngineReadiness {
  const imageUrl = Boolean(getServerEnv("FRESH_AI_IMAGE_ENGINE_URL")?.trim());
  const imageToken = Boolean(getServerEnv("FRESH_AI_IMAGE_ENGINE_TOKEN")?.trim());
  const checkpoint = Boolean(getServerEnv("FRESH_UNIFIED_CHECKPOINT_ID")?.trim());
  const mediaUrl = Boolean(getServerEnv("FRESH_MEDIA_WORKER_URL")?.trim());
  const mediaToken = Boolean(getServerEnv("FRESH_MEDIA_WORKER_API_TOKEN")?.trim());

  return {
    owner: "Fresh AI",
    product: "Fresh Web Lite",
    imageGeneration: {
      status: imageUrl && imageToken ? "configured-not-verified" : imageUrl || imageToken ? "misconfigured" : "configuration-required",
      endpointConfigured: imageUrl,
      serverTokenConfigured: imageToken,
      nativeCheckpointRegistered: checkpoint,
      nativeInferenceBackend: "not-installed",
      note: imageUrl && imageToken
        ? "Image engine configuration exists, but authenticated generation, PNG validation, persistence, and production health still need an end-to-end test."
        : "Fresh AI owns the image-generation contract, but no complete image engine is configured. Registering a checkpoint alone does not install inference.",
    },
    mediaProcessing: {
      status: mediaUrl && mediaToken ? "configured-not-verified" : "configuration-required",
      endpointConfigured: mediaUrl,
      serverTokenConfigured: mediaToken,
      note: "The FFmpeg media worker processes existing audio/video; it is not a text-to-image model.",
    },
  };
}

export type FreshAIServerConfig = {
  supabaseUrl: string | null;
  supabaseSecretKey: string | null;
  vercelEnvironment: string | null;
};

export function getFreshAIServerConfig(): FreshAIServerConfig {
  return {
    supabaseUrl: getServerEnv("SUPABASE_URL") || getServerEnv("VITE_SUPABASE_URL") || null,
    supabaseSecretKey: getServerEnv("SUPABASE_SECRET_KEY_FRESHWEBLITE") || getServerEnv("SUPABASE_SECRET_KEY") || getServerEnv("SUPABASE_SERVICE_ROLE_KEY") || null,
    vercelEnvironment: getServerEnv("VERCEL_ENV") || null,
  };
}

export function createFreshAIServerSupabase(): SupabaseClient | null {
  const config = getFreshAIServerConfig();
  if (!config.supabaseUrl || !config.supabaseSecretKey) return null;
  return createClient(config.supabaseUrl, config.supabaseSecretKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

export function getFreshAIPersistenceStatus(): { configured: boolean; environment: string | null; reason?: string } {
  const config = getFreshAIServerConfig();
  if (!config.supabaseUrl) return { configured: false, environment: config.vercelEnvironment, reason: "SUPABASE_URL is missing" };
  if (!config.supabaseSecretKey) return { configured: false, environment: config.vercelEnvironment, reason: "SUPABASE_SECRET_KEY_FRESHWEBLITE, SUPABASE_SECRET_KEY, or legacy SUPABASE_SERVICE_ROLE_KEY is missing from the server environment" };
  return { configured: true, environment: config.vercelEnvironment };
}

export type FreshAIImageResult = {
  b64Json: string;
  model: "fresh-unified-1";
  outputFormat: "png";
  size: string;
  engine: "fresh-native" | "configured-image-engine";
};

type ConfiguredImageEngineResult = { b64Json: string; mimeType: "image/png" };

/**
 * Optional compute adapter for image generation.
 *
 * Fresh owns the request, permissions, persistence, model identity and result
 * contract. A separately deployed engine performs the heavy image inference.
 * The adapter is opt-in, server-configured, bounded by a timeout and never
 * accepts a provider URL or credential from the client.
 *
 * Engine response contract: { "b64Json": "<base64 PNG>", "mimeType": "image/png" }.
 */
async function generateWithConfiguredImageEngine(input: {
  prompt: string;
  size: "1024x1024" | "1024x1536" | "1536x1024" | "auto";
  quality: "low" | "medium" | "high" | "auto";
}): Promise<ConfiguredImageEngineResult | null> {
  const configuredUrl = getServerEnv("FRESH_AI_IMAGE_ENGINE_URL")?.trim();
  if (!configuredUrl) return null;

  const token = getServerEnv("FRESH_AI_IMAGE_ENGINE_TOKEN")?.trim();
  if (!token) throw new Error("Fresh AI image engine is configured without its server token.");

  let endpoint: URL;
  try {
    endpoint = new URL(configuredUrl);
  } catch {
    throw new Error("Fresh AI image engine URL is invalid.");
  }
  const localDevelopment = endpoint.hostname === "localhost" || endpoint.hostname === "127.0.0.1";
  if (endpoint.protocol !== "https:" && !(localDevelopment && endpoint.protocol === "http:")) {
    throw new Error("Fresh AI image engine must use HTTPS outside localhost development.");
  }
  if (endpoint.username || endpoint.password || endpoint.hash) {
    throw new Error("Fresh AI image engine URL must not contain credentials or a fragment.");
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      authorization: `Bearer ${token}`,
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      contract: "fresh-image-v1",
      modelId: "fresh-unified-1",
      kind: "image",
      prompt: input.prompt,
      size: input.size,
      quality: input.quality,
    }),
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(IMAGE_ENGINE_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(`Fresh AI image engine returned HTTP ${response.status}.`);
  }
  if (!(response.headers.get("content-type") || "").toLowerCase().includes("application/json")) {
    throw new Error("Fresh AI image engine returned an unsupported response type.");
  }

  const payload = await response.json() as { b64Json?: unknown; mimeType?: unknown };
  if (typeof payload.b64Json !== "string" || payload.b64Json.length === 0 || payload.b64Json.length > MAX_IMAGE_BASE64_CHARS || payload.b64Json.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(payload.b64Json)) {
    throw new Error("Fresh AI image engine returned an invalid image payload.");
  }
  const imageBytes = Buffer.from(payload.b64Json, "base64");
  const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (imageBytes.length < pngSignature.length || !imageBytes.subarray(0, pngSignature.length).equals(pngSignature)) {
    throw new Error("Fresh AI image engine returned bytes that are not a PNG image.");
  }
  if (payload.mimeType !== undefined && payload.mimeType !== "image/png") {
    throw new Error("Fresh AI image engine must return a PNG image.");
  }
  return { b64Json: payload.b64Json, mimeType: "image/png" };
}

/** Canonical Fresh-owned image-generation entry point with an explicit optional engine adapter. */
export async function generateFreshAIImage(prompt: string, options?: { model?: string; size?: "1024x1024" | "1024x1536" | "1536x1024" | "auto"; quality?: "low" | "medium" | "high" | "auto" }): Promise<FreshAIImageResult> {
  const normalizedPrompt = prompt.trim();
  if (!normalizedPrompt) throw new Error("Fresh AI image generation requires a prompt.");
  if (normalizedPrompt.length > 4000) throw new Error("Fresh AI image prompts must be 4,000 characters or fewer.");
  const size = options?.size || "1024x1024";
  const quality = options?.quality || "auto";
  const configured = await generateWithConfiguredImageEngine({ prompt: normalizedPrompt, size, quality });
  if (configured) {
    return { b64Json: configured.b64Json, model: "fresh-unified-1", outputFormat: "png", size, engine: "configured-image-engine" };
  }

  const result = generateFreshNeuralMedia({ kind: "image", prompt: normalizedPrompt, size });
  if (result.status !== "ready" || !result.output) {
    throw new Error("Fresh AI image generation is unavailable in this deployment: no Fresh-managed image engine is configured, and the native Fresh Unified checkpoint/inference backend is not ready. No image was generated. Configure a Fresh-managed image inference worker or finish and validate native Fresh Unified serving.");
  }
  return { b64Json: result.output.b64Json, model: "fresh-unified-1", outputFormat: "png", size, engine: "fresh-native" };
}

export async function persistFreshAIMedia(input: {
  userId: string | null;
  requestId: string;
  conversationId?: string | null;
  kind: "image" | "video" | "audio" | "file";
  b64: string;
  mimeType: string;
  modelId?: string;
  prompt?: string;
  metadata?: Record<string, unknown>;
}): Promise<{ id: string; bucket: string; path: string; signedUrl: string }> {
  if (!input.userId) throw new Error("Media persistence requires an authenticated user");
  const client = createFreshAIServerSupabase();
  if (!client) throw new Error("Media persistence is not configured");
  const bucket = FRESH_AI_MEDIA_BUCKET;
  const extension = input.mimeType.includes("jpeg") ? "jpg" : input.mimeType.includes("webp") ? "webp" : input.mimeType.includes("png") ? "png" : "bin";
  const path = `${input.userId}/${new Date().toISOString().slice(0,10)}/${input.requestId}.${extension}`;
  const bytes = Buffer.from(input.b64, "base64");
  const uploaded = await client.storage.from(bucket).upload(path, bytes, { contentType: input.mimeType, upsert: false });
  if (uploaded.error) throw new Error(`Media storage upload failed: ${uploaded.error.message}`);
  const row = await client.from("fresh_ai_media_assets").insert({ user_id: input.userId, request_id: input.requestId, conversation_id: input.conversationId || null, kind: input.kind, storage_bucket: bucket, storage_path: path, mime_type: input.mimeType, model_id: input.modelId || null, prompt: input.prompt || null, metadata: input.metadata || {} }).select("id").single();
  if (row.error || !row.data) throw new Error(`Media asset persistence failed: ${row.error?.message || "unknown error"}`);
  const signed = await client.storage.from(bucket).createSignedUrl(path, 60 * 60 * 24 * 7);
  if (signed.error || !signed.data?.signedUrl) throw new Error(`Media signed URL failed: ${signed.error?.message || "unknown error"}`);
  return { id: row.data.id, bucket, path, signedUrl: signed.data.signedUrl };
}

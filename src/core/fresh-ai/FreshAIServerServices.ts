import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type FreshAIServerConfig = {
  supabaseUrl: string | null;
  supabaseSecretKey: string | null;
  openAIKey: string | null;
  imageModel: string;
  vercelEnvironment: string | null;
};

export function getFreshAIServerConfig(): FreshAIServerConfig {
  return {
    supabaseUrl: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || null,
    supabaseSecretKey: process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || null,
    openAIKey: process.env.OPENAI_API_KEY || null,
    imageModel: process.env.FRESH_IMAGE_MODEL || "gpt-image-2",
    vercelEnvironment: process.env.VERCEL_ENV || null,
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
  if (!config.supabaseSecretKey) return { configured: false, environment: config.vercelEnvironment, reason: "SUPABASE_SECRET_KEY (or legacy SUPABASE_SERVICE_ROLE_KEY) is missing from the server environment" };
  return { configured: true, environment: config.vercelEnvironment };
}

export type FreshAIImageResult = { b64Json: string; model: string; outputFormat: "png" | "jpeg" | "webp"; size: string };

export async function generateFreshAIImage(prompt: string, options?: { model?: string; size?: "1024x1024" | "1024x1536" | "1536x1024" | "auto"; quality?: "low" | "medium" | "high" | "auto" }): Promise<FreshAIImageResult> {
  const config = getFreshAIServerConfig();
  if (!config.openAIKey) throw new Error("Image generation is not configured: OPENAI_API_KEY is missing");
  const model = options?.model || config.imageModel;
  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${config.openAIKey}` },
    body: JSON.stringify({ model, prompt: prompt.slice(0, 4000), size: options?.size || "1024x1024", quality: options?.quality || "auto", output_format: "png" }),
  });
  const payload = await response.json().catch(() => null) as { data?: Array<{ b64_json?: string }>; error?: { message?: string } } | null;
  if (!response.ok) throw new Error(payload?.error?.message || `Image generation provider failed (${response.status})`);
  const b64Json = payload?.data?.[0]?.b64_json;
  if (!b64Json) throw new Error("Image generation provider returned no image data");
  return { b64Json, model, outputFormat: "png", size: options?.size || "1024x1024" };
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
  const bucket = "fresh-ai-media";
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

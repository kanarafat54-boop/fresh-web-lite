import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export type FreshAIServerConfig = {
  supabaseUrl: string | null;
  supabaseServiceRoleKey: string | null;
  openAIKey: string | null;
  imageModel: string;
  vercelEnvironment: string | null;
};

export function getFreshAIServerConfig(): FreshAIServerConfig {
  return {
    supabaseUrl: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || null,
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || null,
    openAIKey: process.env.OPENAI_API_KEY || null,
    imageModel: process.env.FRESH_IMAGE_MODEL || "gpt-image-2",
    vercelEnvironment: process.env.VERCEL_ENV || null,
  };
}

export function createFreshAIServerSupabase(): SupabaseClient | null {
  const config = getFreshAIServerConfig();
  if (!config.supabaseUrl || !config.supabaseServiceRoleKey) return null;
  return createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function getFreshAIPersistenceStatus(): {
  configured: boolean;
  environment: string | null;
  reason?: string;
} {
  const config = getFreshAIServerConfig();
  if (!config.supabaseUrl) return { configured: false, environment: config.vercelEnvironment, reason: "SUPABASE_URL is missing" };
  if (!config.supabaseServiceRoleKey) return { configured: false, environment: config.vercelEnvironment, reason: "SUPABASE_SERVICE_ROLE_KEY is missing from the server environment" };
  return { configured: true, environment: config.vercelEnvironment };
}

export type FreshAIImageResult = {
  b64Json: string;
  model: string;
  outputFormat: "png" | "jpeg" | "webp";
  size: string;
};

export async function generateFreshAIImage(prompt: string, options?: {
  model?: string;
  size?: "1024x1024" | "1024x1536" | "1536x1024" | "auto";
  quality?: "low" | "medium" | "high" | "auto";
}): Promise<FreshAIImageResult> {
  const config = getFreshAIServerConfig();
  if (!config.openAIKey) throw new Error("Image generation is not configured: OPENAI_API_KEY is missing");

  const model = options?.model || config.imageModel;
  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${config.openAIKey}`,
    },
    body: JSON.stringify({
      model,
      prompt: prompt.slice(0, 4000),
      size: options?.size || "1024x1024",
      quality: options?.quality || "auto",
      output_format: "png",
    }),
  });

  const payload = await response.json().catch(() => null) as {
    data?: Array<{ b64_json?: string }>;
    error?: { message?: string };
  } | null;

  if (!response.ok) {
    throw new Error(payload?.error?.message || `Image generation provider failed (${response.status})`);
  }

  const b64Json = payload?.data?.[0]?.b64_json;
  if (!b64Json) throw new Error("Image generation provider returned no image data");

  return { b64Json, model, outputFormat: "png", size: options?.size || "1024x1024" };
}

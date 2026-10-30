import { createClient } from "@supabase/supabase-js";
import { createFreshAIServerSupabase } from "../core/fresh-ai/FreshAIServerServices.js";
import { analyzeAstraImage } from "../core/fresh-ai/astra/AstraVisionEngine.js";
import type { AstraObservation } from "../core/fresh-ai/astra/AstraContracts.js";

const json = (value: unknown, status = 200) => Response.json(value, {
  status,
  headers: { "cache-control": "no-store", "x-content-type-options": "nosniff" },
});

type VisionRequest = {
  assetId?: unknown;
  consentGranted?: unknown;
};

/** Fresh Astra vision analysis. Served through /api/ai/ask (see vercel.json) so it does not add a serverless function (Hobby plan cap: 12). */
export async function handleAstraVision(req: Request): Promise<Response> {
  try {
    const authorization = req.headers.get("authorization") ?? "";
    const bearer = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const anonKey = process.env.VITE_SUPABASE_ANON_KEY;
    if (!bearer || !supabaseUrl || !anonKey) return json({ error: "Sign in to use Fresh AI vision." }, 401);

    const authClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const authResult = await authClient.auth.getUser(bearer);
    const user = authResult.data.user;
    if (!user) return json({ error: "Your Fresh ID session is invalid or expired." }, 401);

    if (!(req.headers.get("content-type") ?? "").toLowerCase().includes("application/json")) {
      return json({ error: "A JSON vision request is required." }, 415);
    }
    const raw = await req.text();
    if (raw.length > 12_000) return json({ error: "Vision request is too large." }, 413);
    let body: VisionRequest;
    try { body = JSON.parse(raw) as VisionRequest; } catch { return json({ error: "Invalid JSON vision request." }, 400); }

    if (typeof body.assetId !== "string" || !/^[A-Za-z0-9-]{1,128}$/.test(body.assetId)) {
      return json({ error: "A valid Fresh AI image asset ID is required." }, 400);
    }
    if (body.consentGranted !== true) return json({ error: "Explicit consent is required before image analysis." }, 400);
    const storage = createFreshAIServerSupabase();
    if (!storage) return json({ error: "Fresh AI private media storage is not configured." }, 503);
    const lookup = await storage.from("fresh_ai_media_assets")
      .select("id, storage_bucket, storage_path, mime_type, kind, metadata")
      .eq("id", body.assetId)
      .eq("user_id", user.id)
      .eq("kind", "image")
      .maybeSingle();
    if (lookup.error || !lookup.data) return json({ error: "Image asset not found for this Fresh ID." }, 404);

    const asset = lookup.data;
    if (asset.storage_bucket !== "fresh-ai-media" || typeof asset.storage_path !== "string"
      || !asset.storage_path.startsWith(user.id + "/")
      || asset.storage_path.includes("..") || asset.storage_path.includes("//")) {
      return json({ error: "Image asset ownership or storage reference could not be verified." }, 403);
    }

    const download = await storage.storage.from("fresh-ai-media").download(asset.storage_path);
    if (download.error || !download.data) return json({ error: "The private image could not be loaded." }, 404);
    if (download.data.size <= 0 || download.data.size > 8 * 1024 * 1024) {
      return json({ error: "Astra image inputs must be between 1 byte and 8 MiB." }, 413);
    }

    const imageBytes = new Uint8Array(await download.data.arrayBuffer());
    const metadata = asset.metadata && typeof asset.metadata === "object" ? asset.metadata as Record<string, unknown> : {};
    if (metadata.observationSource !== "user-upload" && metadata.observationSource !== "user-camera") {
      return json({ error: "This image asset has no trusted upload or camera provenance." }, 400);
    }
    const source: "user-camera" | "user-upload" = metadata.observationSource;
    const observation: AstraObservation = {
      id: crypto.randomUUID(),
      modality: "image" as const,
      capturedAt: typeof metadata.capturedAt === "string" ? metadata.capturedAt : new Date().toISOString(),
      source,
      consentGranted: true,
      payloadRef: "asset_" + asset.id,
    };
    const result = await analyzeAstraImage({
      userId: user.id,
      observation,
      imageBytes,
      mimeType: asset.mime_type,
    });
    return json({ status: "completed", inference: "fresh-vision-v1", result });
  } catch (error) {
    return json({
      status: "unavailable",
      error: error instanceof Error ? error.message : "Fresh AI vision could not process this image.",
    }, 503);
  }
}

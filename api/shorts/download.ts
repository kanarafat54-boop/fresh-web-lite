import { createVercelNodeHandler } from "../../src/server/vercelNodeAdapter.js";
import { extractShortVideoObjectPath, shortDownloadFilename } from "../../src/server/shortDownload.js";

type Env = Record<string, string | undefined>;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: { "cache-control": "no-store" } });
}

/**
 * Issues an official Fresh Shorts download URL only after verifying the viewer's
 * session and the creator's persisted allow_download setting.
 *
 * The current post-videos bucket is public for backwards-compatible playback.
 * This endpoint gates Fresh's official download action; it is not DRM and cannot
 * stop a viewer from saving a publicly accessible media URL by other means.
 */
export async function POST(req: Request, env: Env = process.env): Promise<Response> {
  if (req.method !== "POST") return json({ error: "Method not allowed." }, 405);
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return json({ error: "Authentication required." }, 401);

  let body: { shortId?: unknown };
  try { body = (await req.json()) as { shortId?: unknown }; } catch { return json({ error: "Invalid JSON body." }, 400); }
  if (typeof body.shortId !== "string" || !UUID.test(body.shortId)) return json({ error: "A valid Short id is required." }, 400);

  const url = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
  const anon = env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY;
  const secret = env.SUPABASE_SECRET_KEY_FRESHWEBLITE || env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anon || !secret) return json({ error: "Fresh Shorts downloads are not configured." }, 503);

  const { createClient } = await import("@supabase/supabase-js");
  const options = { auth: { persistSession: false, autoRefreshToken: false } };
  const authClient = createClient(url, anon, options);
  const { data: auth, error: authError } = await authClient.auth.getUser(token);
  if (authError || !auth.user) return json({ error: "Your Fresh ID session is invalid. Sign in again." }, 401);

  const admin = createClient(url, secret, options);
  const { data: short, error: shortError } = await admin
    .from("shorts")
    .select("id, author_id, video_url, allow_download")
    .eq("id", body.shortId)
    .maybeSingle();
  if (shortError) return json({ error: "Fresh could not check this Short's download permission." }, 503);
  if (!short) return json({ error: "Short not found." }, 404);
  if (short.allow_download !== true) return json({ error: "The creator has not allowed downloads for this Short." }, 403);

  const objectPath = extractShortVideoObjectPath(String(short.video_url ?? ""), url, String(short.author_id ?? ""));
  if (!objectPath) return json({ error: "This Short's media is not eligible for direct download." }, 422);

  const { data: signed, error: signingError } = await admin.storage
    .from("post-videos")
    .createSignedUrl(objectPath, 60, { download: shortDownloadFilename(body.shortId) });
  if (signingError || !signed?.signedUrl) return json({ error: "Fresh could not prepare the download. Try again." }, 502);

  return json({ signedUrl: signed.signedUrl, expiresInSeconds: 60 });
}

export default createVercelNodeHandler({ POST });

const PUBLIC_SHORT_VIDEO_PREFIX = "/storage/v1/object/public/post-videos/";

export function extractShortVideoObjectPath(
  videoUrl: string,
  supabaseUrl: string,
  authorId: string,
): string | null {
  try {
    const media = new URL(videoUrl);
    const project = new URL(supabaseUrl);
    if (media.protocol !== "https:" || media.origin !== project.origin) return null;
    if (!media.pathname.startsWith(PUBLIC_SHORT_VIDEO_PREFIX)) return null;

    const encodedPath = media.pathname.slice(PUBLIC_SHORT_VIDEO_PREFIX.length);
    const objectPath = encodedPath.split("/").map((part) => decodeURIComponent(part)).join("/");
    const segments = objectPath.split("/");
    if (!objectPath || segments.length < 2 || segments.some((part) => !part || part === "." || part === "..")) return null;
    if (segments[0] !== authorId) return null;
    if (objectPath.includes("\\") || objectPath.includes("\0")) return null;
    return objectPath;
  } catch {
    return null;
  }
}

export function shortDownloadFilename(shortId: string): string {
  return `fresh-short-${shortId}.mp4`;
}

type DownloadEnv = Record<string, string | undefined>;

export async function handleShortDownload(req: Request, env: DownloadEnv = process.env): Promise<Response> {
  const send = (body: unknown, status = 200) => Response.json(body, { status, headers: { "cache-control": "no-store" } });
  if (req.method !== "POST") return send({ error: "Method not allowed." }, 405);

  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\\s+/i, "");
  if (!token) return send({ error: "Authentication required." }, 401);

  let body: { shortId?: unknown };
  try { body = (await req.json()) as { shortId?: unknown }; } catch { return send({ error: "Invalid JSON body." }, 400); }
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (typeof body.shortId !== "string" || !uuid.test(body.shortId)) return send({ error: "A valid Short id is required." }, 400);

  const url = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
  const anon = env.VITE_SUPABASE_PUBLISHABLE_KEY || env.VITE_SUPABASE_ANON_KEY;
  const secret = env.SUPABASE_SECRET_KEY_FRESHWEBLITE || env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anon || !secret) return send({ error: "Fresh Shorts downloads are not configured." }, 503);

  const { createClient } = await import("@supabase/supabase-js");
  const options = { auth: { persistSession: false, autoRefreshToken: false } };
  const authClient = createClient(url, anon, options);
  const { data: auth, error: authError } = await authClient.auth.getUser(token);
  if (authError || !auth.user) return send({ error: "Your Fresh ID session is invalid. Sign in again." }, 401);

  const admin = createClient(url, secret, options);
  const { data: short, error: shortError } = await admin
    .from("shorts")
    .select("id, author_id, video_url, allow_download")
    .eq("id", body.shortId)
    .maybeSingle();
  if (shortError) return send({ error: "Fresh could not check this Short's download permission." }, 503);
  if (!short) return send({ error: "Short not found." }, 404);
  if (short.allow_download !== true) return send({ error: "The creator has not allowed downloads for this Short." }, 403);

  const objectPath = extractShortVideoObjectPath(String(short.video_url ?? ""), url, String(short.author_id ?? ""));
  if (!objectPath) return send({ error: "This Short's media is not eligible for direct download." }, 422);

  const { data: signed, error: signingError } = await admin.storage
    .from("post-videos")
    .createSignedUrl(objectPath, 60, { download: shortDownloadFilename(body.shortId) });
  if (signingError || !signed?.signedUrl) return send({ error: "Fresh could not prepare the download. Try again." }, 502);

  return send({ signedUrl: signed.signedUrl, expiresInSeconds: 60 });
}

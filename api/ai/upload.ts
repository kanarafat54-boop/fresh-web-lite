import { createClient } from "@supabase/supabase-js";
import { persistFreshAIMedia } from "../../src/core/fresh-ai/FreshAIServerServices.js";

export const config = { maxDuration: 30 };
const MAX_BYTES = 20 * 1024 * 1024;
const json = (data: unknown, status = 200) => Response.json(data, { status, headers: { "cache-control": "no-store" } });

async function authenticatedUser(req: Request) {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_ANON_KEY;
  const header = req.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!url || !key || !token) return null;
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const result = await client.auth.getUser(token);
  return result.data.user ?? null;
}

export async function POST(req: Request): Promise<Response> {
  try {
    const user = await authenticatedUser(req);
    if (!user) return json({ error: "Authentication required" }, 401);
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return json({ error: "A file is required" }, 400);
    if (file.size <= 0) return json({ error: "The file is empty" }, 400);
    if (file.size > MAX_BYTES) return json({ error: "Files must be 20 MB or smaller" }, 413);

    const bytes = Buffer.from(await file.arrayBuffer());
    const requestId = crypto.randomUUID();
    const stored = await persistFreshAIMedia({
      userId: user.id,
      requestId,
      kind: "file",
      b64: bytes.toString("base64"),
      mimeType: file.type || "application/octet-stream",
      metadata: { originalName: file.name, size: file.size },
    });

    return json({
      asset: {
        id: stored.id,
        name: file.name,
        mimeType: file.type || "application/octet-stream",
        size: file.size,
        bucket: stored.bucket,
        path: stored.path,
        url: stored.signedUrl,
      },
    }, 201);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Unable to upload file" }, 500);
  }
}

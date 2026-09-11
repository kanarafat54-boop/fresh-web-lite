import { createClient } from "@supabase/supabase-js";
import { executeFreshFileUpload } from "../../src/core/fresh-ai/FreshAICapabilityRuntime.js";

export const config = { maxDuration: 30 };

const json = (value: unknown, status = 200) => Response.json(value, {
  status,
  headers: { "cache-control": "no-store" },
});

async function authenticatedUser(req: Request) {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_ANON_KEY;
  const authorization = req.headers.get("authorization") ?? "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!url || !key || !token) return null;
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data } = await client.auth.getUser(token);
  return data.user ?? null;
}

type Body = {
  requestId?: string;
  mimeType?: string;
  bytesBase64?: string;
};

export async function POST(req: Request): Promise<Response> {
  try {
    const user = await authenticatedUser(req);
    if (!user) return json({ error: "Authentication required" }, 401);

    const body = await req.json() as Body;
    const requestId = typeof body.requestId === "string" ? body.requestId.trim() : "";
    const mimeType = typeof body.mimeType === "string" ? body.mimeType.trim().slice(0, 200) : "";
    const bytesBase64 = typeof body.bytesBase64 === "string" ? body.bytesBase64 : "";

    if (!/^[0-9a-f-]{36}$/i.test(requestId)) return json({ error: "A valid requestId is required" }, 400);
    if (!/^(application|text)\//i.test(mimeType)) return json({ error: "Unsupported file type" }, 415);
    if (!bytesBase64) return json({ error: "bytesBase64 is required" }, 400);

    const result = await executeFreshFileUpload({
      userId: user.id,
      requestId,
      mimeType,
      bytesBase64,
    });

    return json({ ok: true, model: "fresh-unified-1", ...result });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : "Fresh Files upload failed" }, 500);
  }
}

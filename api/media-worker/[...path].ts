import { createClient } from "@supabase/supabase-js";
import { createVercelNodeHandler } from "../../src/server/vercelNodeAdapter.js";

export const config = { maxDuration: 60 };

const json = (value: unknown, status = 200) =>
  Response.json(value, { status, headers: { "cache-control": "no-store" } });

async function authenticatedUser(req: Request) {
  const url = process.env.VITE_SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_ANON_KEY;
  const authorization = req.headers.get("authorization") ?? "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  if (!url || !key || !token) return null;
  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const result = await client.auth.getUser(token);
  return result.data.user ?? null;
}

function workerConfig() {
  const url = process.env.FRESH_MEDIA_WORKER_URL?.trim().replace(/\/$/, "");
  const token = process.env.FRESH_MEDIA_WORKER_API_TOKEN?.trim();
  return url && token ? { url, token } : null;
}

function relativePath(req: Request) {
  const pathname = new URL(req.url).pathname;
  const prefix = "/api/media-worker";
  if (!pathname.startsWith(prefix)) return null;
  const path = pathname.slice(prefix.length) || "/";
  if (path === "/jobs") return path;
  if (/^\/jobs\/[0-9a-f-]{36}$/i.test(path)) return path;
  if (/^\/jobs\/[0-9a-f-]{36}\/output$/i.test(path)) return path;
  return null;
}

function localJobUrl(path: string) {
  return "/api/media-worker" + path;
}

async function handle(req: Request): Promise<Response> {
  try {
    const path = relativePath(req);
    if (!path) return json({ error: "Media worker route not found." }, 404);
    if (!((req.method === "POST" && path === "/jobs") ||
          (req.method === "GET" && path.startsWith("/jobs/")))) {
      return json({ error: "Method not allowed." }, 405);
    }

    const user = await authenticatedUser(req);
    if (!user) return json({ error: "Authentication required." }, 401);

    const upstream = workerConfig();
    if (!upstream) return json({ error: "Fresh media processing is not configured on the server." }, 503);

    const headers = new Headers({ authorization: `Bearer ${upstream.token}` });
    let body: string | undefined;
    if (req.method === "POST") {
      const contentType = req.headers.get("content-type") ?? "";
      if (!contentType.toLowerCase().includes("application/json")) {
        return json({ error: "A JSON media job is required." }, 415);
      }
      body = await req.text();
      if (body.length > 64 * 1024) return json({ error: "Media job request is too large." }, 413);
      let parsed: unknown;
      try { parsed = JSON.parse(body); } catch { return json({ error: "Invalid JSON media job." }, 400); }
      if (!parsed || typeof parsed !== "object" || typeof (parsed as { inputUrl?: unknown }).inputUrl !== "string") {
        return json({ error: "inputUrl is required." }, 400);
      }
      headers.set("content-type", "application/json");
    }

    const response = await fetch(upstream.url + path, {
      method: req.method,
      headers,
      ...(body === undefined ? {} : { body }),
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(45_000),
    });

    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const payload = await response.json().catch(() => ({})) as Record<string, unknown>;
      if (typeof payload.statusUrl === "string" && path === "/jobs") {
        payload.statusUrl = localJobUrl(String(payload.statusUrl).replace(/^\//, "/"));
      }
      if (typeof payload.outputUrl === "string" && payload.outputUrl.startsWith("/jobs/")) {
        payload.outputUrl = localJobUrl(payload.outputUrl);
      }
      return json(payload, response.status);
    }

    const headersOut = new Headers({ "cache-control": "no-store", "x-content-type-options": "nosniff" });
    if (contentType) headersOut.set("content-type", contentType);
    const length = response.headers.get("content-length");
    if (length) headersOut.set("content-length", length);
    return new Response(response.body, { status: response.status, headers: headersOut });
  } catch {
    return json({ error: "Fresh media worker request failed. Please try again." }, 502);
  }
}

export async function GET(req: Request): Promise<Response> {
  return handle(req);
}

export async function POST(req: Request): Promise<Response> {
  return handle(req);
}

export default createVercelNodeHandler({ GET, POST });

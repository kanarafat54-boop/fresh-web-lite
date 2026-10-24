import { createClient } from "@supabase/supabase-js";
import { createRateLimiter, handleSearchRequest, type AuthUser } from "./service.js";
import { SupabaseEvidenceStore, SupabaseSearchProvider, type SupabaseLike } from "./supabaseAdapters.js";

const limiter = createRateLimiter(30, 60_000);

function env(...names: string[]): string | undefined {
  for (const name of names) { const v = process.env[name]; if (v) return v; }
  return undefined;
}

/** Verifies the caller's Supabase access token (same pattern as api/ai/conversations.ts). */
async function authenticate(req: Request): Promise<AuthUser | null> {
  const url = env("VITE_SUPABASE_URL", "SUPABASE_URL");
  const anon = env("VITE_SUPABASE_ANON_KEY", "VITE_SUPABASE_PUBLISHABLE_KEY");
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!url || !anon || !token) return null;
  const client = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await client.auth.getUser(token);
  if (error) {
    if (error.status && error.status >= 500) throw error; // verification outage != unauthorized
    return null;
  }
  return data.user ? { id: data.user.id } : null;
}

function serviceClient(): SupabaseLike | null {
  const url = env("SUPABASE_URL", "VITE_SUPABASE_URL");
  const key = env("SUPABASE_SECRET_KEY_FRESHWEBLITE", "SUPABASE_SECRET_KEY", "SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }) as unknown as SupabaseLike;
}

/**
 * Entry point for the authenticated Fresh index search. It is served through the existing
 * /api/research/search function (see vercel.json rewrite) because the Vercel Hobby plan caps a
 * deployment at 12 functions and /api already uses all 12.
 */
export async function handleFreshIndexSearch(req: Request): Promise<Response> {
  const db = serviceClient();
  if (!db) return Response.json({ error: { code: "index_unavailable", message: "Search is not configured on the server.", retryable: false } }, { status: 503, headers: { "cache-control": "no-store" } });
  return handleSearchRequest(req, { authenticate, provider: new SupabaseSearchProvider(db), store: new SupabaseEvidenceStore(db), limiter });
}

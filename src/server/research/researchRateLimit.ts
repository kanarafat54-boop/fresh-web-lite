import { createHmac, timingSafeEqual } from "node:crypto";
import { isIP } from "node:net";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const RATE_LIMIT = { perMinute: 6, perHour: 30, perDay: 100 } as const;
type RateLimitRow = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
  limits?: { perMinute?: number; perHour?: number; perDay?: number };
};
export type ResearchRateLimitResult =
  | { configured: true; allowed: boolean; remaining: number; retryAfterSeconds: number; limit: number; hourLimit: number; dayLimit: number; windowSeconds: number }
  | { configured: false };

let cachedClient: { url: string; key: string; client: SupabaseClient } | null = null;

function getAdminClient(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY_FRESHWEBLITE || process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  if (!cachedClient || cachedClient.url !== url || cachedClient.key !== key) {
    cachedClient = {
      url,
      key,
      client: createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }),
    };
  }
  return cachedClient.client;
}

/** Vercel overwrites x-real-ip with the connecting client's public IP. */
function getTrustedClientIp(req: Request, secret: string): string | null {
  const forwardedIp = req.headers.get("x-fresh-research-client-ip")?.trim() ?? "";
  const timestamp = req.headers.get("x-fresh-research-client-timestamp")?.trim() ?? "";
  const signature = req.headers.get("x-fresh-research-client-signature")?.trim() ?? "";
  if (forwardedIp && isIP(forwardedIp) && /^\d{13}$/.test(timestamp) && /^[a-f0-9]{64}$/.test(signature)) {
    const age = Math.abs(Date.now() - Number(timestamp));
    if (age <= 60_000) {
      const expected = createHmac("sha256", secret)
        .update("fresh-research-forwarded-v1:" + forwardedIp + ":" + timestamp)
        .digest("hex");
      if (timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) return forwardedIp;
    }
  }

  const candidate = req.headers.get("x-real-ip") ?? req.headers.get("x-forwarded-for");
  const address = candidate?.split(",")[0]?.trim() ?? "";
  if (isIP(address)) return address;
  if (process.env.NODE_ENV !== "production" && !address) return "local-development";
  return null;
}

export async function checkFreshResearchRateLimit(req: Request): Promise<ResearchRateLimitResult> {
  const key = process.env.SUPABASE_SECRET_KEY_FRESHWEBLITE || process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  const ip = key ? getTrustedClientIp(req, key) : null;
  const client = getAdminClient();
  if (!client || !key || !ip) return { configured: false };

  const identifierHash = createHmac("sha256", key).update("fresh-research:v1:" + ip).digest("hex");
  const { data, error } = await client.rpc("consume_fresh_research_quota", {
    p_identifier_hash: identifierHash,
  });
  if (error) return { configured: false };
  const row = data as RateLimitRow | null;
  if (!row || typeof row.allowed !== "boolean") return { configured: false };
  return {
    configured: true,
    allowed: row.allowed,
    remaining: Math.max(0, Number(row.remaining) || 0),
    retryAfterSeconds: Math.max(0, Number(row.retryAfterSeconds) || 0),
    limit: Number(row.limits?.perMinute) || RATE_LIMIT.perMinute,
    hourLimit: Number(row.limits?.perHour) || RATE_LIMIT.perHour,
    dayLimit: Number(row.limits?.perDay) || RATE_LIMIT.perDay,
    windowSeconds: 60,
  };
}

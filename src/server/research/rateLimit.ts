import { createHmac } from "node:crypto";
import { isIP } from "node:net";
import { createClient } from "@supabase/supabase-js";

export type FreshResearchQuota = {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
};

type QuotaRpcResult = {
  allowed?: unknown;
  remaining?: unknown;
  retryAfterSeconds?: unknown;
};

/**
 * Durable per-client quota backed by a single atomic Postgres upsert.
 * Vercel overwrites x-real-ip at the edge; never trust a client-supplied
 * x-forwarded-for value for security decisions.
 */
export async function consumeFreshResearchQuota(request: Request): Promise<FreshResearchQuota> {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY_FRESHWEBLITE
    || process.env.SUPABASE_SECRET_KEY
    || process.env.SUPABASE_SERVICE_ROLE_KEY;
  const edgeIp = request.headers.get("x-real-ip")?.trim() || "";
  const clientIp = edgeIp || (process.env.NODE_ENV !== "production"
    ? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || ""
    : "");

  if (!supabaseUrl || !secretKey || !clientIp || isIP(clientIp) === 0) {
    throw new Error("Fresh Research abuse protection is not configured.");
  }

  // HMAC prevents the database from storing raw IP addresses or reusable plain hashes.
  const identifierHash = createHmac("sha256", secretKey).update(clientIp).digest("hex");
  const client = createClient(supabaseUrl, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data, error } = await client.rpc("consume_fresh_research_quota", {
    p_identifier_hash: identifierHash,
  });
  if (error) throw new Error("Fresh Research abuse protection could not be reached.");

  const result = data as QuotaRpcResult | null;
  if (!result || typeof result !== "object" || typeof result.allowed !== "boolean") {
    throw new Error("Fresh Research abuse protection returned an invalid response.");
  }
  return {
    allowed: result.allowed,
    remaining: typeof result.remaining === "number" && Number.isFinite(result.remaining)
      ? Math.max(0, Math.trunc(result.remaining))
      : 0,
    retryAfterSeconds: typeof result.retryAfterSeconds === "number" && Number.isFinite(result.retryAfterSeconds)
      ? Math.max(1, Math.trunc(result.retryAfterSeconds))
      : 60,
  };
}

import { randomUUID } from "node:crypto";
import type { AuthResult, MachineDeps } from "./machineGateway.js";

type Env = { url: string; anonKey: string; serviceKey: string };

export function readMachineEnv(env: Record<string, string | undefined> = process.env): Env | null {
  const url = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
  const anonKey = env.VITE_SUPABASE_ANON_KEY;
  const serviceKey = env.SUPABASE_SECRET_KEY_FRESHWEBLITE || env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
  return url && anonKey && serviceKey ? { url: url.replace(/\/$/, ""), anonKey, serviceKey } : null;
}

/** Real dependencies over PostgREST. Public data uses the anon key so RLS decides what is visible; only auth and audit use the service key. */
export function createSupabaseDeps(env: Env, fetchImpl: typeof fetch = fetch): MachineDeps {
  const call = async (key: string, path: string, init: RequestInit = {}) => {
    const res = await fetchImpl(`${env.url}/rest/v1/${path}`, { ...init, headers: { apikey: key, authorization: `Bearer ${key}`, "content-type": "application/json", ...(init.headers as Record<string, string> | undefined) } });
    if (!res.ok) throw new Error(`supabase ${res.status}`);
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  };
  return {
    requestId: () => randomUUID(),
    async authenticate(tokenHash): Promise<AuthResult> {
      const rows = (await call(env.serviceKey, "rpc/machine_authenticate", { method: "POST", body: JSON.stringify({ p_token_hash: tokenHash }) })) as Array<Record<string, unknown>>;
      const r = rows?.[0];
      if (!r) throw new Error("no auth row");
      return { ok: r.ok === true, reason: String(r.reason), credentialId: (r.credential_id as string) ?? null, principalId: (r.principal_id as string) ?? null, scopes: (r.scopes as string[]) ?? [], retryAfter: Number(r.retry_after ?? 0) };
    },
    async audit(e) {
      await call(env.serviceKey, "machine_audit", { method: "POST", headers: { prefer: "return=minimal" }, body: JSON.stringify({ principal_id: e.principalId, credential_id: e.credentialId, method: e.method, path: e.path, status: e.status }) });
    },
    async listShorts(limit) {
      const cols = "id,author_id,caption,view_count,created_at";
      const now = encodeURIComponent(new Date().toISOString());
      try {
        return (await call(env.anonKey, `shorts?select=${cols}&or=(unlock_at.is.null,unlock_at.lte.${now})&order=created_at.desc&limit=${limit}`)) as unknown[];
      } catch {
        return (await call(env.anonKey, `shorts?select=${cols}&order=created_at.desc&limit=${limit}`)) as unknown[];
      }
    },
    async proofRecords(author, after, limit) {
      return (await call(env.anonKey, `proof_records?select=author_id,seq,kind,subject_type,subject_id,body_json,created_at_text,prev_hash,record_hash&author_id=eq.${author}&seq=gt.${after}&order=seq.asc&limit=${limit}`)) as unknown[];
    },
    async proofVerify(author) {
      const rows = (await call(env.anonKey, "rpc/proof_verify_chain", { method: "POST", body: JSON.stringify({ p_author: author }) })) as Array<{ ok: boolean; checked: number | string; broken_seq: number | string | null }>;
      const r = rows[0];
      return { ok: r.ok, checked: Number(r.checked), broken_seq: r.broken_seq === null ? null : Number(r.broken_seq) };
    },
  };
}

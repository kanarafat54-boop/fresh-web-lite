import { createHash, randomBytes } from "node:crypto";

export const TOKEN_PREFIX = "fwm_";

export type NewToken = { token: string; prefix: string; hash: string };

/** A credential is 32 random bytes. Only the SHA-256 hash is ever stored; the token is shown once at issue. */
export function generateToken(): NewToken {
  const token = TOKEN_PREFIX + randomBytes(32).toString("base64url");
  return { token, prefix: tokenPrefix(token), hash: hashToken(token) };
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

/** First 8 characters, safe to show in lists and audit output so a credential can be recognised without exposing it. */
export function tokenPrefix(token: string): string {
  return token.slice(0, 8);
}

/** Extracts a well-formed bearer token, or null. Never throws and never returns a malformed value. */
export function parseBearer(header: string | null | undefined): string | null {
  if (!header) return null;
  const match = /^Bearer\s+(fwm_[A-Za-z0-9_-]{43})$/.exec(header.trim());
  return match ? match[1] : null;
}

export type Maturity = "available" | "planned";

export type MachineCapability = {
  id: string;
  method: "GET";
  path: string;
  scope: string | null;
  summary: string;
  maturity: Maturity;
};

/** Everything a machine can discover. Planned entries are listed so integrators see the direction, but are not callable. */
export const CAPABILITIES: readonly MachineCapability[] = [
  { id: "manifest.get", method: "GET", path: "/manifest", scope: null, summary: "This document. Public.", maturity: "available" },
  { id: "shorts.list", method: "GET", path: "/shorts", scope: "shorts:read", summary: "Recent public Shorts (id, author, caption, views, created_at). Query: limit 1-50.", maturity: "available" },
  { id: "proof.records", method: "GET", path: "/proof/records", scope: "proof:read", summary: "A Fresh Proof author's records in order. Query: author (uuid), after (seq), limit 1-100.", maturity: "available" },
  { id: "proof.verify", method: "GET", path: "/proof/verify", scope: "proof:read", summary: "Server-side check that an author's hash chain is intact. Query: author (uuid).", maturity: "available" },
  { id: "shorts.publish", method: "GET", path: "/shorts", scope: "shorts:write", summary: "Publish a Short on behalf of an account.", maturity: "planned" },
  { id: "events.subscribe", method: "GET", path: "/events", scope: "events:read", summary: "Signed webhooks for platform events.", maturity: "planned" },
];

export const MACHINE_VERSION = "v1";

export function buildManifest(): Record<string, unknown> {
  return {
    name: "Fresh Machine Access",
    version: MACHINE_VERSION,
    phase: "1 (read-only)",
    auth: "Authorization: Bearer fwm_<token>. Credentials are scoped, expire, can be revoked, and are rate limited per minute.",
    envelope: "Every response is { ok, data | error, meta: { request_id, version } }.",
    limits: [
      "Read-only: no write capability exists in this phase.",
      "Fresh does not control physical machines through this interface.",
      "Proof records show who recorded what and when, not whether it is true.",
    ],
    capabilities: CAPABILITIES.map(({ id, method, path, scope, summary, maturity }) => ({ id, method, path, scope, summary, maturity })),
  };
}


export type AuthResult = {
  ok: boolean;
  reason: string;
  credentialId: string | null;
  principalId: string | null;
  scopes: string[];
  retryAfter: number;
};

export type AuditEntry = { principalId: string | null; credentialId: string | null; method: string; path: string; status: number };

export type MachineDeps = {
  authenticate(tokenHash: string): Promise<AuthResult>;
  audit(entry: AuditEntry): Promise<void>;
  listShorts(limit: number): Promise<unknown[]>;
  proofRecords(author: string, after: number, limit: number): Promise<unknown[]>;
  proofVerify(author: string): Promise<{ ok: boolean; checked: number; broken_seq: number | null }>;
  requestId(): string;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function respond(requestId: string, status: number, body: { data?: unknown; error?: { code: string; message: string } }, extra: Record<string, string> = {}): Response {
  const payload = body.error
    ? { ok: false, error: body.error, meta: { request_id: requestId, version: MACHINE_VERSION } }
    : { ok: true, data: body.data, meta: { request_id: requestId, version: MACHINE_VERSION } };
  return Response.json(payload, { status, headers: { "cache-control": "no-store", "x-request-id": requestId, ...extra } });
}

function clampInt(raw: string | null, fallback: number, min: number, max: number): number {
  if (raw === null || raw === "") return fallback;
  const n = Number(raw);
  if (!Number.isInteger(n)) return NaN;
  return Math.min(max, Math.max(min, n));
}

const REASON_STATUS: Record<string, [number, string]> = {
  unknown_token: [401, "unauthorized"],
  revoked: [401, "unauthorized"],
  expired: [401, "unauthorized"],
  principal_disabled: [403, "forbidden"],
  rate_limited: [429, "rate_limited"],
};

/** Handles one machine request. `path` is the part after /api/machine/v1, for example "shorts". Dependencies are injected so every branch is testable. */
export async function handleMachineRequest(req: Request, path: string, deps: MachineDeps): Promise<Response> {
  const requestId = deps.requestId();
  const cleanPath = "/" + path.replace(/^\/+|\/+$/g, "");
  const url = new URL(req.url);
  if (req.method !== "GET") return respond(requestId, 405, { error: { code: "method_not_allowed", message: "Phase 1 is read-only: GET only." } }, { allow: "GET" });

  const capability = CAPABILITIES.find((c) => c.path === cleanPath && c.maturity === "available");
  if (!capability) return respond(requestId, 404, { error: { code: "not_found", message: "No such capability. See /api/machine/v1/manifest." } });

  if (capability.scope === null) return respond(requestId, 200, { data: buildManifest() });

  let principalId: string | null = null;
  let credentialId: string | null = null;
  const finish = async (status: number, body: Parameters<typeof respond>[2], extra: Record<string, string> = {}) => {
    try { await deps.audit({ principalId, credentialId, method: req.method, path: cleanPath, status }); } catch { /* auditing must not change the answer */ }
    return respond(requestId, status, body, extra);
  };

  const token = parseBearer(req.headers.get("authorization"));
  if (!token) return finish(401, { error: { code: "unauthorized", message: "Send Authorization: Bearer fwm_<token>." } }, { "www-authenticate": "Bearer" });

  let auth: AuthResult;
  try { auth = await deps.authenticate(hashToken(token)); } catch {
    return finish(503, { error: { code: "unavailable", message: "Machine access is not available right now." } });
  }
  principalId = auth.principalId;
  credentialId = auth.credentialId;
  if (!auth.ok) {
    const [status, code] = REASON_STATUS[auth.reason] ?? [401, "unauthorized"];
    // The reason is deliberately not echoed for token problems: callers learn only that the credential is not accepted.
    const message = code === "rate_limited" ? "Rate limit reached for this credential." : code === "forbidden" ? "This machine account is disabled." : "Credential not accepted.";
    return finish(status, { error: { code, message } }, code === "rate_limited" ? { "retry-after": String(auth.retryAfter || 1) } : code === "unauthorized" ? { "www-authenticate": "Bearer" } : {});
  }
  if (!auth.scopes.includes(capability.scope)) {
    return finish(403, { error: { code: "insufficient_scope", message: `This credential lacks the ${capability.scope} scope.` } });
  }

  try {
    if (capability.id === "shorts.list") {
      const limit = clampInt(url.searchParams.get("limit"), 20, 1, 50);
      if (Number.isNaN(limit)) return finish(400, { error: { code: "bad_request", message: "limit must be an integer." } });
      return finish(200, { data: { shorts: await deps.listShorts(limit) } });
    }
    const author = url.searchParams.get("author") ?? "";
    if (!UUID.test(author)) return finish(400, { error: { code: "bad_request", message: "author must be a uuid." } });
    if (capability.id === "proof.records") {
      const after = clampInt(url.searchParams.get("after"), 0, 0, Number.MAX_SAFE_INTEGER);
      const limit = clampInt(url.searchParams.get("limit"), 50, 1, 100);
      if (Number.isNaN(after) || Number.isNaN(limit)) return finish(400, { error: { code: "bad_request", message: "after and limit must be integers." } });
      return finish(200, { data: { records: await deps.proofRecords(author.toLowerCase(), after, limit) } });
    }
    if (capability.id === "proof.verify") {
      return finish(200, { data: await deps.proofVerify(author.toLowerCase()) });
    }
  } catch {
    return finish(502, { error: { code: "upstream_error", message: "Data source failed. Try again later." } });
  }
  return finish(404, { error: { code: "not_found", message: "No such capability." } });
}

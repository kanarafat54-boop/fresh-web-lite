import { createHash } from "node:crypto";

export const MAX_MEDIA_BYTES = 150 * 1024 * 1024;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Only media stored in Fresh's own Supabase storage is fetched, so this endpoint cannot be pointed at other servers. */
export function isAllowedMediaUrl(mediaUrl: string, supabaseUrl: string): boolean {
  try {
    const m = new URL(mediaUrl);
    const s = new URL(supabaseUrl);
    return m.protocol === "https:" && m.host === s.host && m.pathname.startsWith("/storage/v1/object/") && !m.username && !m.password;
  } catch { return false; }
}

export class MediaTooLargeError extends Error {}

/** SHA-256 of a byte stream, refusing anything over `max` bytes. */
export async function hashStream(stream: ReadableStream<Uint8Array>, max = MAX_MEDIA_BYTES): Promise<{ sha256: string; size: number }> {
  const hash = createHash("sha256");
  const reader = stream.getReader();
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > max) { await reader.cancel().catch(() => undefined); throw new MediaTooLargeError("The media file is too large to fingerprint."); }
    hash.update(value);
  }
  return { sha256: hash.digest("hex"), size };
}

export type FingerprintRow = { short_id: string; author_id: string; sha256: string; size_bytes: number; registered_at: string; proof_seq: number | null; proof_hash: string | null };
export type Match = { short_id: string; author_id: string; username: string | null; registered_at: string; is_first: boolean };

export type FingerprintDeps = {
  loadShort(shortId: string): Promise<{ author_id: string | null; video_url: string } | null>;
  existing(shortId: string): Promise<FingerprintRow | null>;
  fetchMedia(url: string): Promise<{ body: ReadableStream<Uint8Array>; contentLength: number | null }>;
  writeProof(authorId: string, shortId: string, bodyJson: string): Promise<{ seq: number; hash: string } | null>;
  insert(row: Omit<FingerprintRow, "registered_at">): Promise<FingerprintRow | null>;
  matches(sha256: string): Promise<Match[]>;
  supabaseUrl: string;
  /** The Proof chain's canonical JSON, so the written body matches what verifiers recompute. */
  canonicalJson(value: unknown): string;
};

export type FingerprintOutcome =
  | { ok: true; created: boolean; fingerprint: FingerprintRow; matches: Match[] }
  | { ok: false; status: number; error: string };

export function fingerprintBody(canonicalJson: (value: unknown) => string, shortId: string, sha256: string, size: number): string {
  return canonicalJson({ v: 1, type: "fingerprint", short_id: shortId, sha256, size_bytes: size });
}

/** Registers the fingerprint of one Short's media. Only the Short's author may ask; asking again returns the first record. */
export async function registerFingerprint(deps: FingerprintDeps, userId: string, shortId: unknown): Promise<FingerprintOutcome> {
  if (typeof shortId !== "string" || !UUID.test(shortId)) return { ok: false, status: 400, error: "A valid Short id is required." };
  const short = await deps.loadShort(shortId);
  if (!short) return { ok: false, status: 404, error: "Short not found." };
  if (short.author_id !== userId) return { ok: false, status: 403, error: "Only the creator can register this Short's file." };

  const existing = await deps.existing(shortId);
  if (existing) return { ok: true, created: false, fingerprint: existing, matches: await deps.matches(existing.sha256) };

  if (!short.video_url || !isAllowedMediaUrl(short.video_url, deps.supabaseUrl)) return { ok: false, status: 422, error: "This Short's media is not stored on Fresh, so it cannot be fingerprinted." };
  let media;
  try { media = await deps.fetchMedia(short.video_url); } catch { return { ok: false, status: 502, error: "Fresh could not read the media file." }; }
  if (media.contentLength !== null && media.contentLength > MAX_MEDIA_BYTES) return { ok: false, status: 413, error: "The media file is too large to fingerprint." };
  let hashed;
  try { hashed = await hashStream(media.body); } catch (e) {
    return e instanceof MediaTooLargeError ? { ok: false, status: 413, error: e.message } : { ok: false, status: 502, error: "Fresh could not read the media file." };
  }
  if (hashed.size === 0) return { ok: false, status: 422, error: "The media file is empty." };

  const proof = await deps.writeProof(userId, shortId, fingerprintBody(deps.canonicalJson, shortId, hashed.sha256, hashed.size));
  const row = await deps.insert({ short_id: shortId, author_id: userId, sha256: hashed.sha256, size_bytes: hashed.size, proof_seq: proof?.seq ?? null, proof_hash: proof?.hash ?? null });
  if (!row) {
    const raced = await deps.existing(shortId);
    if (raced) return { ok: true, created: false, fingerprint: raced, matches: await deps.matches(raced.sha256) };
    return { ok: false, status: 500, error: "Fresh could not record the fingerprint." };
  }
  return { ok: true, created: true, fingerprint: row, matches: await deps.matches(row.sha256) };
}

type Env = Record<string, string | undefined>;

/** POST { shortId } with the creator's session token. Reached through api/ai/ask.ts (?__fresh_fingerprint=1). */
export async function handleFingerprint(req: Request, env: Env = process.env): Promise<Response> {
  const headers = { "cache-control": "no-store" };
  const send = (body: unknown, status = 200) => Response.json(body, { status, headers });
  if (req.method !== "POST") return send({ error: "Method not allowed." }, 405);
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return send({ error: "Authentication required." }, 401);
  const url = env.SUPABASE_URL || env.VITE_SUPABASE_URL;
  const anon = env.VITE_SUPABASE_ANON_KEY;
  const service = env.SUPABASE_SECRET_KEY_FRESHWEBLITE || env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anon || !service) return send({ error: "Fingerprinting is not configured." }, 503);
  let body: { shortId?: unknown };
  try { body = (await req.json()) as { shortId?: unknown }; } catch { return send({ error: "Invalid JSON body." }, 400); }

  const { createClient } = await import("@supabase/supabase-js");
  const opts = { auth: { persistSession: false, autoRefreshToken: false } };
  const { data: auth, error: authError } = await createClient(url, anon, opts).auth.getUser(token);
  if (authError || !auth.user) return send({ error: "Invalid authentication session." }, 401);
  const db = createClient(url, service, opts);

  const { canonicalJson } = await import("../core/proof/proofChain.js");
  const deps: FingerprintDeps = {
    supabaseUrl: url,
    canonicalJson,
    async loadShort(id) { const { data } = await db.from("shorts").select("author_id, video_url").eq("id", id).maybeSingle(); return data as { author_id: string | null; video_url: string } | null; },
    async existing(id) { const { data } = await db.from("short_media_fingerprints").select("*").eq("short_id", id).maybeSingle(); return data as FingerprintRow | null; },
    async fetchMedia(mediaUrl) {
      const res = await fetch(mediaUrl, { redirect: "error", signal: AbortSignal.timeout(50_000) });
      if (!res.ok || !res.body) throw new Error(`media fetch ${res.status}`);
      const length = Number(res.headers.get("content-length"));
      return { body: res.body, contentLength: Number.isFinite(length) && length > 0 ? length : null };
    },
    async writeProof(authorId, id, bodyJson) {
      const { data, error } = await db.from("proof_records").insert({ author_id: authorId, kind: "fingerprint", subject_type: "short", subject_id: id, body_json: bodyJson }).select("seq, record_hash").single();
      return error || !data ? null : { seq: Number((data as { seq: number }).seq), hash: (data as { record_hash: string }).record_hash };
    },
    async insert(row) { const { data, error } = await db.from("short_media_fingerprints").insert(row).select("*").single(); return error ? null : (data as FingerprintRow); },
    async matches(sha) { const { data } = await db.rpc("fingerprint_matches", { p_sha256: sha }); return (data ?? []) as Match[]; },
  };
  const outcome = await registerFingerprint(deps, auth.user.id, body.shortId);
  return outcome.ok ? send({ created: outcome.created, fingerprint: outcome.fingerprint, matches: outcome.matches }) : send({ error: outcome.error }, outcome.status);
}

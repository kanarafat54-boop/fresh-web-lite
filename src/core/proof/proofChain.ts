/**
 * Fresh Proof: verify a chain of proof records without trusting Fresh.
 *
 * Anyone (a partner company, an auditor, a script) can fetch an author's records from the public API and run
 * `verifyChain`. It recomputes every hash itself; it never asks the server whether the chain is valid.
 * The hashed text must match `public.proof_hash_input` in the database migration exactly.
 */
export type ProofKind = "claim" | "prediction" | "promise" | "provenance" | "action";

export type ProofRecord = {
  author_id: string;
  seq: number;
  kind: ProofKind;
  subject_type: string | null;
  subject_id: string | null;
  body_json: string;
  created_at_text: string;
  prev_hash: string;
  record_hash: string;
};

export const GENESIS_HASH = "0".repeat(64);

/** Canonical JSON: object keys sorted, no whitespace, so the same content always gives the same text. */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== "object") {
    if (typeof value === "number" && !Number.isFinite(value)) throw new Error("Proof bodies cannot contain NaN or Infinity");
    return JSON.stringify(value) ?? "null";
  }
  if (Array.isArray(value)) return `[${value.map((item) => canonicalJson(item)).join(",")}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, item]) => item !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`).join(",")}}`;
}

export function proofHashInput(record: Pick<ProofRecord, "prev_hash" | "author_id" | "seq" | "kind" | "subject_type" | "subject_id" | "created_at_text" | "body_json">): string {
  return [
    record.prev_hash, record.author_id, String(record.seq), record.kind,
    record.subject_type ?? "", record.subject_id ?? "", record.created_at_text, record.body_json,
  ].join("|");
}

export async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export type ChainCheck = { ok: boolean; checked: number; brokenSeq: number | null; reason?: string };

/** Checks one author's records: numbering has no gaps, each links to the previous hash, each hash is correct. */
export async function verifyChain(records: readonly ProofRecord[]): Promise<ChainCheck> {
  const ordered = [...records].sort((a, b) => a.seq - b.seq);
  let expectedPrev = GENESIS_HASH;
  let expectedSeq = 1;
  let checked = 0;
  const author = ordered[0]?.author_id;
  for (const record of ordered) {
    if (record.author_id !== author) return { ok: false, checked, brokenSeq: record.seq, reason: "records from more than one author" };
    if (record.seq !== expectedSeq) return { ok: false, checked, brokenSeq: record.seq, reason: "a record is missing or repeated" };
    if (record.prev_hash !== expectedPrev) return { ok: false, checked, brokenSeq: record.seq, reason: "does not link to the previous record" };
    if ((await sha256Hex(proofHashInput(record))) !== record.record_hash) return { ok: false, checked, brokenSeq: record.seq, reason: "content does not match its hash" };
    expectedPrev = record.record_hash;
    expectedSeq += 1;
    checked += 1;
  }
  return { ok: true, checked, brokenSeq: null };
}

/** Matches `public.proof_daily_digest`: SHA-256 over the day's record hashes ordered by author then sequence. */
export async function dailyDigest(records: readonly Pick<ProofRecord, "author_id" | "seq" | "record_hash">[]): Promise<string> {
  const ordered = [...records].sort((a, b) => (a.author_id < b.author_id ? -1 : a.author_id > b.author_id ? 1 : a.seq - b.seq));
  return sha256Hex(ordered.map((record) => record.record_hash).join(""));
}

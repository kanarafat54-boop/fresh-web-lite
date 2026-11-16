import { supabase } from "../../../lib/supabase";
import { hashBlob, type Readable } from "./sha256";
import type { FingerprintInfo, FingerprintMatch } from "./originVerification";

type FingerprintRow = { sha256: string; size_bytes: number | string; registered_at: string; proof_hash: string | null };
type MatchRow = { short_id: string; author_id: string; username: string | null; registered_at: string; is_first: boolean };

const toInfo = (row: FingerprintRow): FingerprintInfo => ({ sha256: row.sha256, sizeBytes: Number(row.size_bytes), registeredAt: row.registered_at, proofHash: row.proof_hash });
const toMatch = (row: MatchRow): FingerprintMatch => ({ shortId: row.short_id, authorId: row.author_id, username: row.username, registeredAt: row.registered_at, isFirst: row.is_first });

export type FingerprintState = { available: boolean; own: FingerprintInfo | null; matches: FingerprintMatch[] };

export async function loadFingerprint(shortId: string): Promise<FingerprintState> {
  const { data, error } = await supabase.from("short_media_fingerprints").select("sha256, size_bytes, registered_at, proof_hash").eq("short_id", shortId).maybeSingle();
  if (error) return { available: false, own: null, matches: [] };
  if (!data) return { available: true, own: null, matches: [] };
  const own = toInfo(data as FingerprintRow);
  return { available: true, own, matches: await matchesFor(own.sha256) };
}

export async function matchesFor(sha256: string): Promise<FingerprintMatch[]> {
  const { data, error } = await supabase.rpc("fingerprint_matches", { p_sha256: sha256 });
  return error ? [] : ((data ?? []) as MatchRow[]).map(toMatch);
}

/** Asks the server to fingerprint a Short's media (creator only). Never throws; returns whether it is now registered. */
export async function registerFingerprint(shortId: string): Promise<boolean> {
  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return false;
    const res = await fetch("/api/ai/ask?__fresh_fingerprint=1", { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${token}` }, body: JSON.stringify({ shortId }) });
    return res.ok;
  } catch { return false; }
}

/** Hashes a file on this device (it is not uploaded) and looks up who registered it. */
export async function lookupFile(file: Readable, onProgress?: (fraction: number) => void): Promise<{ sha256: string; matches: FingerprintMatch[] }> {
  const sha256 = await hashBlob(file, onProgress);
  return { sha256, matches: await matchesFor(sha256) };
}

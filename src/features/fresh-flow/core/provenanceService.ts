import { supabase } from "../../../lib/supabase";
import { assembleDeclarations, buildProvenanceBody, isProvenanceUnavailable, validateProvenance, type Declaration, type ProvenanceInput, type ProvenanceRow } from "./provenance";

export type ProvenanceResult = { declarations: Declaration[]; available: boolean };

export async function loadProvenance(shortId: string, authorId: string): Promise<ProvenanceResult> {
  const { data, error } = await supabase.from("proof_records").select("author_id, seq, kind, subject_type, subject_id, body_json, created_at, record_hash").eq("kind", "provenance").eq("subject_type", "short").eq("subject_id", shortId).eq("author_id", authorId).order("seq", { ascending: false }).limit(20);
  if (error) {
    if (isProvenanceUnavailable(error)) return { declarations: [], available: false };
    throw new Error(error.message);
  }
  return { declarations: assembleDeclarations((data ?? []) as ProvenanceRow[], shortId, authorId), available: true };
}

export type WriteOutcome = { ok: true } | { ok: false; problems: string[] };

export async function declareProvenance(shortId: string, input: ProvenanceInput): Promise<WriteOutcome> {
  const problems = validateProvenance(input);
  if (problems.length) return { ok: false, problems };
  const { error } = await supabase.from("proof_records").insert({ kind: "provenance", subject_type: "short", subject_id: shortId, body_json: buildProvenanceBody(input) });
  if (!error) return { ok: true };
  if (isProvenanceUnavailable(error)) return { ok: false, problems: ["Origin declarations are not available yet. They will work once Fresh finishes setting them up."] };
  return { ok: false, problems: ["Fresh could not record this declaration. Try again."] };
}

/** Server-side check that none of this author's Proof records changed after publishing. */
export async function checkAuthorChain(authorId: string): Promise<{ ok: boolean; checked: number } | null> {
  const { data, error } = await supabase.rpc("proof_verify_chain", { p_author: authorId });
  const row = Array.isArray(data) ? (data[0] as { ok?: boolean; checked?: number | string } | undefined) : undefined;
  if (error || !row) return null;
  return { ok: row.ok === true, checked: Number(row.checked ?? 0) };
}

import { canonicalJson } from "../../../core/proof/proofChain.ts";

/**
 * Origin of a Short, declared by its creator and recorded on Fresh Proof (kind "provenance"). The record is
 * server-timestamped, chained and cannot be edited, so the creator cannot quietly change the story later.
 * Fresh does NOT verify that the declaration is true; the panel says so.
 */
export type Origin = "original" | "remix" | "third-party" | "ai-assisted" | "ai-generated";

export const ORIGINS: Array<{ id: Origin; label: string; help: string; needsCredit: boolean }> = [
  { id: "original", label: "Original", help: "I made this myself.", needsCredit: false },
  { id: "remix", label: "Remix or reuse", help: "Built on another creator's work, with credit.", needsCredit: true },
  { id: "third-party", label: "Third-party material", help: "Footage, images or audio I did not make, credited.", needsCredit: true },
  { id: "ai-assisted", label: "AI-assisted", help: "Made by me with AI tools helping.", needsCredit: false },
  { id: "ai-generated", label: "AI-generated", help: "Mostly produced by an AI tool.", needsCredit: false },
];

export const NOTE_MAX = 300;
export const TOOLS_MAX = 200;

export const PROVENANCE_NOTICE = [
  "This is the creator's own declaration. Fresh has not checked that it is true.",
  "Each declaration is time-stamped and cannot be edited. A new declaration is added to the history, never replaces it.",
] as const;

export type ProvenanceInput = { origin: Origin | ""; tools?: string; sourceUrl?: string; note?: string; acknowledged: boolean };

export type ProvenanceRow = { author_id: string; seq: number; kind: string; subject_type: string | null; subject_id: string | null; body_json: string; created_at: string; record_hash?: string };

export type Declaration = { seq: number; origin: Origin; tools: string | null; sourceUrl: string | null; note: string | null; declaredAt: string; recordHash: string | null };

const isHttpUrl = (value: string) => { try { const u = new URL(value); return u.protocol === "http:" || u.protocol === "https:"; } catch { return false; } };
const isOrigin = (value: unknown): value is Origin => ORIGINS.some((o) => o.id === value);

export function originLabel(origin: Origin): string { return ORIGINS.find((o) => o.id === origin)?.label ?? origin; }

export function validateProvenance(input: ProvenanceInput): string[] {
  const problems: string[] = [];
  const meta = ORIGINS.find((o) => o.id === input.origin);
  if (!meta) problems.push("Choose where this Short comes from.");
  const url = input.sourceUrl?.trim() ?? "";
  const note = input.note?.trim() ?? "";
  if (url && !isHttpUrl(url)) problems.push("The source must be a web address starting with http:// or https://.");
  if (meta?.needsCredit && !url && note.length < 3) problems.push("Credit the original: add a link or say who made it.");
  if (note.length > NOTE_MAX) problems.push(`Keep the note under ${NOTE_MAX} characters.`);
  if ((input.tools?.trim().length ?? 0) > TOOLS_MAX) problems.push(`Keep the tools list under ${TOOLS_MAX} characters.`);
  if ((input.origin === "ai-assisted" || input.origin === "ai-generated") && (input.tools?.trim().length ?? 0) < 2) problems.push("Name the AI tool or tools used.");
  if (!input.acknowledged) problems.push("Confirm that this is accurate and cannot be edited.");
  return problems;
}

export function buildProvenanceBody(input: ProvenanceInput): string {
  return canonicalJson({ v: 1, type: "provenance", origin: input.origin, tools: input.tools?.trim() || null, source_url: input.sourceUrl?.trim() || null, note: input.note?.trim() || null });
}

/** Declarations about one Short, newest first. Only records written by the Short's own author count. */
export function assembleDeclarations(rows: ProvenanceRow[], shortId: string, authorId: string): Declaration[] {
  const out: Declaration[] = [];
  for (const row of rows) {
    if (row.kind !== "provenance" || row.subject_type !== "short" || row.subject_id !== shortId || row.author_id !== authorId) continue;
    if (!Number.isFinite(Date.parse(row.created_at))) continue;
    let body: Record<string, unknown>;
    try { body = JSON.parse(row.body_json) as Record<string, unknown>; } catch { continue; }
    if (!body || body.type !== "provenance" || !isOrigin(body.origin)) continue;
    const text = (v: unknown) => (typeof v === "string" && v.trim() ? v : null);
    const url = text(body.source_url);
    out.push({ seq: row.seq, origin: body.origin, tools: text(body.tools), sourceUrl: url && isHttpUrl(url) ? url : null, note: text(body.note), declaredAt: row.created_at, recordHash: row.record_hash ?? null });
  }
  return out.sort((a, b) => b.seq - a.seq);
}

export function isProvenanceUnavailable(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false;
  return error.code === "42P01" || error.code === "PGRST205" || (/proof_records/i.test(error.message ?? "") && /(does not exist|schema cache)/i.test(error.message ?? ""));
}

/** Short badge text for the current declaration, or null when the creator declared nothing. */
export function badgeFor(declarations: Declaration[]): string | null {
  const current = declarations[0];
  if (!current) return null;
  return `${originLabel(current.origin)} · declared by creator`;
}

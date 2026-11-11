import { canonicalJson } from "../../../core/proof/proofChain.ts";

/**
 * Prediction Ledger on Fresh Proof. A prediction is a proof record (kind "prediction") about a Short; its outcome is a
 * second proof record (kind "claim", body.type "resolution") written by the same author. Pure rules live here; the
 * database (append-only, server-timestamped) guarantees the wording and the date cannot change after publishing.
 */
export const MIN_RESOLVED_FOR_HIT_RATE = 5;
export const STATEMENT_MAX = 280;
export const CRITERIA_MAX = 500;
const DAY_MS = 24 * 60 * 60 * 1000;

export type PredictionInput = {
  statement: string;
  criteria: string;
  /** Date the outcome can be judged, as YYYY-MM-DD (UTC). */
  resolvesOn: string;
  probability?: number | null;
  sourceUrl?: string | null;
  acknowledged: boolean;
};

export type Outcome = "hit" | "miss" | "void" | "withdrawn";

export type ProofRow = {
  author_id: string;
  seq: number;
  kind: string;
  subject_type: string | null;
  subject_id: string | null;
  body_json: string;
  created_at: string;
};

export type Prediction = {
  authorId: string;
  seq: number;
  key: string;
  shortId: string;
  statement: string;
  criteria: string;
  resolvesOn: string;
  probability: number | null;
  sourceUrl: string | null;
  publishedAt: string;
};

export type Resolution = { outcome: Outcome; evidenceUrl: string | null; note: string | null; recordedAt: string };
export type PredictionState = "open" | "due" | Outcome;
export type PredictionWithState = Prediction & { state: PredictionState; resolution: Resolution | null };

export const PREDICTION_NOTICE = [
  "A prediction is an opinion and a commitment. It is not advice, and Fresh is not a betting or trading product.",
  "The wording, the date and how it will be judged cannot be changed after you publish. You can withdraw it, but a withdrawal stays visible and counts against your record.",
  "Do not predict harm to named private people, and do not post betting odds or financial advice.",
] as const;

export function predictionKey(authorId: string, seq: number): string { return `${authorId}:${seq}`; }

function isHttpUrl(value: string): boolean {
  try { const u = new URL(value); return u.protocol === "http:" || u.protocol === "https:"; } catch { return false; }
}

function dayStartUtc(day: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const t = Date.parse(`${day}T00:00:00Z`);
  return Number.isFinite(t) ? t : null;
}

/** Returns a list of plain-language problems; empty means the prediction can be published. */
export function validatePrediction(input: PredictionInput, now: number = Date.now()): string[] {
  const problems: string[] = [];
  const statement = input.statement.trim();
  const criteria = input.criteria.trim();
  if (statement.length < 10) problems.push("Write the prediction in at least 10 characters.");
  if (statement.length > STATEMENT_MAX) problems.push(`Keep the prediction under ${STATEMENT_MAX} characters.`);
  if (criteria.length < 10) problems.push("Say how it will be judged: what outcome, measured how, from what source.");
  if (criteria.length > CRITERIA_MAX) problems.push(`Keep the judging rule under ${CRITERIA_MAX} characters.`);
  const when = dayStartUtc(input.resolvesOn);
  if (when === null) problems.push("Choose the date the outcome can be judged.");
  else if (when < now + DAY_MS - (now % DAY_MS)) problems.push("The date must be tomorrow or later.");
  else if (when > now + 5 * 365 * DAY_MS) problems.push("The date can be at most five years away.");
  if (input.probability != null && (!Number.isInteger(input.probability) || input.probability < 1 || input.probability > 99)) problems.push("Probability must be a whole number from 1 to 99, or left empty.");
  if (input.sourceUrl && !isHttpUrl(input.sourceUrl)) problems.push("The source must be a web address starting with http:// or https://.");
  if (!input.acknowledged) problems.push("Confirm that you understand this is an opinion, not advice, and cannot be edited.");
  return problems;
}

export function buildPredictionBody(input: PredictionInput): string {
  return canonicalJson({
    v: 1,
    type: "prediction",
    statement: input.statement.trim(),
    criteria: input.criteria.trim(),
    resolves_on: input.resolvesOn,
    probability: input.probability ?? null,
    source_url: input.sourceUrl?.trim() || null,
  });
}

export function buildResolutionBody(outcome: Outcome, evidenceUrl: string | null, note: string | null): string {
  return canonicalJson({ v: 1, type: "resolution", outcome, evidence_url: evidenceUrl?.trim() || null, note: note?.trim() || null });
}

/** A resolution needs evidence (except a withdrawal) and can only be recorded on or after the resolve date. */
export function validateResolution(prediction: Prediction, outcome: Outcome, evidenceUrl: string | null, now: number = Date.now()): string[] {
  const problems: string[] = [];
  if (outcome !== "withdrawn") {
    const due = dayStartUtc(prediction.resolvesOn);
    if (due === null || now < due) problems.push("The outcome can only be recorded on or after the resolve date. You can withdraw the prediction before then.");
    if (outcome !== "void" && !(evidenceUrl && isHttpUrl(evidenceUrl))) problems.push("Add a link to the evidence (a web address starting with http:// or https://).");
  }
  return problems;
}

function parseJson(text: string): Record<string, unknown> | null {
  try { const v = JSON.parse(text); return v && typeof v === "object" && !Array.isArray(v) ? v as Record<string, unknown> : null; } catch { return null; }
}

export function parsePrediction(row: ProofRow): Prediction | null {
  if (row.kind !== "prediction" || row.subject_type !== "short" || !row.subject_id) return null;
  const body = parseJson(row.body_json);
  if (!body || body.type !== "prediction" || typeof body.statement !== "string" || typeof body.criteria !== "string" || typeof body.resolves_on !== "string") return null;
  return {
    authorId: row.author_id, seq: row.seq, key: predictionKey(row.author_id, row.seq), shortId: row.subject_id,
    statement: body.statement, criteria: body.criteria, resolvesOn: body.resolves_on,
    probability: typeof body.probability === "number" ? body.probability : null,
    sourceUrl: typeof body.source_url === "string" ? body.source_url : null,
    publishedAt: row.created_at,
  };
}

/** The first resolution written by the prediction's own author wins; later ones and other authors' records are ignored. */
export function pickResolution(prediction: Prediction, rows: readonly ProofRow[]): Resolution | null {
  const candidates = rows
    .filter((row) => row.kind === "claim" && row.subject_type === "prediction" && row.subject_id === prediction.key && row.author_id === prediction.authorId)
    .sort((a, b) => a.seq - b.seq);
  for (const row of candidates) {
    const body = parseJson(row.body_json);
    if (!body || body.type !== "resolution") continue;
    const outcome = body.outcome;
    if (outcome !== "hit" && outcome !== "miss" && outcome !== "void" && outcome !== "withdrawn") continue;
    return { outcome, evidenceUrl: typeof body.evidence_url === "string" ? body.evidence_url : null, note: typeof body.note === "string" ? body.note : null, recordedAt: row.created_at };
  }
  return null;
}

export function withState(prediction: Prediction, resolution: Resolution | null, now: number = Date.now()): PredictionWithState {
  if (resolution) return { ...prediction, resolution, state: resolution.outcome };
  const due = dayStartUtc(prediction.resolvesOn);
  return { ...prediction, resolution: null, state: due !== null && now >= due ? "due" : "open" };
}

export function assemblePredictions(predictionRows: readonly ProofRow[], resolutionRows: readonly ProofRow[], now: number = Date.now()): PredictionWithState[] {
  const list: PredictionWithState[] = [];
  for (const row of predictionRows) {
    const prediction = parsePrediction(row);
    if (prediction) list.push(withState(prediction, pickResolution(prediction, resolutionRows), now));
  }
  return list.sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1));
}

export type TrackRecord = {
  total: number; open: number; due: number; hits: number; misses: number; voids: number; withdrawn: number;
  /** Hits out of hits + misses + withdrawals, shown only from MIN_RESOLVED_FOR_HIT_RATE judged predictions. Null otherwise. */
  hitRate: number | null;
  /** For predictions that stated a probability: average stated probability vs. actual hit share. */
  calibration: { count: number; statedAverage: number; actual: number } | null;
};

export function trackRecord(predictions: readonly PredictionWithState[]): TrackRecord {
  const count = (state: PredictionState) => predictions.filter((p) => p.state === state).length;
  const hits = count("hit"), misses = count("miss"), withdrawn = count("withdrawn");
  const judged = hits + misses + withdrawn;
  const withProbability = predictions.filter((p) => p.probability != null && (p.state === "hit" || p.state === "miss"));
  return {
    total: predictions.length, open: count("open"), due: count("due"), hits, misses, voids: count("void"), withdrawn,
    hitRate: judged >= MIN_RESOLVED_FOR_HIT_RATE ? Math.round((hits / judged) * 100) : null,
    calibration: withProbability.length >= MIN_RESOLVED_FOR_HIT_RATE ? {
      count: withProbability.length,
      statedAverage: Math.round(withProbability.reduce((sum, p) => sum + (p.probability as number), 0) / withProbability.length),
      actual: Math.round((withProbability.filter((p) => p.state === "hit").length / withProbability.length) * 100),
    } : null,
  };
}

export function stateLabel(state: PredictionState): string {
  return { open: "Open", due: "Ready to judge", hit: "Hit", miss: "Miss", void: "Void", withdrawn: "Withdrawn" }[state];
}

/** True when the Proof table is not in the database yet (migration not applied). */
export function isPredictionsUnavailable(error: { code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false;
  return error.code === "42P01" || error.code === "PGRST205" || /proof_records/i.test(error.message ?? "") && /(does not exist|schema cache)/i.test(error.message ?? "");
}

import { supabase } from "../../../lib/supabase";
import {
  assemblePredictions, buildPredictionBody, buildResolutionBody, isPredictionsUnavailable, predictionKey, trackRecord,
  validatePrediction, validateResolution,
  type Outcome, type PredictionInput, type PredictionWithState, type ProofRow, type TrackRecord,
} from "./predictions";

const COLUMNS = "author_id, seq, kind, subject_type, subject_id, body_json, created_at";

export type PredictionsResult = { predictions: PredictionWithState[]; available: boolean };

async function loadResolutions(keys: string[]): Promise<ProofRow[]> {
  if (keys.length === 0) return [];
  const { data, error } = await supabase.from("proof_records").select(COLUMNS).eq("kind", "claim").eq("subject_type", "prediction").in("subject_id", keys);
  if (error) throw new Error(error.message);
  return (data ?? []) as ProofRow[];
}

async function assemble(rows: ProofRow[]): Promise<PredictionsResult> {
  const keys = rows.map((row) => predictionKey(row.author_id, row.seq));
  return { predictions: assemblePredictions(rows, await loadResolutions(keys)), available: true };
}

/** Predictions attached to one Short. `available` is false until the Fresh Proof migration is applied. */
export async function loadShortPredictions(shortId: string): Promise<PredictionsResult> {
  const { data, error } = await supabase.from("proof_records").select(COLUMNS).eq("kind", "prediction").eq("subject_type", "short").eq("subject_id", shortId).order("seq", { ascending: false }).limit(20);
  if (error) {
    if (isPredictionsUnavailable(error)) return { predictions: [], available: false };
    throw new Error(error.message);
  }
  return assemble((data ?? []) as ProofRow[]);
}

/** Every prediction by one creator, for their track record. */
export async function loadAuthorTrackRecord(authorId: string): Promise<{ record: TrackRecord; predictions: PredictionWithState[]; available: boolean }> {
  const { data, error } = await supabase.from("proof_records").select(COLUMNS).eq("author_id", authorId).eq("kind", "prediction").eq("subject_type", "short").order("seq", { ascending: false }).limit(200);
  if (error) {
    if (isPredictionsUnavailable(error)) return { record: trackRecord([]), predictions: [], available: false };
    throw new Error(error.message);
  }
  const { predictions } = await assemble((data ?? []) as ProofRow[]);
  return { record: trackRecord(predictions), predictions, available: true };
}

export type WriteOutcome = { ok: true } | { ok: false; problems: string[]; unavailable?: boolean };

export async function publishPrediction(shortId: string, input: PredictionInput): Promise<WriteOutcome> {
  const problems = validatePrediction(input);
  if (problems.length) return { ok: false, problems };
  const { error } = await supabase.from("proof_records").insert({ kind: "prediction", subject_type: "short", subject_id: shortId, body_json: buildPredictionBody(input) });
  if (!error) return { ok: true };
  if (isPredictionsUnavailable(error)) return { ok: false, problems: ["Predictions are not available yet. They will work once Fresh finishes setting them up."], unavailable: true };
  return { ok: false, problems: ["Fresh could not publish this prediction. Try again."] };
}

export async function recordOutcome(prediction: PredictionWithState, outcome: Outcome, evidenceUrl: string | null, note: string | null): Promise<WriteOutcome> {
  const problems = validateResolution(prediction, outcome, evidenceUrl);
  if (problems.length) return { ok: false, problems };
  const { error } = await supabase.from("proof_records").insert({ kind: "claim", subject_type: "prediction", subject_id: prediction.key, body_json: buildResolutionBody(outcome, evidenceUrl, note) });
  return error ? { ok: false, problems: ["Fresh could not record this outcome. Try again."] } : { ok: true };
}

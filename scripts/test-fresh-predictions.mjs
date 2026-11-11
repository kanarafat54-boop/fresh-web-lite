import assert from "node:assert/strict";
import fs from "node:fs";
import {
  assemblePredictions, buildPredictionBody, buildResolutionBody, isPredictionsUnavailable, parsePrediction, pickResolution,
  predictionKey, trackRecord, validatePrediction, validateResolution, withState, MIN_RESOLVED_FOR_HIT_RATE,
} from "../src/features/fresh-flow/core/predictions.ts";

const NOW = Date.parse("2026-11-11T09:00:00Z");
const good = { statement: "Team Blue wins the cup final on 14 December.", criteria: "Official final score published by the league website.", resolvesOn: "2026-12-15", probability: 70, sourceUrl: "https://example.com/league", acknowledged: true };

// Validation: a good prediction passes; each rule fails on its own.
assert.deepEqual(validatePrediction(good, NOW), []);
const bad = (patch) => validatePrediction({ ...good, ...patch }, NOW);
assert.ok(bad({ statement: "short" }).length);
assert.ok(bad({ statement: "x".repeat(281) }).length);
assert.ok(bad({ criteria: "" }).length, "must say how it is judged");
assert.ok(bad({ resolvesOn: "2026-11-11" }).length, "today is too soon");
assert.deepEqual(bad({ resolvesOn: "2026-11-12" }), [], "tomorrow is fine");
assert.ok(bad({ resolvesOn: "2032-01-01" }).length, "more than five years away");
assert.ok(bad({ resolvesOn: "soon" }).length);
assert.ok(bad({ probability: 0 }).length && bad({ probability: 100 }).length && bad({ probability: 50.5 }).length);
assert.deepEqual(bad({ probability: null }), []);
assert.ok(bad({ sourceUrl: "javascript:alert(1)" }).length, "only http(s) sources");
assert.ok(bad({ acknowledged: false }).length);

// Body is canonical JSON, identical regardless of input key order, and carries the locked fields.
const body = JSON.parse(buildPredictionBody(good));
assert.equal(body.statement, good.statement); assert.equal(body.resolves_on, "2026-12-15"); assert.equal(body.type, "prediction");
assert.equal(buildPredictionBody(good), buildPredictionBody({ ...good, statement: `  ${good.statement}  ` }));

// Rows -> predictions.
const A = "aaaaaaaa-0000-0000-0000-000000000001", B = "bbbbbbbb-0000-0000-0000-000000000002";
const pRow = (seq, patch = {}, input = good) => ({ author_id: A, seq, kind: "prediction", subject_type: "short", subject_id: "short-1", body_json: buildPredictionBody(input), created_at: `2026-11-0${seq}T10:00:00Z`, ...patch });
const rRow = (author, seq, key, outcome, evidence = "https://example.com/e") => ({ author_id: author, seq, kind: "claim", subject_type: "prediction", subject_id: key, body_json: buildResolutionBody(outcome, evidence, null), created_at: "2026-12-16T10:00:00Z" });
assert.equal(parsePrediction(pRow(1))?.key, predictionKey(A, 1));
assert.equal(parsePrediction(pRow(1, { kind: "claim" })), null);
assert.equal(parsePrediction(pRow(1, { body_json: "nope" })), null);
assert.equal(parsePrediction(pRow(1, { subject_type: "post" })), null);

// Only the prediction's own author can resolve it; the first resolution wins; junk is ignored.
const pred = parsePrediction(pRow(1));
const key = pred.key;
assert.equal(pickResolution(pred, [rRow(B, 1, key, "hit")]), null, "another account cannot resolve it");
assert.equal(pickResolution(pred, [rRow(A, 2, key, "miss"), rRow(A, 3, key, "hit")]).outcome, "miss", "first resolution wins, no flip-flopping");
assert.equal(pickResolution(pred, [{ ...rRow(A, 2, key, "hit"), body_json: '{"type":"resolution","outcome":"won"}' }]), null);

// State: open before the date, due on it, resolved after a resolution.
assert.equal(withState(pred, null, Date.parse("2026-12-14T00:00:00Z")).state, "open");
assert.equal(withState(pred, null, Date.parse("2026-12-15T00:00:00Z")).state, "due");
assert.equal(withState(pred, pickResolution(pred, [rRow(A, 2, key, "hit")]), NOW).state, "hit");

// Resolution rules: not before the date (except withdrawal), evidence required for hit/miss.
const before = Date.parse("2026-12-01T00:00:00Z"), after = Date.parse("2026-12-16T00:00:00Z");
assert.ok(validateResolution(pred, "hit", "https://example.com/e", before).length);
assert.deepEqual(validateResolution(pred, "withdrawn", null, before), []);
assert.ok(validateResolution(pred, "hit", null, after).length);
assert.ok(validateResolution(pred, "hit", "ftp://x", after).length);
assert.deepEqual(validateResolution(pred, "miss", "https://example.com/e", after), []);
assert.deepEqual(validateResolution(pred, "void", null, after), []);

// Track record: no hit rate until enough are judged; withdrawals count against; calibration needs enough stated probabilities.
const make = (i, outcome, probability) => {
  const row = pRow(i, {}, { ...good, probability });
  const p = parsePrediction({ ...row, created_at: `2026-11-0${(i % 9) + 1}T10:00:00Z` });
  return withState(p, outcome ? { outcome, evidenceUrl: null, note: null, recordedAt: "x" } : null, NOW);
};
assert.equal(trackRecord([make(1, "hit", 70), make(2, "miss", 70)]).hitRate, null);
assert.equal(MIN_RESOLVED_FOR_HIT_RATE, 5);
const five = [make(1, "hit", 80), make(2, "hit", 80), make(3, "hit", 80), make(4, "miss", 80), make(5, "withdrawn", null)];
const tr = trackRecord(five);
assert.equal(tr.hitRate, 60); assert.equal(tr.withdrawn, 1); assert.equal(tr.total, 5);
assert.equal(tr.calibration, null, "only 4 judged predictions carry a probability");
const six = [...five.slice(0, 4), make(6, "hit", 80), make(7, "miss", 80)];
assert.deepEqual(trackRecord(six).calibration, { count: 6, statedAverage: 80, actual: 67 });
assert.equal(trackRecord([make(1, "void", 70), make(2, null, 70)]).voids, 1);

// Assembly sorts newest first and ignores unrelated rows.
const list = assemblePredictions([pRow(1), pRow(2), pRow(3, { kind: "claim" })], [rRow(A, 9, predictionKey(A, 1), "hit")], NOW);
assert.deepEqual(list.map((p) => p.seq), [2, 1]);
assert.equal(list[1].state, "hit");

// Unavailable detection (Proof migration not applied).
assert.equal(isPredictionsUnavailable({ code: "42P01" }), true);
assert.equal(isPredictionsUnavailable({ code: "PGRST205" }), true);
assert.equal(isPredictionsUnavailable({ message: "relation \"public.proof_records\" does not exist" }), true);
assert.equal(isPredictionsUnavailable({ code: "23505" }), false);
assert.equal(isPredictionsUnavailable(null), false);

// Wiring.
const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const stream = read("src/features/fresh-flow/components/FreshFlowShortsStream.tsx");
assert.ok(stream.includes("ShortsPredictionSheet") && stream.includes("setPredictionShortId"));
const service = read("src/features/fresh-flow/core/predictionsService.ts");
assert.ok(service.includes('from("proof_records")') && service.includes("validatePrediction") && service.includes("validateResolution"));
const sheet = read("src/features/fresh-flow/components/ShortsPredictionSheet.tsx");
assert.ok(sheet.includes("not advice") && sheet.includes("no independent review"), "the sheet states its limits");

console.log("Prediction Ledger tests passed");

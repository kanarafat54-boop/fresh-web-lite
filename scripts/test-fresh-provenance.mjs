import assert from "node:assert/strict";
import { validateProvenance, buildProvenanceBody, assembleDeclarations, isProvenanceUnavailable, badgeFor, originLabel, ORIGINS } from "../src/features/fresh-flow/core/provenance.ts";

const A = "11111111-1111-4111-8111-111111111111";
const B = "22222222-2222-4222-8222-222222222222";
const S = "33333333-3333-4333-8333-333333333333";
const ok = { origin: "original", acknowledged: true };

assert.deepEqual(validateProvenance(ok), []);
assert.ok(validateProvenance({ ...ok, origin: "" }).some((p) => /Choose/.test(p)));
assert.ok(validateProvenance({ ...ok, acknowledged: false }).some((p) => /Confirm/.test(p)));
assert.ok(validateProvenance({ ...ok, origin: "remix" }).some((p) => /Credit/.test(p)), "remix needs credit");
assert.deepEqual(validateProvenance({ ...ok, origin: "remix", note: "Original by Sam" }), []);
assert.deepEqual(validateProvenance({ ...ok, origin: "third-party", sourceUrl: "https://example.com/x" }), []);
assert.ok(validateProvenance({ ...ok, origin: "ai-generated" }).some((p) => /AI tool/.test(p)));
assert.deepEqual(validateProvenance({ ...ok, origin: "ai-assisted", tools: "Image model" }), []);
assert.ok(validateProvenance({ ...ok, sourceUrl: "javascript:alert(1)" }).some((p) => /web address/.test(p)));
assert.ok(validateProvenance({ ...ok, note: "x".repeat(301) }).some((p) => /note/.test(p)));
assert.equal(ORIGINS.length, 5);

// canonical body is stable regardless of field order and trims
assert.equal(buildProvenanceBody({ ...ok, tools: " t ", note: "n" }), buildProvenanceBody({ note: "n", tools: "t", acknowledged: true, origin: "original" }));
assert.equal(JSON.parse(buildProvenanceBody(ok)).type, "provenance");

const row = (over) => ({ author_id: A, seq: 1, kind: "provenance", subject_type: "short", subject_id: S, created_at: "2026-11-12T10:00:00.000Z", record_hash: "abcdef0123456789", body_json: buildProvenanceBody({ origin: "original", acknowledged: true }), ...over });
const rows = [
  row({ seq: 1 }),
  row({ seq: 2, body_json: buildProvenanceBody({ origin: "remix", note: "credit Sam", acknowledged: true }) }),
  row({ seq: 3, author_id: B, body_json: buildProvenanceBody({ origin: "original", acknowledged: true }) }), // someone else's claim about this Short: ignored
  row({ seq: 4, subject_id: "other" }),
  row({ seq: 5, kind: "claim" }),
  row({ seq: 6, body_json: "not json" }),
  row({ seq: 7, body_json: JSON.stringify({ type: "provenance", origin: "magic" }) }),
  row({ seq: 8, created_at: "nope" }),
  row({ seq: 9, body_json: JSON.stringify({ type: "provenance", origin: "ai-assisted", tools: "Tool", source_url: "javascript:x" }) }),
];
const d = assembleDeclarations(rows, S, A);
assert.deepEqual(d.map((x) => x.seq), [9, 2, 1], "only the author's valid declarations, newest first");
assert.equal(d[0].sourceUrl, null, "unsafe links are dropped");
assert.equal(badgeFor(d), "AI-assisted · declared by creator");
assert.equal(badgeFor([]), null);
assert.equal(originLabel("remix"), "Remix or reuse");

assert.equal(isProvenanceUnavailable({ code: "42P01" }), true);
assert.equal(isProvenanceUnavailable({ code: "PGRST205" }), true);
assert.equal(isProvenanceUnavailable({ message: 'relation "proof_records" does not exist' }), true);
assert.equal(isProvenanceUnavailable({ code: "42501", message: "denied" }), false);
console.log("provenance: ok");

import assert from "node:assert/strict";
import { buildProvenance, buildContextGoal, interpretAskResponse } from "../src/features/fresh-flow/core/shortsContext.ts";

const short = { id: "s1", authorName: "Queen Vibes", authorUsername: "queenvibes", authorVerified: true, caption: "Uganda has 10 lakes! #facts", soundName: "Original Sound - QueenVibes", createdAt: "2026-11-03T10:00:00Z" };
const now = new Date("2026-11-05T10:00:00Z");

// provenance uses only what the platform knows
const rows = buildProvenance(short, now);
assert.deepEqual(rows.map((r) => r.label), ["Creator", "Published", "Sound"]);
assert.ok(rows[0].value.includes("verified account"));
assert.equal(rows[1].value, "2 days ago");
assert.equal(buildProvenance({ ...short, authorVerified: false, soundName: null, createdAt: null }, now).length, 2);
assert.ok(!buildProvenance({ ...short, authorVerified: false }, now)[0].value.includes("verified"));
assert.equal(buildProvenance({ ...short, createdAt: "2026-01-01T00:00:00Z" }, now)[1].value, "2026-01-01");

// prompt: bounded, says not to guess, includes the caption
const goal = buildContextGoal({ ...short, caption: "x".repeat(900) });
assert.ok(goal.includes("Do not guess"));
assert.ok(goal.length < 900, "caption is truncated");
assert.ok(buildContextGoal(short).includes("Uganda has 10 lakes"));

// honest outcomes
const ev = (n) => Array.from({ length: n }, (_, i) => ({ title: `https://site${i}.example/page`, snippet: `claim ${i}` }));
assert.equal(interpretAskResponse(false, null).state, "error");
assert.equal(interpretAskResponse(true, { error: "boom" }).state, "error");
assert.equal(interpretAskResponse(true, { answer: "No sources.", evidence: [] }).state, "unverified");
assert.equal(interpretAskResponse(true, { answer: "A", evidence: ev(1) }).state, "limited");
assert.equal(interpretAskResponse(true, { answer: "A", evidence: ev(2) }).state, "limited");
const supported = interpretAskResponse(true, { answer: "A", evidence: ev(3), verification: { uniqueDomains: 3, contradictionsDetected: false } });
assert.equal(supported.state, "supported");
assert.ok(supported.explanation.includes("not a human fact-check"));
assert.equal(interpretAskResponse(true, { answer: "A", evidence: ev(4), verification: { uniqueDomains: 1 } }).state, "limited", "many results from one site is not strong support");
assert.equal(interpretAskResponse(true, { answer: "A", evidence: ev(5), verification: { contradictionsDetected: true } }).state, "disputed", "contradictions always win");
assert.equal(interpretAskResponse(true, { answer: "A", evidence: ev(12) }).sources.length, 8, "sources are capped");

// only http(s) URLs become links
const odd = interpretAskResponse(true, { answer: "A", evidence: [{ title: "javascript:alert(1)", snippet: "x" }, { title: "https://www.example.org/a", snippet: "y" }, { title: "plain source name", snippet: "z" }] });
assert.equal(odd.sources[0].url, null);
assert.equal(odd.sources[1].url, "https://www.example.org/a");
assert.equal(odd.sources[1].host, "example.org");
assert.equal(odd.sources[2].url, null);
console.log("Fresh Shorts context tests passed.");

import assert from "node:assert/strict";
import { runFreshNeuroSymbolicAnalysis, assertFreshNeuroSymbolicRuntimeIntegrity } from "../src/core/fresh-ai/FreshNeuroSymbolicRuntime.ts";

assertFreshNeuroSymbolicRuntimeIntegrity();
const inferred = runFreshNeuroSymbolicAnalysis("Fact: rain is present. If rain is present, then roads are wet.");
assert.equal(inferred.status, "executed");
assert.ok(inferred.inferredFacts.some((fact) => fact.proposition === "roads are wet"), "modus ponens inference must execute");

const contradiction = runFreshNeuroSymbolicAnalysis("x > 10 and x < 5");
assert.ok(contradiction.contradictions.some((item) => item.kind === "numeric-constraint"), "incompatible numeric bounds must be detected");

const polarity = runFreshNeuroSymbolicAnalysis("Fact: the door is open. False that the door is open.");
assert.ok(polarity.contradictions.some((item) => item.kind === "proposition"), "opposite explicit propositions must be detected");

const causal = runFreshNeuroSymbolicAnalysis("smoke causes coughing.");
assert.equal(causal.causalHypotheses[0]?.epistemicStatus, "hypothesis-only", "causal phrasing must not be promoted to verified fact");

console.log("Fresh neuro-symbolic runtime: PASS");

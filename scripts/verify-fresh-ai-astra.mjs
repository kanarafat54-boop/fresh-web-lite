import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const contract = readFileSync("src/core/fresh-ai/astra/AstraContracts.ts", "utf8");
const registry = readFileSync("src/core/fresh-ai/FreshAICapabilityRegistry.ts", "utf8");
const product = readFileSync("docs/FRESH_AI_ASTRA_ARCHITECTURE.md", "utf8");
const ui = readFileSync("src/app/components/FreshAIUnified.tsx", "utf8");

for (const token of ["AstraObservation", "AstraWorldState", "AstraActionProposal", "evaluateAstraAction", "validateAstraObservation"]) {
  assert.ok(contract.includes(token), `Astra contract missing ${token}`);
}
assert.match(contract, /environment === "physical"[\s\S]*?Physical actuation is disabled/);
assert.match(contract, /proposal\.risk === "critical"[\s\S]*?Critical-risk actions are not executable/);
assert.match(contract, /executable: false/);
assert.match(registry, /"astra"/);
assert.match(ui, /"Astra".*"astra"/);
assert.match(product, /Physical actions remain blocked until/i);
assert.match(product, /images, camera frames, audio, video, spatial data/i);
console.log("Fresh AI Astra contract checks passed.");

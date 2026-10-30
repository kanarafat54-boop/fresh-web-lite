import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const contract = readFileSync("src/core/fresh-ai/astra/AstraContracts.ts", "utf8");
const runtime = readFileSync("src/core/fresh-ai/astra/AstraRuntime.ts", "utf8");
const simulation = readFileSync("src/core/fresh-ai/astra/AstraSimulation.ts", "utf8");
const registry = readFileSync("src/core/fresh-ai/FreshAICapabilityRegistry.ts", "utf8");
const product = readFileSync("docs/FRESH_AI_ASTRA_ARCHITECTURE.md", "utf8");
const ui = readFileSync("src/app/components/FreshAIUnified.tsx", "utf8");
const vision = readFileSync("src/core/fresh-ai/astra/AstraVisionEngine.ts", "utf8");
const visionRoute = readFileSync("api/ai/astra/vision.ts", "utf8");

for (const token of ["AstraObservation", "AstraWorldState", "AstraActionProposal", "evaluateAstraAction", "validateAstraObservation"]) {
  assert.ok(contract.includes(token), `Astra contract missing ${token}`);
}
assert.match(contract, /environment === "physical"[\s\S]*?Physical actuation is disabled/);
assert.match(contract, /proposal\.risk === "critical"[\s\S]*?Critical-risk actions are not executable/);
assert.match(contract, /executable: false/);
assert.match(runtime, /ingestAstraObservation/);
assert.match(runtime, /inference: "unavailable"/);
assert.match(runtime, /configuration-required/);
assert.match(vision, /fresh-vision-v1/);
assert.match(vision, /MAX_IMAGE_BYTES/);
assert.match(vision, /redirect: "error"/);
assert.match(vision, /FRESH_AI_VISION_ENGINE_TOKEN/);
assert.match(visionRoute, /authClient\.auth\.getUser\(bearer\)/);
assert.match(visionRoute, /\.eq\("user_id", user\.id\)/);
assert.match(visionRoute, /storage_path\.startsWith\(user\.id \+ "\/"\)/);
assert.match(visionRoute, /consentGranted !== true/);
assert.match(simulation, /runAstraGridSimulation/);
assert.match(simulation, /Collision boundary reached/);
assert.match(simulation, /never controls physical hardware/);
assert.match(registry, /"astra"/);
assert.match(ui, /"Astra".*"astra"/);
assert.match(product, /Physical actions remain blocked until/i);
assert.match(product, /images, camera frames, audio, video, spatial data/i);
console.log("Fresh AI Astra contract checks passed.");

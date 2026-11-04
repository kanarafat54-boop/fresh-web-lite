import fs from "node:fs";

const router = fs.readFileSync("src/core/fresh-ai/FreshAICognitiveDiversity.ts", "utf8");
const architecture = fs.readFileSync("src/core/fresh-ai/FreshAIArchitecture.ts", "utf8");
const kernel = fs.readFileSync("src/core/fresh-ai/FreshAIKernel.ts", "utf8");

const modes = [
  "analytical", "creative", "philosophical", "empathic", "pattern", "systems",
  "practical", "reflective", "concrete", "abstract", "lateral", "probabilistic",
  "critical", "integrative", "scientific", "social-cultural", "spatial-embodied",
  "temporal-historical", "ethical-rights", "alien-mind", "god-made-mind",
];
for (const mode of modes) {
  if (!router.includes(`"${mode}"`)) throw new Error(`Missing cognitive perspective: ${mode}`);
}
for (const required of [
  "selectFreshCognitivePerspectives",
  "assertFreshCognitiveDiversityIntegrity",
  "MAX_PERSPECTIVES = 6",
  "identity: \"fresh-unified-1\"",
  "hypothetical",
  "divine authority",
  "selectionReasons",
]) if (!router.includes(required)) throw new Error(`Missing cognitive diversity contract: ${required}`);

if (!architecture.includes('cognitivePerspectives?: FreshCognitiveSelection')) {
  throw new Error("Fresh reasoning result does not expose cognitive perspective selection.");
}
if (!kernel.includes("selectFreshCognitivePerspectives(request.input,request.intent)")) {
  throw new Error("Fresh AI kernel does not route requests through the cognitive perspective selector.");
}
if (!kernel.includes("cognitivePerspectives.selected.map((mode)=>mode.label)")) {
  throw new Error("Fresh AI kernel does not report selected cognitive perspectives.");
}
if (!router.includes("Explicit Alien Mind and God-Made Mind requests must be routable.")) {
  throw new Error("Alien Mind and God-Made Mind routing regression assertion is missing.");
}
console.log("Fresh AI cognitive diversity routing contract: PASS");

import fs from "node:fs";

const source = fs.readFileSync("src/core/fresh-ai/FreshAICognitiveMindFabric.ts", "utf8");
const modes = [
  "analytical", "creative", "philosophical", "emotional", "intuitive", "systems",
  "practical", "reflective", "concrete", "abstract", "linear", "lateral",
  "probabilistic", "critical", "open-minded", "integrative", "memory-retrieval",
  "perceptual-multimodal", "language-communication", "executive-planning",
  "alien-mind-exploration",
];
for (const mode of modes) {
  if (!source.includes(`"${mode}"`)) throw new Error(`Missing cognitive mode: ${mode}`);
}
for (const contract of [
  "resolveFreshAICognitiveMindPlan", "assertFreshAICognitiveMindFabricIntegrity",
  "godmade-stewardship", "research-only", "synthetic scenarios are not evidence",
  "authorization, approval, and verification boundaries",
]) {
  if (!source.includes(contract)) throw new Error(`Missing cognitive mind fabric contract: ${contract}`);
}
if (!source.includes('profileIds: ["godmade-stewardship"]')) {
  throw new Error("Godmade AI stewardship profile is not included in every plan");
}
console.log("Fresh AI Cognitive Mind Fabric structural contract: PASS");

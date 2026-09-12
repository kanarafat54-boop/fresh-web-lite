import fs from "node:fs";

const training = fs.readFileSync("src/core/fresh-ai/FreshUnifiedModelTraining.ts", "utf8");
const unified = fs.readFileSync("src/core/fresh-ai/FreshUnifiedModelCore.ts", "utf8");

const required = [
  [training, 'fresh-unified-training-v1'],
  [training, 'modelId: "fresh-unified-1"'],
  [training, 'providerIndependent: true'],
  [training, 'requiresExternalModelProvider: false'],
  [training, 'fresh-unified-checkpoint-v1'],
  [training, 'validateFreshTrainingConfig'],
  [training, 'validateFreshCheckpointManifest'],
  [unified, 'id: "fresh-unified-1"'],
  [unified, 'weightsStatus: "training-required"'],
];

for (const [source, needle] of required) {
  if (!source.includes(needle)) throw new Error(`Missing Fresh training contract requirement: ${needle}`);
}

console.log("Fresh Unified training/checkpoint contract: PASS");

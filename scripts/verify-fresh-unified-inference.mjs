import fs from "node:fs";

const inference = fs.readFileSync("src/core/fresh-ai/FreshUnifiedModelInference.ts", "utf8");
const neural = fs.readFileSync("src/core/fresh-ai/FreshNeuralGenerationRuntime.ts", "utf8");
const unified = fs.readFileSync("src/core/fresh-ai/FreshUnifiedModelCore.ts", "utf8");

const required = [
  [inference, 'modelId: "fresh-unified-1"'],
  [inference, "providerIndependent: true"],
  [inference, "externalProviderRequired: false"],
  [inference, "FRESH_UNIFIED_CHECKPOINT_ID"],
  [inference, "inferFreshUnified"],
  [inference, "status: \"training-required\""],
  [neural, "fresh-unified-1"],
  [unified, 'weightsStatus: "training-required"'],
];

for (const [source, marker] of required) {
  if (!source.includes(marker)) throw new Error(`Missing Fresh Unified inference marker: ${marker}`);
}

if (/from ["']@google\//.test(inference)) throw new Error("Fresh Unified inference boundary must not import an external AI provider");
if (/from ["']@google\//.test(inference)) throw new Error("Fresh Unified inference boundary must not import an external AI provider");

console.log("Fresh Unified inference boundary verified.");

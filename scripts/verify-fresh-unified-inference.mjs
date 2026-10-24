import fs from "node:fs";

const inference = fs.readFileSync("src/core/fresh-ai/FreshUnifiedModelInference.ts", "utf8");
const neural = fs.readFileSync("src/core/fresh-ai/FreshNeuralGenerationRuntime.ts", "utf8");
const unified = fs.readFileSync("src/core/fresh-ai/FreshUnifiedModelCore.ts", "utf8");
const gateway = fs.readFileSync("src/core/fresh-ai/FreshAIIntelligenceGateway.ts", "utf8");
const ask = fs.readFileSync("api/ai/ask.ts", "utf8");

const required = [
  [inference, 'modelId: "fresh-unified-1"'],
  [inference, "providerIndependent: true"],
  [inference, "externalProviderRequired: false"],
  [inference, "FRESH_UNIFIED_CHECKPOINT_ID"],
  [inference, "FRESH_UNIFIED_INFERENCE_URL"],
  [inference, "FRESH_UNIFIED_INFERENCE_TOKEN"],
  [inference, "inferFreshUnified"],
  [inference, "await fetch(url.toString()"],
  [inference, 'payload.modelId !== FRESH_UNIFIED_MODEL.id'],
  [inference, 'status: "training-required"'],
  [inference, "Fresh inference response identity/checkpoint validation failed."],
  [neural, "fresh-unified-1"],
  [unified, 'weightsStatus: "training-required"'],
  [gateway, "nativeAnswer?"],
  [gateway, "nativeAnswer&&!looksLikeInternalInterpretation(nativeAnswer)"],
  [ask, "nativeAnswer: async"],
  [ask, 'inferFreshUnified({ modality: "text"'],
  [ask, 'status: "training-required"'],
];

for (const [source, marker] of required) {
  if (!source.includes(marker)) throw new Error(`Missing Fresh Unified inference contract marker: ${marker}`);
}

if (/from ["']@google\//.test(inference)) {
  throw new Error("Fresh Unified inference boundary must not import an external AI provider");
}

// A retired generic answer callback could silently bypass the Fresh-owned model boundary.
// The gateway must use the verified kernel answer when native inference is unavailable.
if (/\banswer\?:\s*\(input:\s*string/.test(gateway)) {
  throw new Error("Retired generic answer dependency is still exposed by the Fresh gateway");
}
if (/this\.d\.answer\s*\(/.test(gateway) || /\bd\.answer\s*\(/.test(gateway)) {
  throw new Error("Fresh gateway must not call a generic answer-provider fallback");
}
if (!gateway.includes("nativeAnswer:") && !gateway.includes("nativeAnswer?")) {
  throw new Error("Fresh-native answer boundary is missing");
}
if (!ask.includes('status: "training-required"') || !ask.includes("nativeInferenceState.value.reason")) {
  throw new Error("Ask endpoint must report unavailable native inference honestly");
}
if (!ask.includes('provenance: "Fresh AI Intelligence Gateway → Fresh Unified inference (when configured) → Kernel → Truth/Reasoning → Verification"')) {
  throw new Error("Ask endpoint provenance must describe the actual Fresh-owned path");
}

console.log("Fresh Unified inference boundary verified: native-only answer callback, explicit unavailable status, no generic answer fallback.");

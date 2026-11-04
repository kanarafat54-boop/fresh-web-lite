import fs from "node:fs";

const inference = fs.readFileSync("src/core/fresh-ai/FreshUnifiedModelInference.ts", "utf8");
const neural = fs.readFileSync("src/core/fresh-ai/FreshNeuralGenerationRuntime.ts", "utf8");
const unified = fs.readFileSync("src/core/fresh-ai/FreshUnifiedModelCore.ts", "utf8");

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
  [inference, "status: \"training-required\""],
  [neural, "fresh-unified-1"],
  [unified, 'weightsStatus: "training-required"'],
];

for (const [source, marker] of required) {
  if (!source.includes(marker)) throw new Error(`Missing Fresh Unified inference marker: ${marker}`);
}

if (/from ["']@google\//.test(inference)) throw new Error("Fresh Unified inference boundary must not import an external AI provider");
if (/from ["']@google\//.test(inference)) throw new Error("Fresh Unified inference boundary must not import an external AI provider");

if (!inference.includes("Fresh inference response identity/checkpoint validation failed.")) throw new Error("Native inference response identity is not validated");
const gateway = fs.readFileSync("src/core/fresh-ai/FreshAIIntelligenceGateway.ts", "utf8");
const ask = fs.readFileSync("api/ai/ask.ts", "utf8");
if (!gateway.includes("nativeAnswer?") || !gateway.includes("nativeAnswer&&!looksLikeInternalInterpretation(nativeAnswer)")) throw new Error("Fresh-native answer is not preferred by the gateway");
if (!ask.includes("nativeAnswer: async") || !ask.includes("inferFreshUnified({ modality: \"text\"")) throw new Error("Fresh AI ask endpoint is not wired to Fresh-native inference");
if (!ask.includes('status: "training-required"')) throw new Error("Ask endpoint does not expose unavailable native inference status");

console.log("Fresh Unified inference boundary verified.");

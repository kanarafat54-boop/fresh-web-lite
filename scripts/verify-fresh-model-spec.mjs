import { readFileSync } from "node:fs";

const spec = JSON.parse(readFileSync("training/model_spec.json", "utf8"));
const required = {
  schema: "fresh-unified-model-spec-v1",
  modelId: "fresh-unified-1",
  tokenizerId: "fresh-unified-tokenizer-v1",
  architecture: "decoder-only-causal-transformer"
};
for (const [key, value] of Object.entries(required)) {
  if (spec[key] !== value) throw new Error(`Invalid Fresh model spec: ${key}`);
}
if (!spec.providerIndependent || spec.externalModelRequired) {
  throw new Error("Fresh Unified model spec must remain provider-independent");
}
for (const key of ["vocabSize", "contextLength", "hiddenSize", "layers", "attentionHeads", "feedForwardSize"]) {
  if (!Number.isInteger(spec[key]) || spec[key] <= 0) throw new Error(`Invalid model dimension: ${key}`);
}
console.log("Fresh Unified model spec: PASS");

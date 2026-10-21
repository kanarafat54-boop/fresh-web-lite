import fs from "node:fs";

const plan = fs.readFileSync("docs/FRESH_AI_NATIVE_IMAGE_MODEL_PLAN.md", "utf8");
const deployment = fs.readFileSync("docs/FRESH_AI_ENGINE_OWNERSHIP_AND_DEPLOYMENT.md", "utf8");
const modelSpec = JSON.parse(fs.readFileSync("training/model_spec.json", "utf8"));
const imageSpec = JSON.parse(fs.readFileSync("training/fresh_image_model_spec.json", "utf8"));
const datasetSchema = JSON.parse(fs.readFileSync("training/datasets/fresh-image-dataset-manifest.schema.json", "utf8"));
const modelCore = fs.readFileSync("src/core/fresh-ai/FreshUnifiedModelCore.ts", "utf8");
const services = fs.readFileSync("src/core/fresh-ai/FreshAIServerServices.ts", "utf8");
const status = fs.readFileSync("src/server/freshAIStatus.ts", "utf8");
const imageResearch = fs.readFileSync("training/fresh_image_research.py", "utf8");

for (const token of [
  "Fresh-owned native image generation plan",
  "Do not incur hosting or compute charges",
  "The existing `fresh-unified-1` language-model checkpoint is not an image model",
  "genuine text-to-image output",
  "End-to-end signed-in generation, persistence, retrieval, and UI rendering",
  "leave generation unavailable",
]) {
  if (!plan.includes(token)) throw new Error(`Native image plan is missing required gate: ${token}`);
}
if (imageSpec.status !== "specification-only-not-implemented" ||
    imageSpec.training_policy.pretrained_weights_allowed !== false ||
    imageSpec.training_policy.third_party_inference_allowed !== false ||
    imageSpec.training_policy.paid_compute_allowed !== false ||
    imageSpec.proposed_baseline.image_width !== 16 ||
    imageSpec.promotion.production_eligible !== false) {
  throw new Error("Native image spec must remain experimental, from-scratch, and non-production");
}
if (datasetSchema.type !== "object" ||
    !datasetSchema.required.includes("license_review") ||
    !datasetSchema.required.includes("records") ||
    !datasetSchema.properties.records.items.required.includes("asset_sha256") ||
    !datasetSchema.properties.records.items.required.includes("rights_basis")) {
  throw new Error("Authorized image dataset manifest must require review, asset hashes, and rights provenance");
}
for (const token of [
  "class FreshImageResearchModel",
  "random.seed(args.seed)",
  "review_status",
  "permission_evidence_uri",
]) {
  if (!imageResearch.includes(token)) throw new Error(`Native research prototype is missing required safeguard: ${token}`);
}
if (!imageResearch.includes('"pretrainedWeightsUsed": False') ||
    !imageResearch.includes('"thirdPartyInferenceUsed": False') ||
    !imageResearch.includes('"paidComputeUsed": False') ||
    !imageResearch.includes("result.verify()") ||
    !imageResearch.includes("production_ready=false")) {
  throw new Error("Native research prototype must remain from-scratch, PNG-validated, and non-production");
}
if (modelSpec.architecture !== "decoder-only-causal-transformer" ||
    modelSpec.objective !== "causal-language-modeling") {
  throw new Error("Expected the current Fresh Unified model spec to remain explicitly a language-model spec");
}
if (!modelCore.includes('weightsStatus: "training-required"')) {
  throw new Error("Fresh Unified must not be marked production-ready without promoted image-capable weights");
}
if (!services.includes('nativeInferenceBackend: "not-installed"') ||
    !services.includes("No image was generated.")) {
  throw new Error("Image generation must remain unavailable until a native backend is installed");
}
if (!status.includes("getFreshAIEngineReadiness()")) {
  throw new Error("Fresh AI status must expose safe engine readiness");
}
if (deployment.includes("Deploy a compatible image-inference worker as a Fresh-managed service with a real, license-checked open-weight image model")) {
  throw new Error("Deployment guide still recommends substituting an open-weight image model");
}
console.log("Fresh native image model strategy/readiness gates: PASS");

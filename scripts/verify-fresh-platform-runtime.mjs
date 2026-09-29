import fs from "node:fs";

const required = [
  "src/core/platform/freshPlatformRuntime.ts",
  "src/features/fresh-flow/core/freshFlowRuntimeFabric.ts",
  "src/features/fresh-flow/core/freshFlowPagination.ts",
  "src/features/fresh-flow/core/freshFlowInteractionBus.ts",
  "src/features/fresh-flow/core/freshFlowTelemetry.ts",
  "src/features/fresh-flow/core/freshFlowMediaPipeline.ts",
];

for (const file of required) {
  if (!fs.existsSync(file)) throw new Error("Missing runtime contract: " + file);
}
const source = fs.readFileSync("src/core/platform/freshPlatformRuntime.ts", "utf8");
for (const token of ["recordFreshFlowEvents", "createMediaAsset", "enqueueMediaJob", "subscribeToCreator", "createOpportunity", "createCourse", "createAgent"]) {
  if (!source.includes(token)) throw new Error("Missing platform capability: " + token);
}
console.log("Fresh platform runtime contract: OK");

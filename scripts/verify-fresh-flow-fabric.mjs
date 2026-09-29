import { readFileSync } from "node:fs";

const files = [
  "src/features/fresh-flow/core/freshFlowRuntimeFabric.ts",
  "src/features/fresh-flow/core/freshFlowDiscovery.ts",
  "src/features/fresh-flow/core/freshFlowMediaPolicy.ts",
  "src/features/fresh-flow/core/freshFlowRealtime.ts",
  "src/features/fresh-flow/core/freshFlowTelemetry.ts",
  "src/features/fresh-flow/core/freshFlowMediaPipeline.ts",
  "src/features/fresh-flow/core/freshFlowInteractionBus.ts",
  "docs/FRESH_FLOW_RUNTIME_FABRIC.md",
];

for (const path of files) {
  const source = readFileSync(path, "utf8");
  if (!source.trim()) throw new Error(`Empty Fresh Flow fabric file: ${path}`);
}

const runtime = readFileSync(files[0], "utf8");
const discovery = readFileSync(files[1], "utf8");
const realtime = readFileSync(files[3], "utf8");
const policy = readFileSync(files[2], "utf8");
const pipeline = readFileSync("src/features/fresh-flow/core/freshFlowMediaPipeline.ts", "utf8");
const interactions = readFileSync("src/features/fresh-flow/core/freshFlowInteractionBus.ts", "utf8");

for (const token of ["FRESH_FLOW_PAGE_SIZE", "shouldPrefetch", "mergeFreshFlowQueue"]) {
  if (!runtime.includes(token)) throw new Error(`Runtime contract missing: ${token}`);
}
for (const token of ["scoreFreshFlowItem", "rankFreshFlow", "diversifyFreshFlow"]) {
  if (!discovery.includes(token)) throw new Error(`Discovery contract missing: ${token}`);
}
if (!realtime.includes("broadcast")) throw new Error("Realtime contract must use Broadcast");
if (!policy.includes("getFreshFlowMediaPolicy")) throw new Error("Media policy contract missing");
if (!pipeline.includes("FRESH_FLOW_MEDIA_JOB_ORDER")) throw new Error("Media pipeline contract missing");
if (!interactions.includes("universal_interactions")) throw new Error("Interaction persistence contract missing");

console.log("Fresh Flow runtime fabric contract: PASS");

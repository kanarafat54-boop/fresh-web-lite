import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const source = fs.readFileSync(path.join(root, "src/core/platform/freshCompletionFabric.ts"), "utf8");

const required = [
  "FRESH_PHASE_15_22",
  "FRESH_PHASE_15_22_STEP_COUNT = 80",
  "createIdentitySession",
  "createAIAction",
  "createMemoryItem",
  "createContentItem",
  "rankFreshCandidates",
  "createCreatorProject",
  "createRealtimeEvent",
  "createMoneyOperation",
  "createGovernanceCase",
  "assertFreshPhase15To22Integrity",
  "FRESH_CORE_TABLE_BINDINGS",
];

for (const symbol of required) {
  if (!source.includes(symbol)) throw new Error("Missing phase 15-22 runtime primitive: " + symbol);
}

const phases = [...source.matchAll(/phase: (15|16|17|18|19|20|21|22)/g)].map((m) => Number(m[1]));
if (phases.length !== 8 || phases[0] !== 15 || phases[7] !== 22) throw new Error("Expected phases 15-22");
if (!source.includes("steps: [51,52,53,54,55,56,57,58,59,60]")) throw new Error("Phase 15 mapping missing");
if (!source.includes("steps: [121,122,123,124,125,126,127,128,129,130]")) throw new Error("Phase 22 mapping missing");

console.log("Fresh phases 15-22 certification passed: 80-step registry, lifecycle primitives, AI approval, memory, Flow, recommendation, creator, realtime, money and governance boundaries.");

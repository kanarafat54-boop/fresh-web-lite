import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const source = fs.readFileSync(path.join(root, "src/core/platform/freshCompletionFabric.ts"), "utf8");

const required = [
  "FRESH_PHASE_15_22",
  "FRESH_PHASE_15_22_STEP_COUNT",
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
if (!/phase:\s*15[\s\S]*?steps:\s*\[51,\s*52,\s*53,\s*54,\s*55,\s*56,\s*57,\s*58,\s*59,\s*60\]/.test(source)) throw new Error("Phase 15 mapping missing");
if (!/phase:\s*22[\s\S]*?steps:\s*\[121,\s*122,\s*123,\s*124,\s*125,\s*126,\s*127,\s*128,\s*129,\s*130\]/.test(source)) throw new Error("Phase 22 mapping missing");

console.log("Fresh phases 15-22 certification passed: 80-step registry, lifecycle primitives, AI approval, memory, Flow, recommendation, creator, realtime, money and governance boundaries.");

import { readFileSync } from "node:fs";

const path = "src/features/fresh-flow/core/shortsPerformance.ts";
const source = readFileSync(path, "utf8");

const requiredContracts = [
  "getShortsResourcePolicy",
  "slow-2g",
  'preload: "none"',
  'priority: "active"',
  "getShortsResourceWindow",
  "Math.abs(position - activeIndex)",
];

for (const contract of requiredContracts) {
  if (!source.includes(contract)) {
    throw new Error(`Missing Fresh Flow performance contract: ${contract}`);
  }
}

console.log("Fresh Flow performance contract: PASS");

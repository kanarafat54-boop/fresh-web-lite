import fs from "node:fs";
import assert from "node:assert/strict";

const doc = fs.readFileSync("docs/FRESH_PLATFORM_CONSTITUTION.md", "utf8");
const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
const workflow = fs.readFileSync(".github/workflows/fresh-platform-build.yml", "utf8");

const required = [
  ["Platform is explicitly not only a web interface", /not only its web interface/i],
  ["North star is preserved", /One identity\. One intelligent foundation\. Many ecosystems\. Open connections\. Human control\./],
  ["Reference architecture includes control plane", /Platform control plane/i],
  ["Identity and trust are foundational", /Identity and trust/i],
  ["Fresh AI truthfulness is required", /Honest capability states/i],
  ["Human authorization precedes execution", /propose → authorize → execute/i],
  ["Device capabilities must be supported and permissioned", /supported by its operating system, hardware, permissions, and runtime/i],
  ["Action failures require root-cause evidence", /root cause, corrective change, and rerun result/i],
  ["Delivery maturity states are distinct", /Production-verified/i],
  ["Foundation-first phases are defined", /Phase 0 — Establish the source of truth/i],
  ["Paid infrastructure requires approval", /without explicit approval/i],
];
for (const [label, pattern] of required) {
  assert.match(doc, pattern, label);
}
assert.equal(packageJson.scripts["test:fresh-platform-constitution"], "node scripts/verify-fresh-platform-constitution.mjs");
assert.match(workflow, /test:fresh-platform-constitution/, "constitution contract must run in CI");
console.log("Fresh platform constitution contract passed:", required.length + 2, "checks");

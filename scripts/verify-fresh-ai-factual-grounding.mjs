import fs from "node:fs";
const goal = fs.readFileSync("src/core/fresh-ai/FreshGoalUnderstanding.ts", "utf8");
const ask = fs.readFileSync("api/ai/ask.ts", "utf8");
const kernel = fs.readFileSync("src/core/fresh-ai/FreshAIKernel.ts", "utf8");
const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));

const checks = [
  [goal.includes("who|what|where|when|why|how") && goal.includes("const needsEvidence"), "Factual questions must request evidence"],
  [ask.includes("s.score > 0 &&") && ask.includes(">= 2"), "Platform knowledge must reject weak single-token matches"],
  [kernel.includes("!safeEvidence.length&&interpretation.needsEvidence"), "Factual questions with no evidence must fail honestly"],
  [kernel.includes("I won’t guess or substitute unrelated platform documentation"), "No-evidence response must explicitly reject unrelated documentation"],
  [pkg.scripts["test:fresh-ai-factual-grounding"] === "node scripts/verify-fresh-ai-factual-grounding.mjs", "Regression test must be registered"],
];
for (const [ok, message] of checks) if (!ok) throw new Error(message);
console.log("Fresh AI factual-answer grounding regression contract: PASS");

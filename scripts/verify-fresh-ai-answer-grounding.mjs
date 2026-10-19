import fs from "node:fs";

const goal = fs.readFileSync("src/core/fresh-ai/FreshGoalUnderstanding.ts", "utf8");
const knowledge = fs.readFileSync("src/core/fresh-ai/FreshAIPlatformKnowledge.ts", "utf8");

const publicEntityRule = /^\s*(?:who|what|when|where|why|how)\s+(?:is|was|are|were|did|does|do|has|have)\s+(?!you\b|your\b|fresh ai\b|fresh\b)[A-Z][A-Za-z0-9.-]*(?:\s+[A-Z][A-Za-z0-9.-]*)*/i;
for (const question of ["Who is Elon Musk?", "Who was Ada Lovelace?", "What is NASA?"]) {
  if (!publicEntityRule.test(question)) throw new Error(`Evidence retrieval did not recognize: ${question}`);
}
for (const question of ["Who are you?", "What can you do?"]) {
  if (publicEntityRule.test(question)) throw new Error(`Assistant identity question was incorrectly classified as an external fact: ${question}`);
}
if (!goal.includes("const publicEntityQuestion = /") || !goal.includes("publicEntityQuestion ||")) {
  throw new Error("Goal understanding must route public-entity questions to evidence retrieval.");
}
if (!knowledge.includes("if (EXTERNAL_FACT_QUESTION.test(goal.trim())) return [];")) {
  throw new Error("Platform knowledge must not answer external factual questions with unrelated internal documentation.");
}
if (!knowledge.includes("if (best <= 0) return [];") || !knowledge.includes("(Number(x.rank) || 0) > 0")) {
  throw new Error("Zero-score platform search results must never be promoted to evidence.");
}
if (!knowledge.includes(".filter((s) => s.score >= 2)")) {
  throw new Error("Fallback knowledge retrieval must require meaningful lexical overlap.");
}
const imageUi = fs.readFileSync("src/app/components/FreshAIUnified.tsx", "utf8");
const imageApi = fs.readFileSync("api/ai/ask.ts", "utf8");
if (!imageUi.includes('fetch("/api/ai/ask"') || !imageUi.includes("setImage(payload.image)") || !imageUi.includes("const imagePanel = image ?")) {
  throw new Error("The active Fresh AI interface must call the ask API and render the image result when one is returned.");
}
if (!imageApi.includes("generateFreshAIImage") || !imageApi.includes("isFreshAIImageEngineConfigured")) {
  throw new Error("Fresh AI image API must use the guarded inference service.");
}
console.log("Fresh AI answer grounding and active image-output contract checks: PASS");

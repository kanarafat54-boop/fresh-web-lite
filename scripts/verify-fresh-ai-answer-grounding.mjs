import fs from "node:fs";

const goal = fs.readFileSync("src/core/fresh-ai/FreshGoalUnderstanding.ts", "utf8");
const knowledge = fs.readFileSync("src/core/fresh-ai/FreshAIPlatformKnowledge.ts", "utf8");

const publicEntityRule = goal.match(/const publicEntityQuestion = ([^;]+);/)?.[1] ?? "";
if (!publicEntityRule.includes("who") || !publicEntityRule.includes("A-Z")) {
  throw new Error("Public-entity questions must trigger evidence retrieval.");
}
const publicEntityQuestion = new RegExp(publicEntityRule.slice(1, publicEntityRule.lastIndexOf("/")), publicEntityRule.slice(publicEntityRule.lastIndexOf("/") + 1));
for (const question of ["Who is Elon Musk?", "Who was Ada Lovelace?", "What is NASA?"]) {
  if (!publicEntityQuestion.test(question)) throw new Error(`Evidence retrieval did not recognize: ${question}`);
}
for (const question of ["Who are you?", "What can you do?"]) {
  if (publicEntityQuestion.test(question)) throw new Error(`Assistant identity question was incorrectly classified as an external fact: ${question}`);
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
console.log("Fresh AI answer grounding regression checks: PASS");

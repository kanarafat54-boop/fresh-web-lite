import fs from "node:fs";

const goal = fs.readFileSync("src/core/fresh-ai/FreshGoalUnderstanding.ts", "utf8");
const knowledge = fs.readFileSync("src/core/fresh-ai/FreshAIPlatformKnowledge.ts", "utf8");
const kernel = fs.readFileSync("src/core/fresh-ai/FreshAIKernel.ts", "utf8");
const architecture = fs.readFileSync("src/core/fresh-ai/FreshAIArchitecture.ts", "utf8");
const gateway = fs.readFileSync("src/core/fresh-ai/FreshAIIntelligenceGateway.ts", "utf8");
const researchResults = fs.readFileSync("src/features/home/components/FreshResearchResults.tsx", "utf8");

const publicEntityRule = /^\s*(?:who|what|when|where|why|how)\s+(?:is|was|are|were|did|does|do|has|have)\s+(?!you\b|your\b|fresh ai\b|fresh\b)[A-Z][A-Za-z0-9.-]*(?:\s+[A-Z][A-Za-z0-9.-]*)*/i;
for (const question of ["Who is Elon Musk?", "Who was Ada Lovelace?", "What is NASA?"]) {
  if (!publicEntityRule.test(question)) throw new Error(`Evidence retrieval did not recognize: ${question}`);
}
for (const question of ["Who are you?", "What can you do?"]) {
  if (publicEntityRule.test(question)) throw new Error(`Assistant identity question was incorrectly classified as an external fact: ${question}`);
}
if (!kernel.includes("interpretation.needsEvidence)return") || !kernel.includes("won’t guess or substitute unrelated platform documentation")) {
  throw new Error("Factual questions without evidence must fail transparently instead of guessing.");
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
const activeAskApi = fs.readFileSync("api/ai/ask.ts", "utf8");
if (!activeAskApi.includes("const FRESH_EXTERNAL_FACT_QUESTION = /") ||
    !activeAskApi.includes("if (FRESH_EXTERNAL_FACT_QUESTION.test(goal.trim())) return [];")) {
  throw new Error("The active /api/ai/ask retrieval path must reject internal platform knowledge for public factual questions.");
}
if (!activeAskApi.includes("i.needsEvidence || i.intent === \"research\" ? research(x)")) {
  throw new Error("Evidence-seeking questions must invoke the real research route from the active Fresh AI API.");
}
if (!activeAskApi.includes('u.protocol === "https:" || u.protocol === "http:"') ||
    !activeAskApi.includes("const groundedClaims = claims.flatMap")) {
  throw new Error("Research claims must be tied to a valid HTTP(S) source URL before entering Fresh AI evidence.");
}
if (!activeAskApi.includes("const sourceEvidence = evidence.filter") ||
    !activeAskApi.includes("r.interpretation.needsEvidence) && sourceEvidence.length === 0") ||
    !activeAskApi.includes("I couldn't verify this answer from usable external sources right now.") ||
    !activeAskApi.includes("url: item.source")) {
  throw new Error("Evidence-seeking answers must fail closed without valid external URLs and preserve source links for the UI.");
}
if (!activeAskApi.includes("const canonicalUrls = new Set") ||
    !activeAskApi.includes("const domains = new Set") ||
    !activeAskApi.includes("const sourceDiversity = domains.size >= 6")) {
  throw new Error("Research verification must count canonical URLs and distinct domains, not raw evidence rows.");
}
if (!activeAskApi.includes("const declaredUrls = Array.isArray(claim.sourceUrls)") ||
    !activeAskApi.includes("when those declared URLs are invalid or absent from the returned source list.") ||
    !activeAskApi.includes("if (!source) return [];")) {
  throw new Error("Research claims must not be silently attributed to a different source when declared provenance is invalid.");
}
if (!architecture.includes("sourceTitle?: string") ||
    !architecture.includes("sourceSnippet?: string") ||
    !gateway.includes("sourceTitle:source.title") ||
    !gateway.includes("sourceSnippet:source.snippet") ||
    !researchResults.includes("What confirms this?") ||
    !researchResults.includes("source.title") ||
    !researchResults.includes("source.snippet")) {
  throw new Error("Research must preserve publisher context and show the actual confirming information in plain language.");
}
if (!kernel.includes("Only one independent source domain was available; treat this as preliminary and not independently corroborated.") ||
    !kernel.includes("Preliminary research summary:") ||
    kernel.includes("reasoning layers")) {
  throw new Error("Research summaries must communicate source independence and must not imply that reasoning-layer count establishes factual confidence.");
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

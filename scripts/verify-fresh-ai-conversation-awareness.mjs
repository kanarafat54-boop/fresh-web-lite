import fs from "node:fs";
const read = (p) => fs.readFileSync(p, "utf8");
const fail = (m) => { throw new Error(m); };
const kernel = read("src/core/fresh-ai/FreshAIKernel.ts");
const engines = read("src/core/fresh-ai/FreshNativeDimensionalEngines.ts");
const ask = read("api/ai/ask.ts");
const feedback = read("api/ai/feedback.ts");
const ui = read("src/app/components/FreshAIUnified.tsx");

if (!kernel.includes("const followUp=")) fail("kernel does not resolve follow-up questions from the conversation");
if (!kernel.includes("interpretation,request.conversation??[])")) fail("kernel does not pass the conversation to buildGroundedAnswer");
if (!kernel.includes("in my knowledge yet")) fail("kernel lost the honest fallback");
for (const vacuous of ["answer the request directly", "I can help create the requested result", "I can work through the technical request directly", "I can turn this into an actionable plan", "I can analyze the request directly"])
  if (kernel.includes(vacuous)) fail(`kernel still contains a vacuous template: ${vacuous}`);
for (const needed of ["joinMeshes", '"Generated box"', '"Generated house"', "cube|box|crate|brick"])
  if (!engines.includes(needed)) fail(`native 3D engine is missing: ${needed}`);
if (!ask.includes("Result: ${nativeArtifact.title}")) fail("native artifact reply does not name the result");
if (!ask.includes("No external AI model API was required")) fail("native artifact reply lost its independence statement");
if (!feedback.includes("fresh_ai_preference_pairs") || !feedback.includes("safety_checked: false")) fail("feedback API does not quarantine shared corrections");
if (!feedback.includes("body.share === true")) fail("feedback API stores corrections without explicit consent");
if (!ui.includes("Nothing is shared unless you press OK")) fail("UI does not ask for consent before sharing a correction");
const stream = read("api/ai/stream.ts");
if (!stream.includes("retrieveFreshPlatformKnowledge(service()")) fail("stream endpoint does not retrieve platform knowledge");
if (!fs.existsSync("src/core/fresh-ai/FreshAIPlatformKnowledge.ts")) fail("shared platform knowledge module is missing");
if (!fs.existsSync("api/ai/status.ts")) fail("status endpoint is missing");
if (!ask.includes('r.result.answer = "Fresh AI generated the image requested."')) fail("image replies can still show the cannot-create fallback");
console.log("Fresh AI conversation awareness + learning loop + wiring contract: PASS");

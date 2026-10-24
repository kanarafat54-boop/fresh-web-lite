import fs from "node:fs";
const goal=fs.readFileSync("src/core/fresh-ai/FreshGoalUnderstanding.ts","utf8");
const kernel=fs.readFileSync("src/core/fresh-ai/FreshAIKernel.ts","utf8");
for(const token of ["directSelfQuestion","creativeArtifactRequest","abstractReflectiveQuestion"]) if(!goal.includes(token)) throw new Error("Goal interpreter missing "+token);
for(const token of ["createFreshSong","createFreshPoem","who are you","The honest test is whether I can explain your idea"]) if(!kernel.includes(token)) throw new Error("Kernel direct response missing "+token);
if(!kernel.includes("native trained model is not yet ready")) throw new Error("Identity response must disclose training status");
console.log("Fresh AI direct-answer and creative-artifact contract: PASS");

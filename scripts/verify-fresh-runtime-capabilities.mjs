import { readFileSync } from "node:fs";

const required = [
  ["src/core/platform/browserMediaExport.ts", ["MediaRecorder", "captureStream", "startSeconds", "endSeconds", "grade", "overlayText"]],
  ["src/core/platform/mediaRenderGraph.ts", ["trim", "split", "crop", "grade", "text", "audio", "dub"]],
  ["src/features/workspaces/StudioWorkspace.tsx", ["exportVideoFrameStream", "Render current graph", "Apply trim", "Run local WASM"]],
];
const failures = [];
for (const [file, tokens] of required) {
  const source = readFileSync(file, "utf8");
  for (const token of tokens) if (!source.includes(token)) failures.push(file + " missing " + token);
}
const studio = readFileSync("src/features/workspaces/StudioWorkspace.tsx", "utf8");
if (studio.includes("simulateRenderProgress")) failures.push("Studio still contains simulated render progress");
if (!studio.includes('pipelineStatus: "ready"')) failures.push("Studio does not persist successful browser render state");
if (failures.length) { console.error("Fresh runtime capability verification FAILED"); failures.forEach((x) => console.error(" - " + x)); process.exit(1); }
console.log("Fresh runtime capability verification PASSED");

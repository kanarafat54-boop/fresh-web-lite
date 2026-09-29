import { readFileSync } from "node:fs";
const runtime = readFileSync("src/core/platform/mediaRuntime.ts", "utf8");
const storage = readFileSync("src/core/platform/mediaStorage.ts", "utf8");
for (const token of ["probeMedia","createThumbnail","submitMediaToWorker","waitForMediaWorker","buildMediaRuntimeState"]) {
  if (!runtime.includes(token)) throw new Error("Missing media runtime: " + token);
}
for (const token of ["indexedDB","saveMediaAsset","loadMediaAsset","deleteMediaAsset"]) {
  if (!storage.includes(token)) throw new Error("Missing media storage: " + token);
}
console.log("Fresh media runtime: PASS");

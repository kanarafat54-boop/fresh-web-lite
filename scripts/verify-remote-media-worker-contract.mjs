import { readFileSync } from "node:fs";

const source = readFileSync("src/core/platform/remoteMediaWorker.ts", "utf8");
for (const token of ["VITE_FRESH_MEDIA_WORKER_URL", "submitRemoteMediaJob", "getRemoteMediaJob", "/jobs"]) {
  if (!source.includes(token)) throw new Error("Missing remote worker client contract: " + token);
}
console.log("Remote media worker client contract: PASS");

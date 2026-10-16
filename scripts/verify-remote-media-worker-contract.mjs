import { readFileSync } from "node:fs";

const source = readFileSync("src/core/platform/remoteMediaWorker.ts", "utf8");
const routes = JSON.parse(readFileSync("vercel.json", "utf8")).routes;
for (const token of ["submitRemoteMediaJob", "getRemoteMediaJob", "/api/media-worker"]) {
  if (!source.includes(token)) throw new Error("Missing remote worker client contract: " + token);
}
if (source.includes("VITE_FRESH_MEDIA_WORKER_URL")) {
  throw new Error("The worker URL must not be configured in a browser-exposed Vite variable.");
}
if (!routes.some((route) => route.src === "/api/media-worker/(.*)" && route.dest === "/api/ai/ask?__fresh_media_worker_path=$1")) {
  throw new Error("Media worker requests must reuse the existing authenticated API function through a specific rewrite.");
}
console.log("Remote media worker client contract: PASS");

import { readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");
const worker = read("workers/blender-render-worker/server.mjs");
const spec = read("workers/blender-render-worker/scene-spec.mjs");
const docker = read("workers/blender-render-worker/Dockerfile");
const client = read("src/core/platform/blenderRenderWorker.ts");
const api = read("api/ai/ask.ts");
const routes = JSON.parse(read("vercel.json")).routes;

for (const token of ["FRESH_BLENDER_WORKER_API_TOKEN", "timingSafeEqual", "validateSceneSpec", "x-fresh-user-id", "job.ownerId", "MAX_ACTIVE_JOBS", "MAX_RETAINED_JOBS", "BLENDER_BIN", "89504e470d0a1a0a", "MAX_OUTPUT_BYTES"]) {
  if (!worker.includes(token)) throw new Error("Missing Blender worker security/runtime contract: " + token);
}
for (const token of ["cube", "sphere", "cone", "torus", "plane", "between 1 and 16 objects", "rotation is outside the supported range"]) {
  if (!spec.includes(token)) throw new Error("Missing bounded scene specification: " + token);
}
if (!docker.includes("apt-get install") || !docker.includes("blender")) throw new Error("Blender must be installed in the worker container.");
if (!client.includes("/api/blender-worker") || !client.includes("supabase.auth.getSession")) throw new Error("Browser client must use the authenticated same-origin proxy.");
for (const token of ["handleBlenderWorkerProxy", "FRESH_BLENDER_WORKER_URL", "FRESH_BLENDER_WORKER_API_TOKEN", "authClient.auth.getUser", "headers.set(\"x-fresh-user-id\"", "redirect: \"manual\"", "protocol !== \"https:\""]) {
  if (!api.includes(token)) throw new Error("Missing authenticated Blender proxy contract: " + token);
}
if (!routes.some((route) => route.src === "/api/blender-worker/(.*)" && route.dest === "/api/ai/ask?__fresh_blender_worker_path=$1")) {
  throw new Error("Blender worker route must use the authenticated server proxy.");
}
if (client.includes("VITE_FRESH_BLENDER_WORKER")) throw new Error("Blender worker secrets or URL must not be exposed through Vite.");
console.log("Fresh Blender render worker contract: PASS");

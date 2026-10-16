import { readFileSync } from "node:fs";
import "./test-fresh-media-worker-url-security.mjs";

const server = readFileSync("workers/media-worker/server.mjs", "utf8");
const docker = readFileSync("workers/media-worker/Dockerfile", "utf8");
const security = readFileSync("workers/media-worker/media-url-security.mjs", "utf8");
const proxy = readFileSync("api/media-worker/[...path].ts", "utf8");
const client = readFileSync("src/core/platform/remoteMediaWorker.ts", "utf8");
const required = [
  "/health",
  "POST",
  "/jobs",
  "ffmpeg",
  "statusUrl",
  "outputUrl",
  "MAX_INPUT_BYTES",
  "FRESH_MEDIA_WORKER_API_TOKEN",
  "timingSafeEqual",
  "assertSafeMediaUrl",
  "requestPinnedHttps",
  "timeout: 30000",
  "MAX_ACTIVE_JOBS",
];
for (const token of required) {
  if (!server.includes(token) && !docker.includes(token)) throw new Error("Missing media-worker contract: " + token);
}
for (const token of ["isPublicIPv4", "isPublicIPv6", "lookup", "Media hosts must resolve only to public IP addresses"]) {
  if (!security.includes(token)) throw new Error("Missing media-worker URL security contract: " + token);
}
if (!docker.includes("ffmpeg")) throw new Error("FFmpeg is not installed in the worker image.");
if (!docker.includes("COPY media-url-security.mjs ./")) throw new Error("Media URL security module is not copied into the worker image.");
if (!proxy.includes("authenticatedUser") || !proxy.includes("FRESH_MEDIA_WORKER_API_TOKEN") || !proxy.includes("redirect: \"manual\"")) {
  throw new Error("Media worker proxy must authenticate users, keep the worker token server-side, and prevent upstream redirects.");
}
if (!client.includes("/api/media-worker") || client.includes("VITE_FRESH_MEDIA_WORKER_URL")) {
  throw new Error("Browser media worker client must use the same-origin authenticated proxy.");
}
if (server.includes('url.pathname === "/jobs") return json(res, 200, { jobs:')) {
  throw new Error("Public job enumeration must not be exposed.");
}
console.log("Fresh media worker contract + security checks: PASS");

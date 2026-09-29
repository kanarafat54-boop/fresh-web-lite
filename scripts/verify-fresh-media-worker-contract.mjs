import { readFileSync } from "node:fs";

const server = readFileSync("workers/media-worker/server.mjs", "utf8");
const docker = readFileSync("workers/media-worker/Dockerfile", "utf8");
const required = [
  "/health",
  "POST",
  "/jobs",
  "ffmpeg",
  "statusUrl",
  "outputUrl",
  "MAX_INPUT_BYTES",
];
for (const token of required) {
  if (!server.includes(token) && !docker.includes(token)) throw new Error("Missing media-worker contract: " + token);
}
if (!docker.includes("ffmpeg")) throw new Error("FFmpeg is not installed in the worker image.");
console.log("Fresh media worker contract: PASS");

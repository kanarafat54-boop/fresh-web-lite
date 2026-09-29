import http from "node:http";
import { execFile } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { promisify } from "node:util";
import { randomUUID } from "node:crypto";
import { join } from "node:path";

const execFileAsync = promisify(execFile);
const PORT = Number(process.env.PORT || 8080);
const ROOT = "/tmp/fresh-media-worker";
const jobs = new Map();
const MAX_INPUT_BYTES = 50 * 1024 * 1024;
const MAX_OUTPUT_BYTES = 100 * 1024 * 1024;

await mkdir(ROOT, { recursive: true });

function json(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  res.end(payload);
}

async function body(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 64 * 1024) throw new Error("Request body too large.");
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
}

async function download(url, target) {
  const parsed = new URL(url);
  if (!["http:", "https:"].includes(parsed.protocol)) throw new Error("Only HTTP(S) media URLs are supported.");
  const response = await fetch(parsed, { redirect: "manual" });
  if (!response.ok) throw new Error("Media download failed with HTTP " + response.status + ".");
  const type = response.headers.get("content-type") || "";
  if (!type.startsWith("video/") && !type.startsWith("audio/") && !type.includes("octet-stream")) {
    throw new Error("URL does not advertise a supported media content type.");
  }
  const length = Number(response.headers.get("content-length") || 0);
  if (length > MAX_INPUT_BYTES) throw new Error("Input media exceeds the 50 MB worker limit.");
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength > MAX_INPUT_BYTES) throw new Error("Input media exceeds the 50 MB worker limit.");
  await writeFile(target, bytes);
}

async function runJob(job) {
  const input = join(ROOT, job.id + "-input");
  const output = join(ROOT, job.id + "-output." + job.outputFormat);
  jobs.set(job.id, { ...job, status: "running", startedAt: new Date().toISOString() });
  try {
    await download(job.inputUrl, input);
    const args = ["-y", "-i", input, "-t", String(Math.min(job.maxSeconds, 30))];
    if (job.outputFormat === "webm") args.push("-c:v", "libvpx-vp9", "-deadline", "realtime", "-c:a", "libopus");
    else args.push("-c:v", "libx264", "-preset", "veryfast", "-c:a", "aac", "-movflags", "+faststart");
    args.push(output);
    await execFileAsync("ffmpeg", args, { timeout: 120000, maxBuffer: 2 * 1024 * 1024 });
    const data = await readFile(output);
    if (data.byteLength > MAX_OUTPUT_BYTES) throw new Error("Generated output exceeds the 100 MB worker limit.");
    jobs.set(job.id, {
      ...job,
      status: "succeeded",
      startedAt: jobs.get(job.id).startedAt,
      completedAt: new Date().toISOString(),
      outputBytes: data.byteLength,
      outputPath: output,
    });
  } catch (error) {
    jobs.set(job.id, {
      ...job,
      status: "failed",
      error: error instanceof Error ? error.message : String(error),
      completedAt: new Date().toISOString(),
    });
  } finally {
    await rm(input, { force: true }).catch(() => {});
  }
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url || "/", "http://localhost");
    if (req.method === "GET" && url.pathname === "/health") return json(res, 200, { ok: true, service: "fresh-media-worker", ffmpeg: true });
    if (req.method === "GET" && url.pathname === "/jobs") return json(res, 200, { jobs: [...jobs.values()].map(({ outputPath, ...safe }) => safe) });
    if (req.method === "POST" && url.pathname === "/jobs") {
      const input = await body(req);
      if (typeof input.inputUrl !== "string") return json(res, 400, { error: "inputUrl is required." });
      const outputFormat = input.outputFormat === "mp4" ? "mp4" : "webm";
      const job = {
        id: randomUUID(),
        inputUrl: input.inputUrl,
        outputFormat,
        maxSeconds: Math.min(Math.max(Number(input.maxSeconds) || 15, 1), 30),
        status: "queued",
        createdAt: new Date().toISOString(),
      };
      jobs.set(job.id, job);
      void runJob(job);
      return json(res, 202, { jobId: job.id, status: "queued", statusUrl: "/jobs/" + job.id });
    }
    const match = url.pathname.match(/^\/jobs\/([^/]+)$/);
    if (req.method === "GET" && match) {
      const job = jobs.get(match[1]);
      if (!job) return json(res, 404, { error: "Job not found." });
      const { outputPath, ...safe } = job;
      return json(res, 200, { ...safe, outputUrl: job.status === "succeeded" ? "/jobs/" + job.id + "/output" : null });
    }
    const outputMatch = url.pathname.match(/^\/jobs\/([^/]+)\/output$/);
    if (req.method === "GET" && outputMatch) {
      const job = jobs.get(outputMatch[1]);
      if (!job || job.status !== "succeeded" || !job.outputPath) return json(res, 404, { error: "Output not ready." });
      const data = await readFile(job.outputPath);
      res.writeHead(200, { "content-type": job.outputFormat === "mp4" ? "video/mp4" : "video/webm", "content-length": data.byteLength, "cache-control": "no-store" });
      return res.end(data);
    }
    return json(res, 404, { error: "Not found." });
  } catch (error) {
    return json(res, 400, { error: error instanceof Error ? error.message : String(error) });
  }
});

server.listen(PORT, "0.0.0.0", () => {
  console.log("Fresh media worker listening on " + PORT);
});

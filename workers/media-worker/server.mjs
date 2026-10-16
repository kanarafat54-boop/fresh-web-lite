import http from "node:http";
import https from "node:https";
import { execFile } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { promisify } from "node:util";
import { randomUUID, timingSafeEqual } from "node:crypto";
import { isIP } from "node:net";
import { join } from "node:path";
import { assertSafeMediaUrl } from "./media-url-security.mjs";

const execFileAsync = promisify(execFile);
const PORT = Number(process.env.PORT || 8080);
const ROOT = "/tmp/fresh-media-worker";
const jobs = new Map();
const MAX_INPUT_BYTES = 50 * 1024 * 1024;
const MAX_OUTPUT_BYTES = 100 * 1024 * 1024;
const MAX_ACTIVE_JOBS = 2;
const MAX_RETAINED_JOBS = 500;

await mkdir(ROOT, { recursive: true });

function json(res, status, body) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
  });
  res.end(payload);
}

function authorized(req) {
  const expected = process.env.FRESH_MEDIA_WORKER_API_TOKEN;
  if (!expected) return "unconfigured";
  const header = req.headers.authorization || "";
  const supplied = header.startsWith("Bearer ") ? header.slice(7) : "";
  const expectedBytes = Buffer.from(expected);
  const suppliedBytes = Buffer.from(supplied);
  return expectedBytes.length === suppliedBytes.length &&
    timingSafeEqual(expectedBytes, suppliedBytes) ? "ok" : "denied";
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

function requestPinnedHttps(url, address) {
  return new Promise((resolve, reject) => {
    const request = https.request(url, {
      method: "GET",
      timeout: 30000,
      lookup: (_hostname, options, callback) => {
        const record = { address, family: isIP(address) };
        if (options && typeof options === "object" && options.all) callback(null, [record]);
        else callback(null, record.address, record.family);
      },
    }, resolve);
    request.on("timeout", () => request.destroy(new Error("Media download timed out.")));
    request.on("error", reject);
    request.end();
  });
}

async function download(url, target) {
  const safe = await assertSafeMediaUrl(url);
  const response = await requestPinnedHttps(safe.url, safe.address);
  if (response.statusCode < 200 || response.statusCode >= 300) {
    response.resume();
    throw new Error("Media download failed with HTTP " + response.statusCode + ".");
  }
  const type = String(response.headers["content-type"] || "");
  if (!type.startsWith("video/") && !type.startsWith("audio/") && !type.includes("octet-stream")) {
    response.resume();
    throw new Error("URL does not advertise a supported media content type.");
  }
  const length = Number(response.headers["content-length"] || 0);
  if (length > MAX_INPUT_BYTES) {
    response.resume();
    throw new Error("Input media exceeds the 50 MB worker limit.");
  }

  const chunks = [];
  let total = 0;
  for await (const chunk of response) {
    total += chunk.length;
    if (total > MAX_INPUT_BYTES) {
      response.destroy();
      throw new Error("Input media exceeds the 50 MB worker limit.");
    }
    chunks.push(Buffer.from(chunk));
  }
  await writeFile(target, Buffer.concat(chunks, total), { flag: "wx" });
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
    if (data.byteLength > MAX_OUTPUT_BYTES) {
      await rm(output, { force: true });
      throw new Error("Generated output exceeds the 100 MB worker limit.");
    }
    jobs.set(job.id, {
      ...job,
      status: "succeeded",
      startedAt: jobs.get(job.id).startedAt,
      completedAt: new Date().toISOString(),
      outputBytes: data.byteLength,
      outputPath: output,
    });
  } catch (error) {
    await rm(output, { force: true }).catch(() => {});
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
    if (req.method === "GET" && url.pathname === "/health") {
      return json(res, 200, { ok: true, service: "fresh-media-worker", ffmpeg: true });
    }

    const auth = authorized(req);
    if (auth === "unconfigured") return json(res, 503, { error: "Media worker API authentication is not configured." });
    if (auth !== "ok") return json(res, 401, { error: "Authentication required." });

    if (req.method === "POST" && url.pathname === "/jobs") {
      const input = await body(req);
      if (typeof input.inputUrl !== "string") return json(res, 400, { error: "inputUrl is required." });
      if ([...jobs.values()].filter((job) => job.status === "queued" || job.status === "running").length >= MAX_ACTIVE_JOBS) {
        return json(res, 429, { error: "Media worker is busy. Try again shortly." });
      }
      if (jobs.size >= MAX_RETAINED_JOBS) {
        const finished = [...jobs.values()].filter((job) => ["succeeded", "failed"].includes(job.status));
        for (const old of finished.slice(0, Math.max(1, jobs.size - MAX_RETAINED_JOBS + 1))) {
          if (old.outputPath) await rm(old.outputPath, { force: true }).catch(() => {});
          jobs.delete(old.id);
        }
      }
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
    const match = url.pathname.match(/^\/jobs\/([0-9a-f-]{36})$/i);
    if (req.method === "GET" && match) {
      const job = jobs.get(match[1]);
      if (!job) return json(res, 404, { error: "Job not found." });
      const { outputPath, ...safe } = job;
      return json(res, 200, { ...safe, outputUrl: job.status === "succeeded" ? "/jobs/" + job.id + "/output" : null });
    }
    const outputMatch = url.pathname.match(/^\/jobs\/([0-9a-f-]{36})\/output$/i);
    if (req.method === "GET" && outputMatch) {
      const job = jobs.get(outputMatch[1]);
      if (!job || job.status !== "succeeded" || !job.outputPath) return json(res, 404, { error: "Output not ready." });
      const data = await readFile(job.outputPath);
      res.writeHead(200, {
        "content-type": job.outputFormat === "mp4" ? "video/mp4" : "video/webm",
        "content-length": data.byteLength,
        "cache-control": "no-store",
        "x-content-type-options": "nosniff",
      });
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

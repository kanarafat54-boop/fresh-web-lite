import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { createReadStream, existsSync } from "node:fs";
import { mkdir, rm, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { EXPORT_PRESETS, planRender } from "./vendor/renderPlan.mjs";

const clamp = (n, lo, hi) => Math.min(Math.max(n, lo), hi);
const ASSET_ID = /^[A-Za-z0-9_-]{1,64}$/;
const procs = new Map();

/** Fonts installed in the worker image (fonts-dejavu-core). Text export is only offered when they exist. */
export const WORKER_FONTS = {
  regular: process.env.FRESH_FONT_REGULAR || "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
  bold: process.env.FRESH_FONT_BOLD || "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
};
export const textSupported = () => existsSync(WORKER_FONTS.regular) && existsSync(WORKER_FONTS.bold);

/** What this worker will actually render. The UI reads this, so it never offers an option that would fail. */
export function getRenderLimits(env = process.env) {
  const order = EXPORT_PRESETS.map((p) => p.id);
  const max = order.includes(env.FRESH_RENDER_MAX_PRESET) ? env.FRESH_RENDER_MAX_PRESET : "720p";
  return {
    presets: order.slice(0, order.indexOf(max) + 1),
    aspectRatios: ["9:16", "16:9", "1:1", "4:5", "21:9"],
    frameRates: [24, 25, 30, 60],
    maxSeconds: clamp(Number(env.FRESH_RENDER_MAX_SECONDS) || 120, 5, 300),
    maxSources: 8,
    maxCaptionBytes: 200 * 1024,
    text: textSupported(),
    maxActivePerUser: 1,
    maxActiveTotal: clamp(Number(env.FRESH_RENDER_MAX_ACTIVE) || 1, 1, 4),
    timeoutMs: clamp(Number(env.FRESH_RENDER_TIMEOUT_MS) || 10 * 60 * 1000, 10_000, 30 * 60 * 1000),
  };
}

/** Validates a render request from the network. Never trusts the client's timeline. */
export function parseRenderRequest(input, limits) {
  const fail = (error) => ({ ok: false, error });
  if (!input || typeof input !== "object" || Array.isArray(input)) return fail("A JSON render request is required.");
  const { timeline, preset, aspectRatio, sources, fps, captionsSrt } = input;
  if (!limits.presets.includes(preset)) return fail(`"${String(preset).slice(0, 12)}" is not available on this render worker. Available: ${limits.presets.join(", ")}.`);
  if (!limits.aspectRatios.includes(aspectRatio)) return fail("Choose a supported aspect ratio.");
  if (fps !== undefined && !limits.frameRates.includes(fps)) return fail("Frame rate must be 24, 25, 30 or 60.");
  if (!sources || typeof sources !== "object" || Array.isArray(sources)) return fail("Source media is required.");
  const ids = Object.keys(sources);
  if (ids.length === 0 || ids.length > limits.maxSources) return fail(`A render can use 1 to ${limits.maxSources} source files.`);
  for (const id of ids) {
    if (!ASSET_ID.test(id)) return fail("A source id is invalid.");
    if (typeof sources[id] !== "string" || !sources[id].startsWith("https://") || sources[id].length > 2048) return fail("Every source must be an https URL.");
  }
  if (captionsSrt !== undefined && (typeof captionsSrt !== "string" || Buffer.byteLength(captionsSrt) > limits.maxCaptionBytes)) return fail("Captions are too large.");
  // Dry-run the planner with placeholder paths: catches bad timelines and over-long renders before any download.
  const placeholders = Object.fromEntries(ids.map((id) => [id, "placeholder"]));
  const textLayers = Array.isArray(timeline?.texts) ? timeline.texts : [];
  if (textLayers.length > 0 && !limits.text) return fail("This render worker has no fonts installed, so text cannot be exported.");
  const textPlaceholders = Object.fromEntries(textLayers.map((t) => [t?.id, "text.txt"]));
  const dry = planRender({ doc: timeline, preset, aspectRatio, sources: placeholders, outputPath: "out.mp4", fps, captionsFile: captionsSrt ? "captions.srt" : undefined, textFiles: textPlaceholders, fonts: WORKER_FONTS });
  if (!dry.ok) return fail(dry.errors[0]);
  if (dry.duration > limits.maxSeconds) return fail(`This worker renders up to ${limits.maxSeconds} seconds at a time. Your video is ${Math.ceil(dry.duration)} seconds.`);
  const used = new Set([...timeline.clips.map((c) => c.assetId), ...(timeline.overlays ?? []).filter((o) => o?.kind === "image").map((o) => o.assetId)]);
  for (const id of used) if (!sources[id]) return fail("A source file is missing.");
  return { ok: true, value: { timeline, preset, aspectRatio, sources, fps, captionsSrt, duration: dry.duration, width: dry.width, height: dry.height } };
}

/** Reads the finished file back with ffprobe so the job can vouch for what it produced. */
export function probeOutput(file) {
  return new Promise((resolve, reject) => {
    const child = spawn("ffprobe", ["-v", "error", "-print_format", "json", "-show_format", "-show_streams", file], { stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    child.stdout.on("data", (c) => { out += c.toString(); });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) return reject(new Error("probe failed"));
      try {
        const data = JSON.parse(out);
        const v = (data.streams ?? []).find((x) => x.codec_type === "video");
        const a = (data.streams ?? []).find((x) => x.codec_type === "audio");
        resolve({ duration: Number(data.format?.duration), width: v?.width, height: v?.height, vcodec: v?.codec_name, acodec: a?.codec_name });
      } catch (error) { reject(error); }
    });
  });
}

export const sha256File = (file) => new Promise((resolve, reject) => {
  const hash = createHash("sha256");
  createReadStream(file).on("data", (c) => hash.update(c)).on("error", reject).on("end", () => resolve(hash.digest("hex")));
});

/** What the planner promised versus what ffprobe found. Returns a message, or null when the file is what was asked for. */
export function checkProbe(probe, plan) {
  if (!probe.vcodec) return "The finished video has no picture.";
  if (probe.vcodec !== "h264") return "The finished video is not H.264.";
  if (probe.width !== plan.width || probe.height !== plan.height) return `The finished video is ${probe.width}×${probe.height}, not the ${plan.width}×${plan.height} that was asked for.`;
  if (!Number.isFinite(probe.duration)) return "The finished video has no readable length.";
  const tolerance = Math.max(0.6, plan.duration * 0.03);
  if (Math.abs(probe.duration - plan.duration) > tolerance) return `The finished video is ${probe.duration.toFixed(1)} s long, not the ${plan.duration.toFixed(1)} s that was asked for.`;
  return null;
}

export function cancelRender(jobId) {
  const child = procs.get(jobId);
  if (!child) return false;
  child.kill("SIGKILL");
  return true;
}

/**
 * Runs one render. `ctx` supplies the worker's download function and job store so this file
 * stays testable without a network. Always cleans its temporary input files.
 */
export async function runRenderJob(job, ctx) {
  const { root, jobs, download, limits, probe = probeOutput } = ctx;
  const update = (patch) => { const current = jobs.get(job.id); if (current) jobs.set(job.id, { ...current, ...patch }); };
  const dir = join(root, `${job.id}-render`);
  const output = join(root, `${job.id}-output.mp4`);
  const request = job.request;
  update({ status: "running", startedAt: new Date().toISOString(), progress: 0 });
  try {
    await mkdir(dir, { recursive: true });
    const local = {};
    let i = 0;
    for (const id of new Set([...request.timeline.clips.map((c) => c.assetId), ...(request.timeline.overlays ?? []).filter((o) => o?.kind === "image").map((o) => o.assetId)])) {
      if (jobs.get(job.id)?.cancelRequested) throw new Error("cancelled");
      const target = join(dir, `src-${i++}`);
      await download(request.sources[id], target);
      local[id] = target;
    }
    let captionsFile;
    if (request.captionsSrt) {
      captionsFile = join(dir, "captions.srt");
      await writeFile(captionsFile, request.captionsSrt, "utf8");
    }
    const textFiles = {};
    for (const [k, t] of (request.timeline.texts ?? []).entries()) {
      textFiles[t.id] = join(dir, `text-${k}.txt`);
      await writeFile(textFiles[t.id], t.text, "utf8");
    }
    const plan = planRender({ doc: request.timeline, preset: request.preset, aspectRatio: request.aspectRatio, sources: local, outputPath: output, fps: request.fps, captionsFile, textFiles, fonts: WORKER_FONTS });
    if (!plan.ok) throw new Error(plan.errors[0]);

    // Ask ffmpeg for machine-readable progress on stdout.
    const args = [plan.args[0], "-progress", "pipe:1", ...plan.args.slice(1)];
    await new Promise((resolve, reject) => {
      const child = spawn("ffmpeg", args, { stdio: ["ignore", "pipe", "pipe"] });
      procs.set(job.id, child);
      let stderrTail = "";
      let buffer = "";
      const timer = setTimeout(() => child.kill("SIGKILL"), limits.timeoutMs);
      child.stdout.on("data", (chunk) => {
        buffer += chunk.toString();
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          const m = line.match(/^out_time_(?:us|ms)=(\d+)/);
          if (m) update({ progress: clamp(Number(m[1]) / 1e6 / plan.duration, 0, 0.99) });
        }
      });
      child.stderr.on("data", (chunk) => { stderrTail = (stderrTail + chunk.toString()).slice(-1500); });
      child.on("error", (error) => { clearTimeout(timer); reject(error); });
      child.on("close", (code, signal) => {
        clearTimeout(timer);
        procs.delete(job.id);
        if (jobs.get(job.id)?.cancelRequested) return reject(new Error("cancelled"));
        if (signal) return reject(new Error("The render took too long and was stopped."));
        if (code !== 0) return reject(new Error("The render failed. " + (stderrTail.split("\n").filter(Boolean).pop() ?? "").slice(0, 200)));
        resolve();
      });
    });

    const info = await stat(output);
    if (info.size > 100 * 1024 * 1024) throw new Error("The finished video is larger than the 100 MB limit.");
    if (info.size < 1000) throw new Error("The render produced an empty file.");
    let probed;
    try { probed = await probe(output); } catch { throw new Error("The finished video could not be read back, so it was discarded."); }
    const mismatch = checkProbe(probed, plan);
    if (mismatch) throw new Error(mismatch);
    const sha256 = await sha256File(output);
    update({ status: "succeeded", progress: 1, completedAt: new Date().toISOString(), outputBytes: info.size, outputPath: output, width: plan.width, height: plan.height, duration: plan.duration,
      output: { bytes: info.size, sha256, duration: Number(probed.duration.toFixed(3)), width: probed.width, height: probed.height, vcodec: probed.vcodec, ...(probed.acodec ? { acodec: probed.acodec } : {}) } });
  } catch (error) {
    await rm(output, { force: true }).catch(() => {});
    const cancelled = error instanceof Error && error.message === "cancelled";
    update({ status: cancelled ? "cancelled" : "failed", completedAt: new Date().toISOString(), ...(cancelled ? {} : { error: error instanceof Error ? error.message : String(error) }) });
  } finally {
    procs.delete(job.id);
    await rm(dir, { recursive: true, force: true }).catch(() => {});
  }
}

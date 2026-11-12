import assert from "node:assert/strict";
import { execFileSync, spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { generate } from "./sync-studio-worker.mjs";

// --- 0) The worker's planner copy must be exactly what the source generates (no silent drift)
for (const [name, content] of generate()) {
  const file = new URL(`../workers/media-worker/vendor/${name}`, import.meta.url);
  assert.ok(fs.existsSync(file), `missing generated file ${name}`);
  assert.equal(fs.readFileSync(file, "utf8"), content, `workers/media-worker/vendor/${name} is out of date. Run: node scripts/sync-studio-worker.mjs`);
}

const { getRenderLimits, parseRenderRequest, runRenderJob, cancelRender, checkProbe } = await import("../workers/media-worker/render-job.mjs");
const T = await import("../src/features/fresh-studio/video-studio/timeline.ts");

// --- Limits and request validation (no ffmpeg needed)
const limits = getRenderLimits({});
assert.deepEqual(limits.presets, ["360p", "480p", "720p"], "default worker never advertises 1080p");
assert.deepEqual(getRenderLimits({ FRESH_RENDER_MAX_PRESET: "1080p" }).presets, ["360p", "480p", "720p", "1080p"]);
assert.deepEqual(getRenderLimits({ FRESH_RENDER_MAX_PRESET: "4K" }).presets, ["360p", "480p", "720p"], "unknown presets fall back to the safe default");
assert.equal(getRenderLimits({ FRESH_RENDER_MAX_SECONDS: "99999" }).maxSeconds, 1200);
assert.equal(getRenderLimits({}).maxSeconds, 120, "the default stays modest until the operator raises it");
assert.equal(getRenderLimits({ FRESH_RENDER_MAX_SECONDS: "900" }).maxSeconds, 900);
assert.equal(getRenderLimits({ FRESH_RENDER_TIMEOUT_MS: "99999999" }).timeoutMs, 3600000);
assert.equal(getRenderLimits({ FRESH_RENDER_MAX_SECONDS: "1" }).maxSeconds, 5);

const asset = (id, duration) => ({ id, name: id, kind: "video", duration, width: 640, height: 360, hasAudio: true });
const makeDoc = (duration = 4) => T.addClip(T.addAsset(T.createTimeline(30), asset("a", duration)), { trackId: "v1", assetId: "a", id: "c1" });
const good = (over = {}) => ({ timeline: makeDoc(), preset: "360p", aspectRatio: "16:9", sources: { a: "https://example.com/a.mp4" }, ...over });
const bad = (over, pattern) => { const r = parseRenderRequest(good(over), limits); assert.equal(r.ok, false, JSON.stringify(over).slice(0, 80)); assert.match(r.error, pattern); };

assert.equal(parseRenderRequest(good(), limits).ok, true);
assert.equal(parseRenderRequest(null, limits).ok, false);
assert.equal(parseRenderRequest([], limits).ok, false);
bad({ preset: "1080p" }, /not available on this render worker/);
bad({ preset: "4K" }, /not available/);
bad({ aspectRatio: "3:2" }, /aspect ratio/i);
bad({ fps: 17 }, /frame rate/i);
bad({ sources: {} }, /1 to 8 source/);
bad({ sources: { a: "http://example.com/a.mp4" } }, /https/);
bad({ sources: { a: "file:///etc/passwd" } }, /https/);
bad({ sources: { "../a": "https://x.test/a.mp4" } }, /source id/i);
bad({ sources: Object.fromEntries(Array.from({ length: 9 }, (_, i) => [`s${i}`, "https://x.test/a.mp4"])) }, /1 to 8/);
bad({ sources: { other: "https://x.test/a.mp4" } }, /source file/i);
bad({ timeline: makeDoc(200) }, /up to 120 seconds/);
bad({ timeline: { ...makeDoc(), version: 9 } }, /Unsupported timeline/);
bad({ timeline: { ...makeDoc(), clips: [{ ...makeDoc().clips[0], sourceOut: 99 }] } }, /past its media/);
bad({ captionsSrt: "x".repeat(300 * 1024) }, /too large/i);
bad({ timeline: null }, /timeline/i);

// ---- everything below needs ffmpeg
const have = (bin) => spawnSync(bin, ["-version"]).status === 0;
if (!have("ffmpeg") || !have("ffprobe")) {
  if (process.env.FRESH_REQUIRE_FFMPEG) throw new Error("ffmpeg and ffprobe are required for this test.");
  console.log("Fresh Studio worker contract: ffmpeg-dependent checks SKIPPED (ffmpeg/ffprobe not installed). Validation checks passed.");
  process.exit(0);
}

const work = fs.mkdtempSync(path.join(process.env.FRESH_TEST_TMP || os.tmpdir(), "fresh-studio-worker-"));
const srcDir = path.join(work, "src"); fs.mkdirSync(srcDir);
const ff = (...args) => { const r = spawnSync("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", ...args], { encoding: "utf8" }); assert.equal(r.status, 0, r.stderr); };
const probe = (f) => JSON.parse(execFileSync("ffprobe", ["-v", "error", "-print_format", "json", "-show_format", "-show_streams", f]).toString());
const SHORT = path.join(srcDir, "short.mp4"), LONG = path.join(srcDir, "long.mp4");
ff("-f", "lavfi", "-i", "testsrc=duration=4:size=640x360:rate=30", "-f", "lavfi", "-i", "sine=frequency=440:duration=4", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest", SHORT);
ff("-f", "lavfi", "-i", "testsrc=duration=110:size=1280x720:rate=30", "-f", "lavfi", "-i", "sine=frequency=440:duration=110", "-c:v", "libx264", "-preset", "ultrafast", "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest", LONG);

const fakeDownload = async (url, target) => {
  const map = { "https://media.test/short.mp4": SHORT, "https://media.test/long.mp4": LONG };
  if (!map[url]) throw new Error("Media download failed with HTTP 404.");
  fs.copyFileSync(map[url], target);
};
const newJob = (request) => ({ id: crypto.randomUUID(), kind: "render", ownerId: crypto.randomUUID(), request, status: "queued", progress: 0 });
const ctx = (jobs, root) => ({ root, jobs, download: fakeDownload, limits });
const roots = () => { const r = fs.mkdtempSync(path.join(work, "root-")); return r; };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// --- 1) Successful render with a captions track
{
  const root = roots(), jobs = new Map();
  const doc = makeDoc(4);
  const req = parseRenderRequest({ timeline: doc, preset: "360p", aspectRatio: "9:16", sources: { a: "https://media.test/short.mp4" }, captionsSrt: "1\n00:00:00,500 --> 00:00:02,000\nHello\n" }, limits);
  assert.ok(req.ok, req.error);
  const job = newJob(req.value); jobs.set(job.id, job);
  await runRenderJob(job, ctx(jobs, root));
  const done = jobs.get(job.id);
  assert.equal(done.status, "succeeded", done.error);
  assert.equal(done.progress, 1);
  assert.ok(done.outputBytes > 1000);
  const info = probe(done.outputPath);
  const v = info.streams.find((s) => s.codec_type === "video");
  assert.equal(v.width, 360); assert.equal(v.height, 640);
  assert.ok(Math.abs(Number(info.format.duration) - 4) < 0.3, "duration");
  assert.deepEqual(fs.readdirSync(root).filter((n) => n.endsWith("-render")), [], "temporary input files are removed");
}

// --- 1b) Text, volume, fades, colour and framing travel through the worker and come out in the file
if (limits.text) {
  const root = roots(), jobs = new Map();
  let doc = T.setClipFit(T.setClipLook(T.setClipAudio(makeDoc(4), "c1", { volume: 0.5, fadeIn: 0.5 }), "c1", { brightness: 0, contrast: 1, saturation: 0 }), "c1", "fill");
  doc = T.updateText(T.addText(doc, { start: 0.5, duration: 2, id: "t1", text: "It's 100%: \"quoted\"" }), "t1", { size: 0.15 });
  const req = parseRenderRequest({ timeline: doc, preset: "360p", aspectRatio: "16:9", sources: { a: "https://media.test/short.mp4" } }, limits);
  assert.ok(req.ok, req.error);
  const job = newJob(req.value); jobs.set(job.id, job);
  await runRenderJob(job, ctx(jobs, root));
  const done = jobs.get(job.id);
  assert.equal(done.status, "succeeded", done.error);
  assert.ok(done.outputBytes > 1000);
  assert.equal(done.output.bytes, done.outputBytes); assert.match(done.output.sha256, /^[0-9a-f]{64}$/); assert.equal(done.output.vcodec, "h264");
  assert.deepEqual(fs.readdirSync(root).filter((n) => n.endsWith("-render")), [], "text files are cleaned up too");
  const stats = spawnSync("ffmpeg", ["-hide_banner", "-ss", "1", "-i", done.outputPath, "-frames:v", "1", "-vf", "signalstats,metadata=print:file=-", "-f", "null", "-"], { encoding: "utf8" });
  assert.ok(Number((stats.stdout + stats.stderr).match(/SATAVG=([\d.]+)/)[1]) < 3, "Mono look was applied by the worker");
  const noFonts = parseRenderRequest({ timeline: doc, preset: "360p", aspectRatio: "16:9", sources: { a: "https://media.test/short.mp4" } }, { ...limits, text: false });
  assert.equal(noFonts.ok, false); assert.match(noFonts.error, /no fonts/);
}

// --- 1c) The probe check compares the finished file with what the planner promised
{
  const plan = { width: 640, height: 360, duration: 10 };
  const ok = { vcodec: "h264", width: 640, height: 360, duration: 10.1 };
  assert.equal(checkProbe(ok, plan), null);
  assert.match(checkProbe({ ...ok, vcodec: undefined }, plan), /no picture/);
  assert.match(checkProbe({ ...ok, vcodec: "vp9" }, plan), /H\.264/);
  assert.match(checkProbe({ ...ok, width: 320 }, plan), /320×360/);
  assert.match(checkProbe({ ...ok, duration: 14 }, plan), /long/);
  assert.match(checkProbe({ ...ok, duration: NaN }, plan), /readable/);
}

// --- 2) A failed download fails the job cleanly and leaves nothing behind
{
  const root = roots(), jobs = new Map();
  const req = parseRenderRequest(good({ sources: { a: "https://media.test/missing.mp4" } }), limits);
  const job = newJob(req.value); jobs.set(job.id, job);
  await runRenderJob(job, ctx(jobs, root));
  assert.equal(jobs.get(job.id).status, "failed");
  assert.match(jobs.get(job.id).error, /HTTP 404/);
  assert.deepEqual(fs.readdirSync(root), [], "no leftover files after a failure");
}

// --- 3) Cancellation kills ffmpeg promptly, reports "cancelled" and removes partial output
{
  const root = roots(), jobs = new Map();
  const req = parseRenderRequest({ timeline: T.addClip(T.addAsset(T.createTimeline(30), asset("a", 110)), { trackId: "v1", assetId: "a", id: "c1" }), preset: "720p", aspectRatio: "16:9", sources: { a: "https://media.test/long.mp4" } }, limits);
  assert.ok(req.ok, req.error);
  const job = newJob(req.value); jobs.set(job.id, job);
  const running = runRenderJob(job, ctx(jobs, root));
  const started = Date.now();
  while (Date.now() - started < 20000) { if (jobs.get(job.id).progress > 0 || jobs.get(job.id).status !== "running") break; await wait(100); if (cancelRender(job.id)) { jobs.set(job.id, { ...jobs.get(job.id), cancelRequested: true }); } }
  jobs.set(job.id, { ...jobs.get(job.id), cancelRequested: true });
  cancelRender(job.id);
  await running;
  assert.ok(Date.now() - started < 25000, "cancel returned well before the render could finish");
  assert.equal(jobs.get(job.id).status, "cancelled");
  assert.deepEqual(fs.readdirSync(root), [], "cancelled render leaves no files");
}

// --- 4) Real HTTP server: auth, ownership, safe URLs, cancel
const freePort = await new Promise((resolve) => { const s = net.createServer().listen(0, () => { const p = s.address().port; s.close(() => resolve(p)); }); });
const serverRoot = roots();
const TOKEN = "test-token-" + crypto.randomUUID();
const child = spawn("node", ["workers/media-worker/server.mjs"], { cwd: new URL("..", import.meta.url).pathname, env: { ...process.env, PORT: String(freePort), FRESH_MEDIA_WORKER_API_TOKEN: TOKEN, FRESH_MEDIA_WORKER_ROOT: serverRoot }, stdio: "ignore" });
try {
  const base = `http://127.0.0.1:${freePort}`;
  for (let i = 0; i < 50; i += 1) { try { if ((await fetch(base + "/health")).ok) break; } catch { /* starting */ } await wait(100); }
  const alice = crypto.randomUUID(), bob = crypto.randomUUID();
  const call = (method, p, { token = TOKEN, user, body, extraHeaders = {} } = {}) => fetch(base + p, { method, headers: { ...extraHeaders, ...(token ? { authorization: `Bearer ${token}` } : {}), ...(user ? { "x-fresh-user-id": user } : {}), ...(body ? { "content-type": "application/json" } : {}) }, ...(body ? { body: typeof body === "string" ? body : JSON.stringify(body) } : {}) });

  assert.equal((await call("GET", "/health", { token: null })).status, 200);
  assert.equal((await call("GET", "/capabilities", { token: null })).status, 401, "capabilities needs the token");
  assert.equal((await call("GET", "/capabilities", { token: "wrong" })).status, 401);
  const caps = await (await call("GET", "/capabilities")).json();
  assert.deepEqual(caps.render.presets, ["360p", "480p", "720p"]);
  assert.equal(caps.render.maxSeconds, 120);

  assert.equal((await call("POST", "/renders", { body: good() })).status, 400, "render requires a user id");
  const noUser = await (await call("POST", "/renders", { body: good() })).json();
  assert.match(noUser.error, /x-fresh-user-id/);
  assert.equal((await call("POST", "/renders", { user: alice, body: good({ preset: "4K" }) })).status, 400);
  assert.equal((await call("POST", "/renders", { user: alice, body: "{not json" })).status, 400);
  const huge = await call("POST", "/renders", { user: alice, body: JSON.stringify({ x: "y".repeat(300 * 1024) }) });
  assert.equal(huge.status, 400);
  assert.match((await huge.json()).error, /too large/i);

  // The same idempotency key sent twice at once starts one render; a bad key is refused
  {
    const key = "retry-key-" + crypto.randomUUID().slice(0, 8);
    const post = (k) => call("POST", "/renders", { user: alice, body: good(), extraHeaders: { "x-idempotency-key": k } });
    const [a, b] = await Promise.all([post(key), post(key)]);
    const ja = await a.json(), jb = await b.json();
    assert.equal(a.status, 202); assert.equal(b.status, 202); assert.equal(ja.jobId, jb.jobId, "one job for one key");
    assert.equal((await post("bad key!")).status, 400);
    await call("DELETE", `/jobs/${ja.jobId}`, { user: alice });
    for (let i = 0; i < 100; i += 1) { const st = await (await call("GET", `/jobs/${ja.jobId}`, { user: alice })).json(); if (st.status !== "queued" && st.status !== "running") break; await wait(100); }
  }

  // A private-network source is refused by the existing safe-URL guard, and the job fails without any fetch
  const accepted = await call("POST", "/renders", { user: alice, body: good({ sources: { a: "https://127.0.0.1/a.mp4" } }) });
  assert.equal(accepted.status, 202);
  const { jobId } = await accepted.json();
  let status;
  for (let i = 0; i < 100; i += 1) { status = await (await call("GET", `/jobs/${jobId}`, { user: alice })).json(); if (status.status === "failed" || status.status === "succeeded") break; await wait(100); }
  assert.equal(status.status, "failed");
  assert.ok(status.error && !/127\.0\.0\.1.*(ok|success)/i.test(status.error), status.error);
  for (const secret of ["request", "ownerId", "sources", "cancelRequested", "outputPath"]) assert.ok(!(secret in status), `status must not expose ${secret}`);

  // Ownership: another signed-in user cannot read or cancel Alice's job; the token alone is not enough
  assert.equal((await call("GET", `/jobs/${jobId}`, { user: bob })).status, 404);
  assert.equal((await call("GET", `/jobs/${jobId}`)).status, 404);
  assert.equal((await call("DELETE", `/jobs/${jobId}`, { user: bob })).status, 404);
  assert.equal((await call("GET", `/jobs/${jobId}/output`, { user: bob })).status, 404);
  assert.equal((await call("DELETE", `/jobs/${jobId}`, { user: alice })).status, 200, "finishing jobs report their final state");
  assert.equal((await call("DELETE", "/jobs/00000000-0000-0000-0000-000000000000", { user: alice })).status, 404);
  assert.equal((await call("DELETE", `/jobs/${jobId}`, { token: null, user: alice })).status, 401);
} finally {
  child.kill("SIGKILL");
}

fs.rmSync(work, { recursive: true, force: true });
console.log("Fresh Studio worker contract passed (planner sync, validation, real renders, cancel, ownership, safe URLs).");

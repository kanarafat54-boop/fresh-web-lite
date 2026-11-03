import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// Renders real files with the real ffmpeg and checks what comes out, not just the arguments.
const have = (bin) => spawnSync(bin, ["-version"]).status === 0;
if (!have("ffmpeg") || !have("ffprobe")) {
  console.log("Fresh Studio render contract SKIPPED: ffmpeg/ffprobe are not installed here.");
  process.exit(0);
}

const base = "../src/features/fresh-studio/video-studio/";
const T = await import(base + "timeline.ts");
const R = await import(base + "renderPlan.ts");
const { createTimeline, addAsset, addClip, splitClip, setClipSpeed, moveClip, setTrackFlags } = T;
const { planRender, outputSize, atempoChain, EXPORT_PRESETS, UNAVAILABLE_PRESETS } = R;

const dir = fs.mkdtempSync(path.join(process.env.FRESH_TEST_TMP || os.tmpdir(), "fresh-studio-render-"));
const ff = (...args) => execFileSync("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", ...args], { stdio: "pipe" });
const probe = (file) => {
  const out = JSON.parse(execFileSync("ffprobe", ["-v", "error", "-print_format", "json", "-show_format", "-show_streams", file]).toString());
  const v = out.streams.find((s) => s.codec_type === "video");
  const a = out.streams.find((s) => s.codec_type === "audio");
  return { duration: Number(out.format.duration), width: v?.width, height: v?.height, vcodec: v?.codec_name, acodec: a?.codec_name, hasAudio: !!a, fps: v ? eval(v.r_frame_rate) : null };
};
const meanVolume = (file, from, to) => {
  const r = spawnSync("ffmpeg", ["-hide_banner", "-ss", String(from), "-t", String(to - from), "-i", file, "-vn", "-af", "volumedetect", "-f", "null", "-"], { encoding: "utf8" });
  const m = r.stderr.match(/mean_volume:\s*(-?[\d.]+|-inf) dB/);
  return m ? (m[1] === "-inf" ? -Infinity : Number(m[1])) : null;
};

// --- Source media
const A = path.join(dir, "a.mp4"), B = path.join(dir, "b.mp4"), SONG = path.join(dir, "song.m4a");
ff("-f", "lavfi", "-i", "testsrc=duration=6:size=640x360:rate=30", "-f", "lavfi", "-i", "sine=frequency=440:duration=6", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest", A);
ff("-f", "lavfi", "-i", "testsrc2=duration=4:size=320x240:rate=25", "-c:v", "libx264", "-pix_fmt", "yuv420p", B);
ff("-f", "lavfi", "-i", "sine=frequency=880:duration=20", "-c:a", "aac", SONG);
const sources = { a: A, b: B, song: SONG };
const asset = (id, duration, kind, hasAudio, w = 640, h = 360) => ({ id, name: `${id}`, kind, duration, width: w, height: h, hasAudio });
const base0 = () => addAsset(addAsset(addAsset(createTimeline(30), asset("a", 6, "video", true)), asset("b", 4, "video", false, 320, 240)), asset("song", 20, "audio", true, null, null));
const render = (doc, preset = "720p", aspectRatio = "16:9", extra = {}) => {
  const out = path.join(dir, `out-${Math.random().toString(36).slice(2)}.mp4`);
  const plan = planRender({ doc, preset, aspectRatio, sources, outputPath: out, ...extra });
  assert.ok(plan.ok, plan.errors?.join("; "));
  ff(...plan.args);
  return { plan, out, info: probe(out) };
};
const near = (actual, expected, tol, label) => assert.ok(Math.abs(actual - expected) <= tol, `${label}: expected ~${expected}, got ${actual}`);

// --- Pure helpers
assert.deepEqual(atempoChain(1), []);
assert.deepEqual(atempoChain(2), ["atempo=2"]);
assert.deepEqual(atempoChain(4), ["atempo=2", "atempo=2"]);
assert.deepEqual(atempoChain(0.25), ["atempo=0.5", "atempo=0.5"]);
assert.deepEqual(atempoChain(1.5), ["atempo=1.5"]);
assert.deepEqual(outputSize("720p", "9:16"), { width: 720, height: 1280 });
assert.deepEqual(outputSize("1080p", "16:9"), { width: 1920, height: 1080 });
assert.deepEqual(outputSize("480p", "16:9"), { width: 854, height: 480 });
assert.deepEqual(outputSize("360p", "1:1"), { width: 360, height: 360 });
assert.equal(outputSize("4K", "16:9"), null);
assert.deepEqual(EXPORT_PRESETS.map((p) => p.id), ["360p", "480p", "720p", "1080p"]);
assert.deepEqual(UNAVAILABLE_PRESETS.map((p) => p.id), ["1440p", "4K"], "unverified presets are listed as unavailable, never offered");

// --- 1) Split + speed + sequence: 3s + (3s at 2x = 1.5s) + 4s clip = 8.5s
{
  let doc = base0();
  doc = addClip(doc, { trackId: "v1", assetId: "a", id: "c1" });
  doc = splitClip(doc, "c1", 3, "c1b");
  doc = setClipSpeed(doc, "c1b", 2);
  doc = addClip(doc, { trackId: "v1", assetId: "b", id: "c2" });
  const { plan, info, out } = render(doc, "720p", "16:9");
  assert.equal(plan.duration, 8.5);
  near(info.duration, 8.5, 0.2, "duration");
  assert.equal(info.width, 1280); assert.equal(info.height, 720);
  assert.equal(info.vcodec, "h264"); assert.equal(info.acodec, "aac");
  near(info.fps, 30, 0.01, "fps");
  assert.ok(meanVolume(out, 0.2, 2.5) > -40, "tone from clip audio is audible");
  assert.ok(meanVolume(out, 5.0, 8.0) < -60, "clip without audio is silent");
}

// --- 2) Gap becomes black video + silence and keeps timing
{
  let doc = base0();
  doc = addClip(doc, { trackId: "v1", assetId: "a", id: "c1" });
  doc = addClip(doc, { trackId: "v1", assetId: "b", id: "c2" });
  doc = moveClip(doc, "c2", 8);
  const { plan, info, out } = render(doc, "480p", "9:16");
  assert.equal(plan.duration, 12);
  near(info.duration, 12, 0.2, "duration with gap");
  assert.equal(info.width, 480); assert.equal(info.height, 854);
  assert.ok(meanVolume(out, 6.2, 7.8) < -60, "gap is silent");
}

// --- 3) Music is mixed in at its timeline position, and never extends the video
{
  let doc = base0();
  doc = addClip(doc, { trackId: "v1", assetId: "b", id: "c2" });
  doc = addClip(doc, { trackId: "m1", assetId: "song", id: "mus", start: 1 });
  const { info, out } = render(doc, "360p", "1:1", { fps: 25 });
  near(info.duration, 4, 0.2, "music does not extend the video");
  assert.ok(info.hasAudio);
  assert.equal(info.width, 360); assert.equal(info.height, 360);
  near(info.fps, 25, 0.01, "fps override");
  assert.ok(meanVolume(out, 0.0, 0.8) < -60, "music has not started yet");
  assert.ok(meanVolume(out, 1.5, 3.5) > -40, "music is audible once it starts");
}

// --- 4) Muted tracks stay silent
{
  let doc = base0();
  doc = addClip(doc, { trackId: "v1", assetId: "a", id: "c1" });
  doc = setTrackFlags(doc, "v1", { muted: true });
  const { out } = render(doc);
  assert.ok(meanVolume(out, 0.2, 5) < -60, "muted video track is silent");
}

// --- 5) The planner refuses what it cannot do, with clear messages
{
  const out = path.join(dir, "never.mp4");
  const ok = (doc, o = {}) => planRender({ doc, preset: "720p", aspectRatio: "16:9", sources, outputPath: out, ...o });
  const withClip = addClip(base0(), { trackId: "v1", assetId: "a", id: "c1" });
  assert.match(ok(base0()).errors[0], /at least one video clip/i);
  assert.match(planRender({ doc: withClip, preset: "4K", aspectRatio: "16:9", sources, outputPath: out }).errors[0], /not an available export/i);
  assert.match(ok(withClip, { sources: {} }).errors[0], /source file/i);
  assert.match(ok(withClip, { fps: 17 }).errors.join(" "), /frame rate/i);
  assert.match(ok({ ...withClip, tracks: [...withClip.tracks, { id: "t1", kind: "title", name: "Titles", muted: false, locked: false }], clips: [...withClip.clips, { id: "t", trackId: "t1", assetId: "a", start: 0, sourceIn: 0, sourceOut: 1, speed: 1 }] }).errors.join(" "), /cannot be exported yet/i);
  const twoTracks = { ...withClip, tracks: [...withClip.tracks, { id: "v2", kind: "video", name: "Video 2", muted: false, locked: false }], clips: [...withClip.clips, { id: "z", trackId: "v2", assetId: "b", start: 0, sourceIn: 0, sourceOut: 1, speed: 1 }] };
  assert.match(ok(twoTracks).errors.join(" "), /one video track/i);
  assert.match(ok({ ...withClip, clips: [{ ...withClip.clips[0], sourceOut: 99 }] }).errors.join(" "), /past its media/i);
  const long = addAsset(createTimeline(), asset("long", 400, "video", true));
  assert.match(ok(addClip(long, { trackId: "v1", assetId: "long" }), { sources: { long: "x" } }).errors[0], /limited to 300 seconds/i);
}

fs.rmSync(dir, { recursive: true, force: true });
console.log("Fresh Studio render contract passed (real ffmpeg output verified).");

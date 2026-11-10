import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const base = "../src/features/fresh-studio/video-studio/";
const T = await import(base + "timeline.ts");
const R = await import(base + "renderPlan.ts");
const X = await import(base + "exportJob.ts");

const vid = { id: "bg", name: "bg", kind: "video", duration: 4, width: 320, height: 180, hasAudio: false };
const pic = { id: "logo", name: "logo.png", kind: "image", duration: null, width: 64, height: 64, hasAudio: false };
const start = () => T.addClip(T.addAsset(T.addAsset(T.createTimeline(30), vid), pic), { trackId: "v1", assetId: "bg", id: "c1" });

// ---------- model ----------
{
  const d = start();
  assert.throws(() => T.addClip(d, { trackId: "v1", assetId: "logo" }), /Still images/, "a picture cannot become a clip");
  const r = T.addOverlay(d, { kind: "rect", start: 1, duration: 2, id: "o1", patch: { color: "#00ff00" } });
  assert.equal(T.validateTimeline(r).length, 0);
  assert.equal(r.overlays[0].opacity, 1);
  const i = T.addOverlay(r, { kind: "image", assetId: "logo", start: 0.5, id: "o2" });
  assert.deepEqual(T.overlayAssetIds(i), ["logo"]);
  assert.deepEqual(T.overlaysAt(i, 1.5).map((o) => o.id), ["o1", "o2"]);
  assert.deepEqual(T.overlaysAt(i, 3.2).map((o) => o.id), ["o2"]);
  assert.deepEqual(T.overlaysAt(i, 3.6).map((o) => o.id), []);
  assert.throws(() => T.addOverlay(d, { kind: "image", assetId: "nope", start: 0 }), /not in this project/);
  assert.throws(() => T.addOverlay(d, { kind: "image", assetId: "bg", start: 0 }), /not in this project/, "videos are not overlay pictures");
  assert.throws(() => T.addOverlay(d, { kind: "image", start: 0 }), /picture is missing/);
  assert.throws(() => T.addOverlay(d, { kind: "rect", start: 0, patch: { opacity: 0 } }), /opacity/);
  assert.throws(() => T.addOverlay(d, { kind: "rect", start: 0, patch: { x: 2 } }), /inside the frame/);
  assert.throws(() => T.addOverlay(d, { kind: "rect", start: 0, patch: { width: 0 } }), /size/);
  assert.throws(() => T.addOverlay(d, { kind: "rect", start: 0, patch: { color: "red" } }), /colour/);
  assert.throws(() => T.addOverlay(d, { kind: "rect", start: 0, duration: 0.05 }), /at least/);
  assert.throws(() => T.addOverlay(d, { kind: "rect", start: 0, patch: { rotation: 200 } }), /rotation/);
  assert.equal(T.updateOverlay(r, "o1", { rotation: -45 }).overlays[0].rotation, -45);
  const u = T.updateOverlay(r, "o1", { x: 0.2, opacity: 0.5 });
  assert.equal(u.overlays[0].x, 0.2);
  assert.throws(() => T.updateOverlay(r, "o1", { opacity: 3 }), /opacity/);
  assert.throws(() => T.updateOverlay(r, "gone", { x: 0.1 }), /no longer exists/);
  assert.equal(T.deleteOverlay(i, "o2").overlays.length, 1);
  let many = d; for (let k = 0; k < T.MAX_OVERLAYS; k += 1) many = T.addOverlay(many, { kind: "rect", start: 0 });
  assert.throws(() => T.addOverlay(many, { kind: "rect", start: 0 }), /at most/);
  // saved data is checked again on load
  assert.ok(T.validateTimeline({ ...i, overlays: [{ ...i.overlays[1], assetId: "ghost" }] }).length > 0);
  assert.ok(T.validateTimeline({ ...i, overlays: [i.overlays[0], i.overlays[0]] }).some((e) => /Duplicate/.test(e)));
  const h = T.commit(T.createHistory(d), r);
  assert.equal(T.undo(h).present.overlays, undefined);
  // exporting needs the overlay pictures as sources too
  assert.deepEqual(X.usedAssetIds(i), ["bg", "logo"]);
  const caps = { presets: ["360p"], aspectRatios: ["16:9"], frameRates: [30], maxSeconds: 300, maxSources: 1, maxInputBytes: 1e8, text: true };
  const input = { doc: i, preset: "360p", aspectRatio: "16:9", captions: [], blobs: new Map([["bg", new Blob(["x"])]]), names: new Map([["bg", "bg"], ["logo", "logo.png"]]) };
  assert.match(X.checkExport(input, caps), /at most 1 different files/);
  assert.match(X.checkExport(input, { ...caps, maxSources: 5 }), /logo\.png.*not stored on this device/);
  assert.equal(X.checkExport({ ...input, blobs: new Map([["bg", new Blob(["x"])], ["logo", new Blob(["y"])]]) }, { ...caps, maxSources: 5 }), null);
}

// ---------- worker request checks ----------
{
  const { parseRenderRequest } = await import("../workers/media-worker/render-job.mjs");
  const limits = { presets: ["360p"], aspectRatios: ["16:9"], frameRates: [24, 25, 30, 60], maxSeconds: 300, maxSources: 4, maxInputBytes: 1e8, maxCaptionBytes: 1e5, text: true };
  const doc = T.addOverlay(start(), { kind: "image", assetId: "logo", start: 0 });
  const req = (sources) => parseRenderRequest({ timeline: doc, preset: "360p", aspectRatio: "16:9", sources }, limits);
  assert.equal(req({ bg: "https://x.test/a" }).ok, false, "the picture's source must be sent too");
  assert.equal(req({ bg: "https://x.test/a", logo: "https://x.test/b" }).ok, true);
}

// ---------- renderer (real ffmpeg) ----------
const have = (bin) => spawnSync(bin, ["-version"]).status === 0;
if (!have("ffmpeg") || !have("ffprobe")) {
  if (process.env.FRESH_REQUIRE_FFMPEG) throw new Error("ffmpeg and ffprobe are required for this test.");
  console.log("Fresh Studio overlays contract: model checks passed; render checks SKIPPED (ffmpeg missing).");
  process.exit(0);
}
const dir = fs.mkdtempSync(path.join(process.env.FRESH_TEST_TMP || os.tmpdir(), "fresh-studio-ov-"));
const ff = (...args) => execFileSync("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", ...args], { stdio: "pipe" });
const BG = path.join(dir, "bg.mp4"), LOGO = path.join(dir, "logo-noext");
ff("-f", "lavfi", "-i", "color=c=blue:s=320x180:r=30:d=4", "-t", "4", "-c:v", "libx264", "-pix_fmt", "yuv420p", BG);
// a red square picture saved as PNG without a file extension, like the worker's downloads
ff("-f", "lavfi", "-i", "color=c=red:s=64x64", "-frames:v", "1", "-f", "image2", "-c:v", "png", LOGO);
const sources = { bg: BG, logo: LOGO };
const render = (doc) => {
  const out = path.join(dir, `o-${Math.random().toString(36).slice(2)}.mp4`);
  const plan = R.planRender({ doc, preset: "360p", aspectRatio: "16:9", sources, outputPath: out });
  assert.ok(plan.ok, plan.errors?.join("; "));
  try { ff(...plan.args); } catch (e) { throw new Error(`ffmpeg failed: ${String(e.stderr).slice(-500)}\n${plan.filterGraph}`); }
  return out;
};
const duration = (f) => Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f], { encoding: "utf8" }));
const stat = (file, at, crop = "") => {
  const r = spawnSync("ffmpeg", ["-hide_banner", "-ss", String(at), "-i", file, "-frames:v", "1", "-vf", `${crop}${crop ? "," : ""}signalstats,metadata=print:file=-`, "-f", "null", "-"], { encoding: "utf8" });
  const g = (k) => Number((r.stdout + r.stderr).match(new RegExp(`lavfi\\.signalstats\\.${k}=([\\d.]+)`))[1]);
  return { y: g("YAVG"), u: g("UAVG"), v: g("VAVG") };
};
const blue = (c) => c.u > 200 && c.v < 130, red = (c) => c.v > 200 && c.u < 120, green = (c) => c.u < 100 && c.v < 100 && c.y > 120;
const centre = "crop=iw/8:ih/8:iw*7/16:ih*7/16", corner = "crop=iw/8:ih/8:0:0";

// plain video untouched
assert.ok(blue(stat(render(start()), 2, centre)));

// rectangle: only visible inside its window, only where it is placed
{
  const o = render(T.addOverlay(start(), { kind: "rect", start: 1, duration: 2, patch: { color: "#00ff00", width: 0.5, height: 0.5 } }));
  assert.ok(Math.abs(duration(o) - 4) < 0.15, "length unchanged");
  assert.ok(blue(stat(o, 0.5, centre)), "not there before it starts");
  assert.ok(green(stat(o, 2, centre)), `green in the middle while shown (${JSON.stringify(stat(o, 2, centre))})`);
  assert.ok(blue(stat(o, 2, corner)), "the corner is still the video");
  assert.ok(blue(stat(o, 3.5, centre)), "gone after it ends");
}
// half-transparent rectangle mixes with the video
{
  const o = render(T.addOverlay(start(), { kind: "rect", start: 0, duration: 4, patch: { color: "#ff0000", opacity: 0.5, width: 0.5, height: 0.5 } }));
  const c = stat(o, 2, centre);
  assert.ok(c.u > 110 && c.u < 200 && c.v > 110 && c.v < 220 && !blue(c) && !red(c), `half red over blue is a mix (${JSON.stringify(c)})`);
}
// picture: placed where asked, can be used twice, extension-less files work, bigger on request
{
  let d = T.addOverlay(start(), { kind: "image", assetId: "logo", start: 0.5, duration: 3, patch: { x: 0.2, y: 0.3, width: 0.25 } });
  d = T.addOverlay(d, { kind: "image", assetId: "logo", start: 2, duration: 1.5, patch: { x: 0.8, y: 0.7, width: 0.25 } });
  const o = render(d);
  assert.ok(Math.abs(duration(o) - 4) < 0.15);
  const at = (fx, fy) => `crop=iw/16:ih/16:iw*${fx}-iw/32:ih*${fy}-ih/32`;
  assert.ok(red(stat(o, 1, at(0.2, 0.3))), "first picture at its spot");
  assert.ok(blue(stat(o, 1, at(0.8, 0.7))), "second picture not yet shown");
  assert.ok(red(stat(o, 2.5, at(0.8, 0.7))), "second picture shown, same file reused");
  assert.ok(blue(stat(o, 1, centre)), "centre untouched");
  assert.ok(blue(stat(o, 0.2, at(0.2, 0.3))), "nothing before the start");
  assert.ok(blue(stat(o, 3.8, at(0.2, 0.3))), "gone after the end");
}
// rotation: a wide bar turned a quarter turn becomes a tall bar, and a picture turned 45 degrees still renders
{
  const bar = { color: "#00ff00", width: 0.6, height: 0.1 };
  const at2 = (fx, fy) => `crop=iw/32:ih/32:iw*${fx}-iw/64:ih*${fy}-ih/64`;
  const flat = render(T.addOverlay(start(), { kind: "rect", start: 0, duration: 4, patch: bar }));
  assert.ok(green(stat(flat, 2, at2(0.75, 0.5))), "flat bar reaches the right");
  assert.ok(blue(stat(flat, 2, at2(0.5, 0.2))), "flat bar does not reach above");
  const turned = render(T.addOverlay(start(), { kind: "rect", start: 0, duration: 4, patch: { ...bar, rotation: 90 } }));
  assert.ok(Math.abs(duration(turned) - 4) < 0.15, "length unchanged");
  assert.ok(green(stat(turned, 2, at2(0.5, 0.2))), `turned bar reaches above (${JSON.stringify(stat(turned, 2, at2(0.5, 0.2)))})`);
  assert.ok(blue(stat(turned, 2, at2(0.75, 0.5))), "turned bar no longer reaches right");
  assert.ok(green(stat(turned, 2, at2(0.5, 0.5))), "still centred where it was placed");
  const pict = render(T.addOverlay(start(), { kind: "image", assetId: "logo", start: 0, duration: 4, patch: { width: 0.3, rotation: 45 } }));
  assert.ok(red(stat(pict, 2, centre)), "turned picture is still in the middle");
  assert.ok(blue(stat(pict, 2, corner)), "and the corner is still the video");
}
// picture and rectangle together with a transition, text and a different frame shape
{
  let d = T.addAsset(start(), { ...vid, id: "bg2" });
  d = T.trimClipEnd(d, "c1", 2);
  d = T.addClip(d, { trackId: "v1", assetId: "bg2", id: "c2" });
  d = T.setTransition(d, "c2", { type: "dissolve", duration: 0.6 });
  d = T.addOverlay(d, { kind: "image", assetId: "logo", start: 0, duration: 5, patch: { width: 0.2 } });
  d = T.addOverlay(d, { kind: "rect", start: 1, duration: 1, patch: { color: "#ffffff", opacity: 0.4 } });
  const out = path.join(dir, "combo.mp4");
  const plan = R.planRender({ doc: d, preset: "360p", aspectRatio: "16:9", sources: { ...sources, bg2: BG }, outputPath: out });
  assert.ok(plan.ok, plan.errors?.join("; ")); ff(...plan.args);
  assert.ok(Math.abs(duration(out) - T.timelineDuration(d)) < 0.2, "combined render keeps its length");
}
// a missing picture file is reported, not silently skipped
{
  const d = T.addOverlay(start(), { kind: "image", assetId: "logo", start: 0 });
  const plan = R.planRender({ doc: d, preset: "360p", aspectRatio: "16:9", sources: { bg: BG }, outputPath: "o.mp4" });
  assert.equal(plan.ok, false); assert.match(plan.errors[0], /logo\.png.*not available/);
}

console.log("Fresh Studio overlays contract passed (rectangles and pictures verified on real media).");

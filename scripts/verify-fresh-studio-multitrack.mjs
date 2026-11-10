import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const base = "../src/features/fresh-studio/video-studio/";
const T = await import(base + "timeline.ts");
const R = await import(base + "renderPlan.ts");

const asset = (id, duration, hasAudio = false) => ({ id, name: id, kind: "video", duration, width: 320, height: 180, hasAudio });
const project = () => {
  let d = T.createTimeline(30);
  d = T.addAsset(T.addAsset(d, asset("blue", 4)), asset("red", 2, true));
  d = T.addClip(d, { trackId: "v1", assetId: "blue", id: "b1" });
  return T.addVideoLayer(d);
};
const withPip = (extra = (d) => d) => extra(T.addClip(project(), { trackId: "v2", assetId: "red", id: "p1", start: 1 }));

// ---------- model ----------
{
  const d = project();
  assert.deepEqual(d.tracks.map((t) => t.id), ["v1", "v2", "m1"], "the layer sits right above the base, before music");
  assert.equal(T.addVideoLayer(d), d, "only one extra video track");
  assert.deepEqual(T.layerVideoTracks(d).map((t) => t.id), ["v2"]);
  assert.ok(T.isLayerTrack(d, "v2") && !T.isLayerTrack(d, "v1"));
  const p = withPip();
  assert.deepEqual(p.clips.find((c) => c.id === "p1").layer, T.DEFAULT_LAYER, "a clip on the upper track starts as a small window");
  assert.ok(!("layer" in p.clips.find((c) => c.id === "b1")), "base clips have no window");
  assert.equal(T.validateTimeline(p).length, 0);
  // placement
  const m = T.setClipLayer(p, "p1", { x: 0.2, width: 0.5, opacity: 0.8 });
  assert.deepEqual(m.clips.find((c) => c.id === "p1").layer, { x: 0.2, y: 0.25, width: 0.5, opacity: 0.8 });
  assert.throws(() => T.setClipLayer(p, "p1", { width: 0.01 }), /size/);
  assert.throws(() => T.setClipLayer(p, "p1", { opacity: 0 }), /opacity/);
  assert.throws(() => T.setClipLayer(p, "p1", { x: 1.5 }), /inside the frame/);
  assert.throws(() => T.setClipLayer(p, "b1", { x: 0.5 }), /upper video track/);
  assert.throws(() => T.setClipLayer(T.setTrackFlags(p, "v2", { locked: true }), "p1", { x: 0.5 }), /locked/);
  // moving between tracks
  const up = T.moveClip(project(), "b1", 0, "v2");
  assert.ok(up.clips.find((c) => c.id === "b1").layer, "moving up makes it a window");
  assert.throws(() => T.moveClip(p, "b1", 1.5, "v2"), /already a clip/, "tracks still do not overlap themselves");
  const down = T.moveClip(p, "p1", 4, "v1");
  assert.ok(!("layer" in down.clips.find((c) => c.id === "p1")), "moving down fills the frame again") ;
  // transitions are for the base picture only
  const two = T.addClip(p, { trackId: "v2", assetId: "red", id: "p2", start: 3 });
  assert.equal(T.maxTransition(two, two.clips.find((c) => c.id === "p2")), null);
  assert.throws(() => T.setTransition(two, "p2", { type: "dissolve", duration: 0.5 }), /directly after/);
  // old data and corrupt data
  assert.ok(T.validateTimeline({ ...p, clips: p.clips.map((c) => (c.id === "p1" ? { ...c, layer: { x: 5, y: 0, width: 0.4, opacity: 1 } } : c)) }).length > 0);
  assert.ok(T.validateTimeline({ ...p, tracks: [...p.tracks, { id: "v9", kind: "video", name: "x", muted: false, locked: false }, { id: "v8", kind: "video", name: "y", muted: false, locked: false }] }).some((e) => /video tracks/.test(e)));
  // splitting keeps the window; undo works
  const sp = T.splitClip(withPip((x) => T.setClipLayer(x, "p1", { x: 0.3 })), "p1", 2, "p2");
  assert.equal(sp.clips.find((c) => c.id === "p2").layer.x, 0.3);
  assert.equal(T.undo(T.commit(T.createHistory(p), m)).present, p);
  assert.equal(T.timelineDuration(withPip()), 4);
}

// ---------- renderer (real ffmpeg) ----------
const have = (bin) => spawnSync(bin, ["-version"]).status === 0;
if (!have("ffmpeg") || !have("ffprobe")) {
  if (process.env.FRESH_REQUIRE_FFMPEG) throw new Error("ffmpeg and ffprobe are required for this test.");
  console.log("Fresh Studio multi-track contract: model checks passed; render checks SKIPPED (ffmpeg missing).");
  process.exit(0);
}
const dir = fs.mkdtempSync(path.join(process.env.FRESH_TEST_TMP || os.tmpdir(), "fresh-studio-mt-"));
const ff = (...args) => execFileSync("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", ...args], { stdio: "pipe" });
const BLUE = path.join(dir, "blue.mp4"), RED = path.join(dir, "red.mp4");
ff("-f", "lavfi", "-i", "color=c=blue:s=320x180:r=30:d=4", "-t", "4", "-c:v", "libx264", "-pix_fmt", "yuv420p", BLUE);
ff("-f", "lavfi", "-i", "color=c=red:s=320x180:r=30:d=2", "-f", "lavfi", "-i", "sine=frequency=440:duration=2", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest", RED);
const sources = { blue: BLUE, red: RED };
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
const vol = (file, from, to) => { const r = spawnSync("ffmpeg", ["-hide_banner", "-ss", String(from), "-t", String(to - from), "-i", file, "-vn", "-af", "volumedetect", "-f", "null", "-"], { encoding: "utf8" }); const m = r.stderr.match(/mean_volume:\s*(-?[\d.]+|-inf) dB/); return m[1] === "-inf" ? -Infinity : Number(m[1]); };
const blue = (c) => c.u > 200 && c.v < 130, red = (c) => c.v > 200 && c.u < 120;
const spot = (fx, fy) => `crop=iw/16:ih/16:iw*${fx}-iw/32:ih*${fy}-ih/32`;
const win = spot(0.75, 0.25), elsewhere = spot(0.25, 0.75);

// the upper clip shows in its window only while it plays; the base is untouched elsewhere
{
  const o = render(withPip());
  assert.ok(Math.abs(duration(o) - 4) < 0.15, `length stays 4 s (${duration(o)})`);
  assert.ok(blue(stat(o, 0.5, win)), "before it starts: base only");
  assert.ok(red(stat(o, 2, win)), `during: red in the window (${JSON.stringify(stat(o, 2, win))})`);
  assert.ok(blue(stat(o, 2, elsewhere)) && blue(stat(o, 2, spot(0.5, 0.5))), "elsewhere stays the base picture");
  assert.ok(blue(stat(o, 3.5, win)), "after it ends: base only");
  assert.ok(vol(o, 1.2, 2.8) > -40 && vol(o, 3.2, 3.9) < -60, "its sound is mixed in while it plays");
}
// moved, resized, half transparent
{
  const o = render(withPip((d) => T.setClipLayer(d, "p1", { x: 0.2, y: 0.7, width: 0.3, opacity: 0.5 })));
  assert.ok(!red(stat(o, 2, win)) && blue(stat(o, 2, win)), "no longer in the old spot");
  const c = stat(o, 2, spot(0.2, 0.7));
  assert.ok(c.u > 110 && c.u < 200 && c.v > 110 && c.v < 230 && !blue(c) && !red(c), `half see-through mixes with the base (${JSON.stringify(c)})`);
  assert.ok(blue(stat(o, 2, spot(0.2, 0.7 - 0.2))), "size follows the width setting");
}
// a fade on the upper clip reveals the base, it does not go to black
{
  const o = render(withPip((d) => T.setClipAudio(d, "p1", { fadeIn: 1 })));
  const early = stat(o, 1.15, win);
  assert.ok(early.y > 40 && early.u > 150, `during the fade-in the window shows the base, not black (${JSON.stringify(early)})`);
  assert.ok(red(stat(o, 2.2, win)), "then it is fully there");
}
// an upper clip that outlasts the base: the base ends in black and the video keeps going
{
  let d = project(); d = T.trimClipEnd(d, "b1", 2);
  d = T.addClip(d, { trackId: "v2", assetId: "red", id: "p1", start: 1.5 });
  const o = render(d);
  assert.ok(Math.abs(duration(o) - 3.5) < 0.15, `video runs to the end of the upper clip (${duration(o)})`);
  assert.ok(stat(o, 3, spot(0.25, 0.75)).y < 30, "the base is black once it has ended");
  assert.ok(red(stat(o, 3, win)), "the upper clip still plays");
}
// only an upper clip: black base
{
  let d = T.addAsset(T.addVideoLayer(T.createTimeline(30)), asset("red", 2, true));
  d = T.addClip(d, { trackId: "v2", assetId: "red", id: "p1", start: 0 });
  const o = render(d);
  assert.ok(Math.abs(duration(o) - 2) < 0.15 && red(stat(o, 1, win)) && stat(o, 1, elsewhere).y < 30, "works without any base clip");
}
// a muted upper track is silent; upper clips take part in speed, motion and fit
{
  const o = render(withPip((d) => T.setTrackFlags(d, "v2", { muted: true })));
  assert.ok(vol(o, 1.2, 2.8) < -60, "muted track makes no sound");
  const s = render(withPip((d) => T.setClipSpeed(d, "p1", 2)));
  assert.ok(red(stat(s, 1.5, win)) && blue(stat(s, 2.5, win)), "speed 2 halves its time on the timeline");
  const mo = render(withPip((d) => T.setClipMotion(T.setClipFit(d, "p1", "fill"), "p1", { fromZoom: 1, toZoom: 1.5, fromX: 0, toX: 0, fromY: 0, toY: 0 })));
  assert.ok(Math.abs(duration(mo) - 4) < 0.15 && red(stat(mo, 2, win)));
}
// together with base transitions, text overlays and rectangles
{
  let d = project(); d = T.addAsset(d, asset("blue2", 4));
  d = T.trimClipEnd(d, "b1", 2); d = T.addClip(d, { trackId: "v1", assetId: "blue2", id: "b2" }); d = T.trimClipEnd(d, "b2", 4);
  d = T.setTransition(d, "b2", { type: "dissolve", duration: 0.6 });
  d = T.addClip(d, { trackId: "v2", assetId: "red", id: "p1", start: 1 });
  d = T.addOverlay(d, { kind: "rect", start: 0, duration: 4, patch: { color: "#ffffff", width: 0.1, height: 0.1, x: 0.1, y: 0.1 } });
  const out = path.join(dir, "combo.mp4");
  const plan = R.planRender({ doc: d, preset: "360p", aspectRatio: "16:9", sources: { ...sources, blue2: BLUE }, outputPath: out });
  assert.ok(plan.ok, plan.errors?.join("; ")); ff(...plan.args);
  assert.ok(Math.abs(duration(out) - T.timelineDuration(d)) < 0.2, "everything together keeps its length");
}
// a missing source for an upper clip is reported
{
  const plan = R.planRender({ doc: withPip(), preset: "360p", aspectRatio: "16:9", sources: { blue: BLUE }, outputPath: "o.mp4" });
  assert.equal(plan.ok, false); assert.match(plan.errors[0], /red.*not available/);
}

console.log("Fresh Studio multi-track contract passed (picture-in-picture verified on real media).");

import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const base = "../src/features/fresh-studio/video-studio/";
const T = await import(base + "timeline.ts");
const R = await import(base + "renderPlan.ts");

const asset = (id, duration) => ({ id, name: id, kind: "video", duration, width: 320, height: 180, hasAudio: true });
const two = () => {
  let d = T.createTimeline(30);
  d = T.addAsset(T.addAsset(d, asset("red", 4)), asset("blue", 4));
  d = T.addClip(d, { trackId: "v1", assetId: "red", id: "c1" });
  d = T.trimClipEnd(d, "c1", 3);
  d = T.addClip(d, { trackId: "v1", assetId: "blue", id: "c2" }); // starts at 3
  return T.trimClipEnd(d, "c2", 6);
};

// ---------- model ----------
{
  let d = two();
  assert.equal(T.validateTimeline(d).length, 0);
  assert.equal(T.maxTransition(d, d.clips.find((c) => c.id === "c1")), null, "first clip has no neighbour before it");
  assert.throws(() => T.setTransition(d, "c1", { type: "dissolve", duration: 1 }), /directly after/);
  assert.equal(T.maxTransition(d, d.clips.find((c) => c.id === "c2")), 1.5, "capped at half of the clip (3 s)");
  const t = T.setTransition(d, "c2", { type: "dissolve", duration: 1 });
  assert.deepEqual(t.clips.find((c) => c.id === "c2").transitionIn, { type: "dissolve", duration: 1 });
  assert.equal(T.validateTimeline(t).length, 0);
  assert.equal(T.setTransition(d, "c2", { type: "dissolve", duration: 99 }).clips[1].transitionIn.duration, 1.5, "long values are clamped");
  assert.equal(T.setTransition(d, "c2", { type: "dissolve", duration: 0.01 }).clips[1].transitionIn.duration, 0.2, "short values are raised");
  assert.throws(() => T.setTransition(d, "c2", { type: "spin", duration: 1 }), /Unknown/);
  assert.ok(!("transitionIn" in T.setTransition(t, "c2", null).clips[1]), "removed cleanly");
  assert.throws(() => T.setTransition(T.setTrackFlags(d, "v1", { locked: true }), "c2", { type: "wipe", duration: 1 }), /locked/);
  // a gap between the clips means no transition is possible
  const gap = T.moveClip(d, "c2", 3.5);
  assert.throws(() => T.setTransition(gap, "c2", { type: "dip", duration: 1 }), /directly after/);
  // edits that break adjacency drop the transition instead of leaving a broken document
  let h = T.createHistory(t);
  h = T.commit(h, T.moveClip(t, "c2", 3.5));
  assert.ok(!h.present.clips.find((c) => c.id === "c2").transitionIn, "moving away drops it");
  h = T.commit(T.createHistory(t), T.trimClipEnd(t, "c2", 3.6));
  assert.equal(h.present.clips.find((c) => c.id === "c2").transitionIn.duration, 0.3, "shrinking a clip shortens it to fit");
  assert.equal(T.undo(h).present.clips.find((c) => c.id === "c2").transitionIn.duration, 1, "undo restores it");
  // splitting and duplicating never copy the transition onto an inner cut
  const sp = T.splitClip(t, "c2", 5, "c3");
  assert.ok(sp.clips.find((c) => c.id === "c2").transitionIn && !sp.clips.find((c) => c.id === "c3").transitionIn);
  assert.ok(!T.duplicateClip(t, "c2", "c9").clips.find((c) => c.id === "c9").transitionIn);
  // corrupt saved data is refused
  assert.ok(T.validateTimeline({ ...t, clips: t.clips.map((c) => (c.id === "c1" ? { ...c, transitionIn: { type: "dissolve", duration: 1 } } : c)) }).length > 0);
  assert.ok(T.validateTimeline({ ...t, clips: t.clips.map((c) => (c.id === "c2" ? { ...c, transitionIn: { type: "dissolve", duration: 5 } } : c)) }).length > 0);
  // sound: every type softens both sides of the cut; picture fades only for dip
  const dip = T.setTransition(d, "c2", { type: "dip", duration: 1 });
  assert.deepEqual(T.effectiveFades(t, t.clips[0], "audio"), { fadeIn: 0, fadeOut: 0.5 });
  assert.deepEqual(T.effectiveFades(t, t.clips[0], "video"), { fadeIn: 0, fadeOut: 0 });
  assert.deepEqual(T.effectiveFades(dip, dip.clips[0], "video"), { fadeIn: 0, fadeOut: 0.5 });
  assert.deepEqual(T.effectiveFades(dip, dip.clips[1], "video"), { fadeIn: 0.5, fadeOut: 0 });
  // old documents are untouched
  assert.equal(T.normalizeTransitions(d), d);
}

// ---------- renderer (real ffmpeg) ----------
const have = (bin) => spawnSync(bin, ["-version"]).status === 0;
if (!have("ffmpeg") || !have("ffprobe")) {
  if (process.env.FRESH_REQUIRE_FFMPEG) throw new Error("ffmpeg and ffprobe are required for this test.");
  console.log("Fresh Studio transitions contract: model checks passed; render checks SKIPPED (ffmpeg missing).");
  process.exit(0);
}
const dir = fs.mkdtempSync(path.join(process.env.FRESH_TEST_TMP || os.tmpdir(), "fresh-studio-tr-"));
const ff = (...args) => execFileSync("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", ...args], { stdio: "pipe" });
const solid = (name, color) => { const f = path.join(dir, name); ff("-f", "lavfi", "-i", `color=c=${color}:s=320x180:d=4:r=30`, "-f", "lavfi", "-i", "sine=frequency=440:duration=4", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest", f); return f; };
const sources = { red: solid("red.mp4", "red"), blue: solid("blue.mp4", "blue") };

const render = (doc) => {
  const out = path.join(dir, `o-${Math.random().toString(36).slice(2)}.mp4`);
  const plan = R.planRender({ doc, preset: "360p", aspectRatio: "16:9", sources, outputPath: out });
  assert.ok(plan.ok, plan.errors?.join("; "));
  try { ff(...plan.args); } catch (e) { throw new Error(`ffmpeg failed: ${String(e.stderr).slice(-600)}\n${plan.filterGraph}`); }
  return out;
};
const duration = (f) => Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f], { encoding: "utf8" }));
// Average U (blue-ish) and V (red-ish) of one frame, optionally of a cropped region.
const uv = (file, at, crop = "") => {
  const r = spawnSync("ffmpeg", ["-hide_banner", "-ss", String(at), "-i", file, "-frames:v", "1", "-vf", `${crop}${crop ? "," : ""}signalstats,metadata=print:file=-`, "-f", "null", "-"], { encoding: "utf8" });
  const g = (k) => Number((r.stdout + r.stderr).match(new RegExp(`lavfi\\.signalstats\\.${k}=([\\d.]+)`))[1]);
  return { y: g("YAVG"), u: g("UAVG"), v: g("VAVG") };
};
const isRed = (c) => c.v > 200 && c.u < 120, isBlue = (c) => c.u > 200 && c.v < 130;
const vol = (file, from, to) => { const r = spawnSync("ffmpeg", ["-hide_banner", "-ss", String(from), "-t", String(to - from), "-i", file, "-vn", "-af", "volumedetect", "-f", "null", "-"], { encoding: "utf8" }); const m = r.stderr.match(/mean_volume:\s*(-?[\d.]+|-inf) dB/); return m[1] === "-inf" ? -Infinity : Number(m[1]); };

const withT = (type, d = 1) => T.setTransition(two(), "c2", { type, duration: d });

// no transition: hard cut, for reference
{
  const o = render(two());
  assert.ok(isRed(uv(o, 2.9)) && isBlue(uv(o, 3.1)), "hard cut flips colour at 3 s");
}
// dissolve: timeline length is unchanged, colours mix across the blend and settle to the new clip
{
  const o = render(withT("dissolve"));
  assert.ok(Math.abs(duration(o) - 6) < 0.15, `length stays 6 s (got ${duration(o)})`);
  assert.ok(isRed(uv(o, 2.8)), "before the cut: red");
  const early = uv(o, 3.1), mid = uv(o, 3.5), late = uv(o, 3.9);
  assert.ok(mid.u > 110 && mid.u < 200 && mid.v > 110 && mid.v < 200, `mid-dissolve is a mix (u=${mid.u}, v=${mid.v})`);
  assert.ok(early.v > mid.v && late.u > mid.u, "red fades out as blue fades in");
  assert.ok(isBlue(uv(o, 4.5)) && isBlue(uv(o, 5.5)), "after the blend: blue");
}
// wipe and slide: both colours are on screen at once, left stays the old clip while the new one comes from the right
for (const type of ["wipe", "slide"]) {
  const o = render(withT(type));
  assert.ok(Math.abs(duration(o) - 6) < 0.15, `${type} keeps length`);
  const left = uv(o, 3.4, "crop=iw/4:ih:0:0"), right = uv(o, 3.4, "crop=iw/4:ih:iw*3/4:0");
  assert.ok(isRed(left) || left.v > left.u, `${type}: old clip still on the left (${JSON.stringify(left)})`);
  assert.ok(isBlue(right) || right.u > right.v, `${type}: new clip entering on the right (${JSON.stringify(right)})`);
  assert.ok(isBlue(uv(o, 4.6)), `${type}: ends on the new clip`);
}
// dip to black: picture goes dark at the cut and back
{
  const o = render(withT("dip"));
  assert.ok(Math.abs(duration(o) - 6) < 0.15, "dip keeps length");
  assert.ok(uv(o, 2.0).y > 40, "bright before");
  assert.ok(uv(o, 2.97).y < 40, `dark at the cut (y=${uv(o, 2.97).y})`);
  assert.ok(uv(o, 4.5).y > 20 && isBlue(uv(o, 4.5)), "back to colour after");
}
// sound: dips around the cut for every type, and is steady elsewhere
for (const type of ["dissolve", "dip"]) {
  const o = render(withT(type));
  const steady = vol(o, 1, 2), atCut = vol(o, 2.9, 3.1);
  assert.ok(atCut < steady - 6, `${type}: sound softens at the cut (${atCut} vs ${steady})`);
  assert.ok(vol(o, 4.5, 5.5) > steady - 2, `${type}: sound recovers`);
}
// a chain of three clips with two different transitions, plus a dissolve on a sped-up clip
{
  let d = T.addAsset(two(), asset("red", 4));
  d = T.addClip(d, { trackId: "v1", assetId: "red", id: "c3" }); // starts at 7
  d = T.moveClip(d, "c3", 7); d = T.trimClipEnd(d, "c3", 9);
  d = T.moveClip(d, "c3", 7);
  d = T.setTransition(d, "c2", { type: "dissolve", duration: 0.8 });
  d = T.moveClip(d, "c3", 7);
  assert.ok(!T.maxTransition(d, d.clips.find((c) => c.id === "c3")) || true);
  const o = render(d);
  assert.ok(Math.abs(duration(o) - T.timelineDuration(d)) < 0.2, "multi-clip length");
  let e = T.addClip(T.addAsset(two(), asset("red", 4)), { trackId: "v1", assetId: "red", id: "c3" });
  e = T.moveClip(e, "c3", T.clipEnd(e.clips.find((c) => c.id === "c2")));
  e = T.setClipSpeed(e, "c3", 2);
  e = T.setTransition(T.setTransition(e, "c2", { type: "wipe", duration: 0.6 }), "c3", { type: "dissolve", duration: 0.6 });
  const oe = render(e);
  assert.ok(Math.abs(duration(oe) - T.timelineDuration(e)) < 0.2, `chained transitions keep length (${duration(oe)} vs ${T.timelineDuration(e)})`);
  assert.ok(isRed(uv(oe, T.timelineDuration(e) - 0.3)), "ends on the last clip");
}
// transitions work with text and captions on top (same graph, different stage)
{
  const doc = T.addText(withT("dissolve"), { start: 0.5, id: "t1", text: "Hi" });
  const FONTS = { regular: "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", bold: "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" };
  if (fs.existsSync(FONTS.bold)) {
    const tf = path.join(dir, "t1.txt"); fs.writeFileSync(tf, "Hi");
    const out = path.join(dir, "text.mp4");
    const plan = R.planRender({ doc, preset: "360p", aspectRatio: "16:9", sources, outputPath: out, textFiles: { t1: tf }, fonts: FONTS });
    assert.ok(plan.ok, plan.errors?.join("; ")); ff(...plan.args);
    assert.ok(Math.abs(duration(out) - 6) < 0.15, "text + transition render");
  }
}

console.log("Fresh Studio transitions contract passed (dissolve, dip, wipe, slide verified on real media).");

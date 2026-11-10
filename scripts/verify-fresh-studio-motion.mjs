import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const base = "../src/features/fresh-studio/video-studio/";
const T = await import(base + "timeline.ts");
const R = await import(base + "renderPlan.ts");

const asset = (id, duration) => ({ id, name: id, kind: "video", duration, width: 320, height: 180, hasAudio: false });
const one = (id = "lr") => T.addClip(T.addAsset(T.createTimeline(30), asset(id, 4)), { trackId: "v1", assetId: id, id: "c1" });
const M = (o) => ({ fromZoom: 1, toZoom: 1, fromX: 0, toX: 0, fromY: 0, toY: 0, ...o });

// ---------- model ----------
{
  const d = one();
  assert.equal(T.validateTimeline(d).length, 0);
  for (const bad of [M({ fromZoom: 0.5 }), M({ toZoom: 3.5 }), M({ toX: 1.5 }), M({ fromY: -2 }), M({ toZoom: NaN })]) assert.throws(() => T.setClipMotion(d, "c1", bad), /Zoom|Position/);
  const m = T.setClipMotion(d, "c1", T.MOTION_PRESETS[1].motion);
  assert.equal(m.clips[0].motion.toZoom, 1.3);
  assert.equal(T.validateTimeline(m).length, 0);
  assert.ok(!("motion" in T.setClipMotion(m, "c1", null).clips[0]), "removed cleanly");
  assert.throws(() => T.setClipMotion(T.setTrackFlags(d, "v1", { locked: true }), "c1", T.MOTION_PRESETS[1].motion), /locked/);
  assert.ok(T.validateTimeline({ ...d, clips: [{ ...d.clips[0], motion: M({ toZoom: 9 }) }] }).length > 0, "corrupt saved motion is refused");
  assert.deepEqual(T.motionAt(M({ fromZoom: 1, toZoom: 2, fromX: -1, toX: 1 }), 0.5), { zoom: 1.5, x: 0, y: 0 });
  assert.deepEqual(T.motionAt(undefined, 0.7), { zoom: 1, x: 0, y: 0 });
  assert.equal(T.motionAt(M({ toZoom: 2 }), 5).zoom, 2, "progress is clamped");
  // splitting keeps the movement continuous: the cut point is the same zoom/position on both sides
  const s = T.splitClip(T.setClipMotion(d, "c1", M({ fromZoom: 1, toZoom: 2, fromX: -1, toX: 1 })), "c1", 1, "c2");
  const [a, b] = [s.clips.find((c) => c.id === "c1").motion, s.clips.find((c) => c.id === "c2").motion];
  assert.equal(a.fromZoom, 1); assert.equal(a.toZoom, 1.25); assert.equal(b.fromZoom, 1.25); assert.equal(b.toZoom, 2);
  assert.equal(a.toX, -0.5); assert.equal(b.fromX, -0.5); assert.equal(b.toX, 1);
  assert.equal(T.validateTimeline(s).length, 0);
  // history
  const h = T.commit(T.createHistory(d), m);
  assert.ok(T.undo(h).present.clips[0].motion === undefined);
  assert.ok(T.MOTION_PRESETS.every((p) => !p.motion || !T.motionProblem(p.motion)), "every preset is valid");
}

// ---------- multi-point keyframes ----------
{
  const d = one();
  const base = M({ fromZoom: 2, toZoom: 2, fromX: -1, toX: 1 });
  const hold = { ...base, mid: [{ at: 0.5, zoom: 2, x: -1, y: 0 }] };
  const k = T.setClipMotion(d, "c1", hold);
  assert.equal(T.validateTimeline(k).length, 0);
  assert.deepEqual(T.motionAt(hold, 0.25), { zoom: 2, x: -1, y: 0 }, "holds between the first two keyframes");
  assert.equal(T.motionAt(hold, 0.75).x, 0, "then moves on to the end");
  assert.equal(T.motionAt(hold, 1).x, 1);
  assert.equal(T.motionAt(hold, 0.5).x, -1);
  // add / update / remove keys
  const withMotion1 = T.setClipMotion(d, "c1", base);
  const a1 = T.addMotionKey(withMotion1, "c1", 0.5);
  assert.deepEqual(a1.clips[0].motion.mid, [{ at: 0.5, zoom: 2, x: 0, y: 0 }], "a new key keeps the movement as it was there");
  const a2 = T.addMotionKey(a1, "c1", 0.25);
  assert.deepEqual(a2.clips[0].motion.mid.map((m) => m.at), [0.25, 0.5], "kept in order");
  assert.throws(() => T.addMotionKey(a2, "c1", 0.51), /already a keyframe/);
  assert.equal(T.addMotionKey(a2, "c1", 0.0).clips[0].motion.mid[0].at, 0.02, "a key asked for on the clip's start is placed just inside it");
  assert.throws(() => T.addMotionKey(d, "c1", 0.5), /Choose a motion first/);
  let many = withMotion1; for (const at of [0.2, 0.4, 0.6, 0.8]) many = T.addMotionKey(many, "c1", at);
  assert.throws(() => T.addMotionKey(many, "c1", 0.9), /at most 4/);
  const u = T.updateMotionKey(a1, "c1", 0, { zoom: 3, x: -1 });
  assert.equal(u.clips[0].motion.mid[0].zoom, 3);
  assert.throws(() => T.updateMotionKey(a2, "c1", 0, { at: 0.5 }), /order|on top/, "keys cannot cross");
  assert.throws(() => T.updateMotionKey(a1, "c1", 0, { zoom: 9 }), /Zoom/);
  assert.throws(() => T.updateMotionKey(a1, "c1", 5, { zoom: 2 }), /no longer exists/);
  const r = T.removeMotionKey(a1, "c1", 0);
  assert.ok(!("mid" in r.clips[0].motion), "no empty list left behind");
  assert.ok(T.validateTimeline({ ...d, clips: [{ ...d.clips[0], motion: { ...base, mid: [{ at: 0.6, zoom: 2, x: 0, y: 0 }, { at: 0.4, zoom: 2, x: 0, y: 0 }] } }] }).length > 0, "unordered saved keys are refused");
  // the two-keyframe presets and older saved projects behave exactly as before
  assert.deepEqual(T.motionAt(base, 0.5), { zoom: 2, x: 0, y: 0 });
  // splitting a keyframed clip keeps every key, re-timed, and the cut point continuous
  const s = T.splitClip(k, "c1", 1, "c2");
  const [left, right] = [s.clips.find((c) => c.id === "c1").motion, s.clips.find((c) => c.id === "c2").motion];
  assert.equal(left.mid, undefined); assert.equal(left.toX, -1);
  assert.deepEqual(right.mid.map((m) => m.at), [0.333]); assert.equal(right.fromX, -1); assert.equal(right.toX, 1);
  assert.equal(T.validateTimeline(s).length, 0);
  const s2 = T.splitClip(k, "c1", 3, "c2");
  assert.deepEqual(s2.clips.find((c) => c.id === "c1").motion.mid.map((m) => m.at), [0.667], "the key before the cut stays on the left");
  assert.equal(s2.clips.find((c) => c.id === "c2").motion.fromX, 0, "and the right side starts where the left ended");
}

// ---------- renderer (real ffmpeg) ----------
const have = (bin) => spawnSync(bin, ["-version"]).status === 0;
if (!have("ffmpeg") || !have("ffprobe")) {
  if (process.env.FRESH_REQUIRE_FFMPEG) throw new Error("ffmpeg and ffprobe are required for this test.");
  console.log("Fresh Studio motion contract: model checks passed; render checks SKIPPED (ffmpeg missing).");
  process.exit(0);
}
const dir = fs.mkdtempSync(path.join(process.env.FRESH_TEST_TMP || os.tmpdir(), "fresh-studio-motion-"));
const ff = (...args) => execFileSync("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", ...args], { stdio: "pipe" });
const enc = ["-t", "4", "-c:v", "libx264", "-pix_fmt", "yuv420p"];
// left red / right blue; top red / bottom blue; blue with a small red box in the middle
const LR = path.join(dir, "lr.mp4"), TB = path.join(dir, "tb.mp4"), BOX = path.join(dir, "box.mp4");
ff("-f", "lavfi", "-i", "color=c=red:s=160x180:r=30:d=4", "-f", "lavfi", "-i", "color=c=blue:s=160x180:r=30:d=4", "-filter_complex", "[0][1]hstack", ...enc, LR);
ff("-f", "lavfi", "-i", "color=c=red:s=320x90:r=30:d=4", "-f", "lavfi", "-i", "color=c=blue:s=320x90:r=30:d=4", "-filter_complex", "[0][1]vstack", ...enc, TB);
ff("-f", "lavfi", "-i", "color=c=blue:s=320x180:r=30:d=4", "-vf", "drawbox=x=140:y=79:w=40:h=22:color=red:t=fill", ...enc, BOX);
const sources = { lr: LR, tb: TB, box: BOX };
const render = (doc, aspect = "16:9") => {
  const out = path.join(dir, `o-${Math.random().toString(36).slice(2)}.mp4`);
  const plan = R.planRender({ doc, preset: "360p", aspectRatio: aspect, sources, outputPath: out });
  assert.ok(plan.ok, plan.errors?.join("; "));
  try { ff(...plan.args); } catch (e) { throw new Error(`ffmpeg failed: ${String(e.stderr).slice(-500)}\n${plan.filterGraph}`); }
  return out;
};
const duration = (f) => Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f], { encoding: "utf8" }));
const uv = (file, at, crop = "") => {
  const r = spawnSync("ffmpeg", ["-hide_banner", "-ss", String(at), "-i", file, "-frames:v", "1", "-vf", `${crop}${crop ? "," : ""}signalstats,metadata=print:file=-`, "-f", "null", "-"], { encoding: "utf8" });
  const g = (k) => Number((r.stdout + r.stderr).match(new RegExp(`lavfi\\.signalstats\\.${k}=([\\d.]+)`))[1]);
  return { y: g("YAVG"), u: g("UAVG"), v: g("VAVG") };
};
const red = (c) => c.v > 200 && c.u < 120, blue = (c) => c.u > 200 && c.v < 130;
const withMotion = (id, motion, tweak = (d) => d) => tweak(T.setClipMotion(one(id), "c1", motion));

// no motion → picture is the plain source (left red, right blue)
{
  const o = render(one("lr"));
  assert.ok(red(uv(o, 1, "crop=iw/4:ih:0:0")) && blue(uv(o, 1, "crop=iw/4:ih:iw*3/4:0")));
}
// horizontal pan at 2× zoom: starts on the left half (red), ends on the right half (blue)
{
  const o = render(withMotion("lr", M({ fromZoom: 2, toZoom: 2, fromX: -1, toX: 1 })));
  assert.ok(Math.abs(duration(o) - 4) < 0.15, "length unchanged");
  const first = uv(o, 0.05), last = uv(o, 3.9), mid = uv(o, 2);
  assert.ok(red(first), `pan starts on the left half (${JSON.stringify(first)})`);
  assert.ok(blue(last), `pan ends on the right half (${JSON.stringify(last)})`);
  assert.ok(mid.u > 90 && mid.v > 90 && !red(mid) && !blue(mid), `halfway shows both (${JSON.stringify(mid)})`);
}
// vertical pan
{
  const o = render(withMotion("tb", M({ fromZoom: 2, toZoom: 2, fromY: -1, toY: 1 })));
  assert.ok(red(uv(o, 0.05)) && blue(uv(o, 3.9)), "vertical pan moves from the top half to the bottom half");
}
// zoom in grows the red box; zoom out shrinks it
{
  const inn = render(withMotion("box", M({ fromZoom: 1, toZoom: 3 })));
  const out = render(withMotion("box", M({ fromZoom: 3, toZoom: 1 })));
  const [i0, i1, o0, o1] = [uv(inn, 0.05).v, uv(inn, 3.9).v, uv(out, 0.05).v, uv(out, 3.9).v];
  assert.ok(i1 > i0 + 8, `zoom in: red area grows (${i0} -> ${i1})`);
  assert.ok(o0 > o1 + 8, `zoom out: red area shrinks (${o0} -> ${o1})`);
  assert.ok(Math.abs(i0 - o1) < 5 && Math.abs(i1 - o0) < 8, "zoom in and out are mirror images");
}
// works with sped-up clips, fill framing, a different output shape and a transition into the next clip
{
  const sped = withMotion("lr", M({ fromZoom: 2, toZoom: 2, fromX: -1, toX: 1 }), (d) => T.setClipSpeed(d, "c1", 2));
  const o = render(sped); assert.ok(Math.abs(duration(o) - 2) < 0.15, "speed keeps motion over the clip's own length");
  assert.ok(red(uv(o, 0.05)) && blue(uv(o, 1.9)));
  const vertical = render(withMotion("lr", M({ fromZoom: 2, toZoom: 2, fromX: -1, toX: 1 }), (d) => T.setClipFit(T.setAspect(d, "9:16"), "c1", "fill")), "9:16");
  assert.ok(Math.abs(duration(vertical) - 4) < 0.15);
  let d = T.addAsset(one("lr"), asset("box", 4)); d = T.trimClipEnd(d, "c1", 2);
  d = T.addClip(d, { trackId: "v1", assetId: "box", id: "c2" });
  d = T.setClipMotion(T.setClipMotion(d, "c1", M({ fromZoom: 1, toZoom: 2 })), "c2", M({ fromZoom: 2, toZoom: 1 }));
  d = T.setTransition(d, "c2", { type: "dissolve", duration: 0.6 });
  const t = render(d); assert.ok(Math.abs(duration(t) - 6) < 0.2, `motion + transition keep length (${duration(t)})`);
}

// keyframes in the export: hold on the left, then pan right; a zoom that goes in and back out
{
  const hold = render(withMotion("lr", M({ fromZoom: 2, toZoom: 2, fromX: -1, toX: 1, mid: [{ at: 0.5, zoom: 2, x: -1, y: 0 }] })));
  assert.ok(Math.abs(duration(hold) - 4) < 0.15, "length unchanged");
  assert.ok(red(uv(hold, 1.0)) && red(uv(hold, 1.8)), `holds on the left for the first half (${JSON.stringify(uv(hold, 1.8))})`);
  const late = uv(hold, 3.0); assert.ok(!red(late) && !blue(late), `moving in the second half (${JSON.stringify(late)})`);
  assert.ok(blue(uv(hold, 3.9)), "ends on the right half");
  const linear = render(withMotion("lr", M({ fromZoom: 2, toZoom: 2, fromX: -1, toX: 1 })));
  assert.ok(!red(uv(linear, 1.8)), "without the keyframe it would already be moving (so the hold is real)");
  const bump = render(withMotion("box", M({ fromZoom: 1, toZoom: 1, mid: [{ at: 0.5, zoom: 3, x: 0, y: 0 }] })));
  const [b0, b1, b2] = [uv(bump, 0.05).v, uv(bump, 2.0).v, uv(bump, 3.9).v];
  assert.ok(b1 > b0 + 8 && b1 > b2 + 8, `zooms in to the middle key then back out (${b0} ${b1} ${b2})`);
  const four = render(withMotion("lr", M({ fromZoom: 2, toZoom: 2, fromX: -1, toX: 1, mid: [0.2, 0.4, 0.6, 0.8].map((at, i) => ({ at, zoom: 2, x: i % 2 ? 1 : -1, y: 0 })) })));
  assert.ok(Math.abs(duration(four) - 4) < 0.15, "the maximum number of keys renders");
  // a split clip stays continuous through the cut
  const cut = render(T.splitClip(T.setClipMotion(one("lr"), "c1", M({ fromZoom: 2, toZoom: 2, fromX: -1, toX: 1, mid: [{ at: 0.5, zoom: 2, x: -1, y: 0 }] })), "c1", 1, "c2"));
  assert.ok(red(uv(cut, 1.8)) && blue(uv(cut, 3.9)), "split keyframed clip renders the same movement");
}

console.log("Fresh Studio motion contract passed (zoom and pan verified on real media).");

import assert from "node:assert/strict";
import { spawnSync, execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const base = "../src/features/fresh-studio/video-studio/";
const T = await import(base + "timeline.ts");
const F = await import(base + "film.ts");
const R = await import(base + "renderPlan.ts");

const asset = (id, duration) => ({ id, name: id, kind: "video", duration, width: 640, height: 360, hasAudio: false });
const start = () => {
  let d = T.createTimeline(30);
  for (const [id, s] of [["a", 6], ["b", 4], ["c", 5]]) d = T.addAsset(d, asset(id, s));
  d = T.addClip(d, { trackId: "v1", assetId: "a", id: "ca" });
  d = T.addClip(d, { trackId: "v1", assetId: "b", id: "cb" });
  d = T.addClip(d, { trackId: "v1", assetId: "c", id: "cc" });
  return d;
};

// ---------- scenes and shots ----------
let d = start();
assert.equal(d.film, undefined, "a project without a plan has no film field");
assert.deepEqual(F.filmSummary(d), { scenes: 0, shots: 0, linked: 0, plannedSeconds: 0, linkedSeconds: 0 });
d = F.addScene(d, { id: "s1", title: "  The gate  ", location: "Old city wall", timeOfDay: "Dusk", description: "Mara arrives." });
d = F.addScene(d, { id: "s2" });
assert.equal(d.film.scenes[0].title, "The gate");
assert.equal(d.film.scenes[1].title, "Scene 2", "default names count up");
assert.equal(d.film.scenes[1].location, "Unspecified location");
d = F.addShot(d, "s1", { id: "h1", title: "Wide of the gate", framing: "Wide", movement: "Crane", duration: 6 });
d = F.addShot(d, "s1", { id: "h2", duration: 4 });
d = F.addShot(d, "s2", { id: "h3", title: "Mara", framing: "Close-up", duration: 5 });
assert.equal(d.film.scenes[0].shots[1].title, "Shot 2");
assert.equal(d.film.scenes[0].shots[1].framing, "Medium");
assert.throws(() => F.addShot(d, "s1", { duration: 0.1 }), /between 0.5 and 600/);
assert.throws(() => F.addShot(d, "nope"), /no longer exists/);
assert.throws(() => F.updateShot(d, "h1", { duration: 9999 }), /between 0.5 and 600/);
assert.equal(F.updateShot(d, "h1", { framing: "Aerial", notes: "drone" }).film.scenes[0].shots[0].framing, "Aerial");
assert.equal(F.updateScene(d, "s1", { title: "   " }).film.scenes[0].title, "The gate", "an empty title keeps the old one");
assert.deepEqual(F.filmSummary(d), { scenes: 2, shots: 3, linked: 0, plannedSeconds: 15, linkedSeconds: 0 });
assert.equal(T.validateTimeline(d).length, 0);

// ordering
assert.deepEqual(F.moveScene(d, "s2", -1).film.scenes.map((s) => s.id), ["s2", "s1"]);
assert.equal(F.moveScene(d, "s1", -1), d, "moving past the start does nothing");
assert.deepEqual(F.moveShot(d, "h2", -1).film.scenes[0].shots.map((x) => x.id), ["h2", "h1"]);
assert.deepEqual(F.removeShot(d, "h1").film.scenes[0].shots.map((x) => x.id), ["h2"]);
assert.deepEqual(F.removeScene(d, "s1").film.scenes.map((s) => s.id), ["s2"]);

// ---------- linking ----------
d = F.linkShot(d, "h1", "cc");
d = F.linkShot(d, "h2", "ca");
d = F.linkShot(d, "h3", "cb");
assert.equal(F.filmSummary(d).linked, 3);
assert.equal(F.filmSummary(d).linkedSeconds, 15);
const moved = F.linkShot(d, "h2", "cc");
assert.equal(moved.film.scenes[0].shots[0].clipId, undefined, "a clip belongs to one shot only; the old link is cleared");
assert.equal(moved.film.scenes[0].shots[1].clipId, "cc");
assert.equal(F.linkShot(d, "h1", null).film.scenes[0].shots[0].clipId, undefined);
assert.throws(() => F.linkShot(d, "h1", "ghost"), /no longer exists/);
let withLayer = T.addVideoLayer(d);
withLayer = T.addClip(withLayer, { trackId: "v2", assetId: "a", id: "lay" });
assert.throws(() => F.linkShot(withLayer, "h1", "lay"), /main video track/);
// a link to a deleted clip is simply "not linked" and never breaks the document
const gone = T.deleteClip(d, "cc");
assert.equal(F.filmSummary(gone).linked, 2);
assert.equal(T.validateTimeline(gone).length, 0);

// ---------- sequencing: film order, not timeline order ----------
// timeline order is ca, cb, cc; film order is h1(cc), h2(ca), h3(cb)
const seq = F.sequenceFilm(d);
const at = (doc, id) => doc.clips.find((c) => c.id === id).start;
assert.equal(at(seq, "cc"), 0); assert.equal(at(seq, "ca"), 5); assert.equal(at(seq, "cb"), 11);
assert.equal(T.validateTimeline(seq).length, 0);
assert.equal(T.timelineDuration(seq), 15);
// unlinked clips follow the film, other tracks are untouched
let mixed = T.addAsset(d, asset("x", 2)); mixed = T.addClip(mixed, { trackId: "v1", assetId: "x", id: "cx", start: 20 });
const seq2 = F.sequenceFilm(mixed);
assert.equal(at(seq2, "cx"), 15);
assert.equal(at(F.sequenceFilm(withLayer), "lay"), at(withLayer, "lay"), "layers keep their place");
assert.throws(() => F.sequenceFilm(start()), /Link at least one shot/);
assert.throws(() => F.sequenceFilm(T.setTrackFlags(d, "v1", { locked: true })), /Unlock/);
// idempotent
assert.deepEqual(F.sequenceFilm(seq).clips, seq.clips);

// ---------- validation of saved data ----------
const bad = (film) => T.validateTimeline({ ...start(), film });
assert.ok(bad({ scenes: "x" }).length);
assert.ok(bad({ scenes: [{ id: "s", title: "t", location: "l", timeOfDay: "Day", description: "", shots: [{ id: "h", title: "t", framing: "Wide", movement: "Pan", notes: "", duration: 0 }] }] }).some((e) => /planned length/.test(e)));
assert.ok(bad({ scenes: [{ id: "s", title: "t", location: "l", timeOfDay: "Day", description: "", shots: [{ id: "h", title: "t", framing: "Wide", movement: "Pan", notes: "", duration: 3, clipId: "ca" }, { id: "h2", title: "t", framing: "Wide", movement: "Pan", notes: "", duration: 3, clipId: "ca" }] }] }).some((e) => /two shots/.test(e)));
assert.ok(bad({ scenes: [{ id: "s", title: "t", location: "l", timeOfDay: "Day", description: "", shots: [] }, { id: "s", title: "t", location: "l", timeOfDay: "Day", description: "", shots: [] }] }).some((e) => /share an id/.test(e)));
let many = start(); for (let i = 0; i < F.MAX_SCENES; i++) many = F.addScene(many);
assert.throws(() => F.addScene(many), /up to 40 scenes/);

// ---------- the sequenced film really exports, in film order (real ffmpeg) ----------
const have = (bin) => spawnSync(bin, ["-version"]).status === 0;
if (!have("ffmpeg") || !have("ffprobe")) {
  if (process.env.FRESH_REQUIRE_FFMPEG) throw new Error("ffmpeg and ffprobe are required for this test.");
  console.log("Fresh Studio film plan passed (ffmpeg render check SKIPPED: not installed here).");
  process.exit(0);
}
const dir = fs.mkdtempSync(path.join(process.env.FRESH_TEST_TMP || os.tmpdir(), "fresh-studio-film-"));
const ff = (...a) => execFileSync("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", ...a], { stdio: "pipe" });
const colours = { a: "red", b: "blue", c: "green" }, lens = { a: 6, b: 4, c: 5 };
const sources = {};
for (const id of ["a", "b", "c"]) { sources[id] = path.join(dir, `${id}.mp4`); ff("-f", "lavfi", "-i", `color=c=${colours[id]}:s=640x360:r=30:d=${lens[id]}`, "-c:v", "libx264", "-pix_fmt", "yuv420p", sources[id]); }
const out = path.join(dir, "film.mp4");
const planned = R.planRender({ doc: seq, preset: "360p", aspectRatio: "16:9", sources, outputPath: out });
assert.ok(planned.ok, planned.errors?.join("; "));
ff(...planned.args);
const dur = Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", out]).toString());
assert.ok(Math.abs(dur - 15) < 0.2, `film is 15 s (${dur})`);
const hue = (t) => {
  const r = spawnSync("ffmpeg", ["-hide_banner", "-ss", String(t), "-i", out, "-frames:v", "1", "-vf", "scale=1:1,format=rgb24", "-f", "rawvideo", "-"], { encoding: "buffer" });
  return [...r.stdout.subarray(0, 3)];
};
const is = (px, ch) => px[ch] > 100 && px.filter((_, i) => i !== ch).every((v) => v < 60);
assert.ok(is(hue(2), 1), `film starts on the green clip (${hue(2)})`);
assert.ok(is(hue(8), 0), `then the red clip (${hue(8)})`);
assert.ok(is(hue(13), 2), `then the blue clip (${hue(13)})`);
fs.rmSync(dir, { recursive: true, force: true });
console.log("Fresh Studio film plan passed (sequenced film verified on real ffmpeg output).");

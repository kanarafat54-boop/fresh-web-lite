import assert from "node:assert/strict";
import fs from "node:fs";

const base = "../src/features/fresh-studio/video-studio/";
const T = await import(base + "timeline.ts");
const {
  createTimeline, addAsset, addClip, splitClip, trimClipStart, trimClipEnd, moveClip, deleteClip, duplicateClip, setClipSpeed, reorderClip,
  setTrackFlags, validateTimeline, trackClips, clipDuration, clipEnd, timelineDuration, clipAt, createHistory, commit, undo, redo, canUndo, canRedo, TimelineError,
} = T;

function throwsTimeline(fn, pattern) {
  try { fn(); } catch (e) { assert.ok(e instanceof TimelineError, `expected TimelineError, got ${e?.name}: ${e?.message}`); if (pattern) assert.match(e.message, pattern); return; }
  assert.fail("expected TimelineError");
}

const asset = (id, duration, kind = "video") => ({ id, name: `${id}.mp4`, kind, duration, width: 1280, height: 720, hasAudio: kind !== "image" });
let doc = createTimeline(30);
doc = addAsset(doc, asset("a", 10));
doc = addAsset(doc, asset("b", 6));
doc = addAsset(doc, asset("song", 30, "audio"));
assert.equal(addAsset(doc, asset("a", 10)), doc, "re-adding an asset is a no-op");

// --- addClip: sequential placement and track/asset compatibility
doc = addClip(doc, { trackId: "v1", assetId: "a", id: "c1" });
doc = addClip(doc, { trackId: "v1", assetId: "b", id: "c2" });
assert.equal(trackClips(doc, "v1").map((c) => c.start).join(","), "0,10");
assert.equal(timelineDuration(doc), 16);
throwsTimeline(() => addClip(doc, { trackId: "m1", assetId: "a" }), /video and images/i);
throwsTimeline(() => addClip(doc, { trackId: "v1", assetId: "song" }), /music track/i);
throwsTimeline(() => addClip(doc, { trackId: "v1", assetId: "missing" }), /import/i);
throwsTimeline(() => addClip(doc, { trackId: "v1", assetId: "a", start: 5 }), /already a clip/i);
throwsTimeline(() => addClip(addAsset(doc, asset("img", null, "image")), { trackId: "v1", assetId: "img" }), /images are not supported/i);
assert.deepEqual(validateTimeline(doc), []);

// --- split: source ranges stay contiguous and no media is lost
let s = splitClip(doc, "c1", 4, "c1b");
const [l, r] = trackClips(s, "v1");
assert.equal(l.id, "c1"); assert.equal(r.id, "c1b");
assert.equal(l.sourceOut, 4); assert.equal(r.sourceIn, 4); assert.equal(r.start, 4); assert.equal(clipEnd(r), 10);
assert.equal(timelineDuration(s), 16, "splitting does not change total length");
assert.deepEqual(validateTimeline(s), []);
throwsTimeline(() => splitClip(doc, "c1", 0), /inside the clip/i);
throwsTimeline(() => splitClip(doc, "c1", 10), /inside the clip/i);
throwsTimeline(() => splitClip(doc, "nope", 3), /no longer exists/i);
// split respects speed: at 2x, 2s of timeline = 4s of source
const fast = setClipSpeed(doc, "c1", 2);
assert.equal(clipDuration(trackClips(fast, "v1")[0]), 5);
const fastSplit = splitClip(fast, "c1", 2, "x");
assert.equal(trackClips(fastSplit, "v1")[0].sourceOut, 4);

// --- speed: later clips shift, range limits enforced
assert.equal(trackClips(fast, "v1")[1].start, 5, "next clip closes up when a clip speeds up");
const slow = setClipSpeed(doc, "c1", 0.5);
assert.equal(trackClips(slow, "v1")[1].start, 20, "next clip is pushed out when a clip slows down");
assert.deepEqual(validateTimeline(slow), []);
throwsTimeline(() => setClipSpeed(doc, "c1", 0.1), /speed must be/i);
throwsTimeline(() => setClipSpeed(doc, "c1", 9), /speed must be/i);
throwsTimeline(() => setClipSpeed(doc, "c1", Number.NaN), /speed must be/i);

// --- trim: bounded by source media and neighbours
let t = trimClipEnd(doc, "c1", 7);
assert.equal(clipEnd(trackClips(t, "v1")[0]), 7);
throwsTimeline(() => trimClipEnd(doc, "c1", 11), /overlap|no more source/i);
throwsTimeline(() => trimClipEnd(doc, "c2", 30), /no more source/i);
throwsTimeline(() => trimClipEnd(doc, "c1", 0.05), /0\.1 seconds/);
t = trimClipStart(doc, "c1", 3);
assert.equal(trackClips(t, "v1")[0].sourceIn, 3);
assert.equal(trackClips(t, "v1")[0].start, 3);
throwsTimeline(() => trimClipStart(doc, "c2", 9), /no more source media before/i);
throwsTimeline(() => trimClipStart(doc, "c2", 20), /0\.1 seconds/);
// extending an edge into its neighbour is an overlap, not silently allowed
const splitC2 = splitClip(doc, "c2", 13, "c2b");
throwsTimeline(() => trimClipStart(splitC2, "c2b", 12), /overlap/i);

// --- move: no overlaps, no cross-kind moves
let m = moveClip(doc, "c2", 12);
assert.equal(trackClips(m, "v1")[1].start, 12);
throwsTimeline(() => moveClip(doc, "c2", 5), /already a clip/i);
let withSong = addClip(doc, { trackId: "m1", assetId: "song", id: "mus" });
throwsTimeline(() => moveClip(withSong, "mus", 0, "v1"), /cannot hold/i);
throwsTimeline(() => moveClip(withSong, "c1", 0, "m1"), /cannot hold/i);

// --- delete (plain vs ripple) and duplicate
const plain = deleteClip(doc, "c1");
assert.equal(trackClips(plain, "v1")[0].start, 10, "plain delete leaves a gap");
const rip = deleteClip(doc, "c1", true);
assert.equal(trackClips(rip, "v1")[0].start, 0, "ripple delete closes the gap");
const dup = duplicateClip(doc, "c1", "c1copy");
assert.equal(trackClips(dup, "v1").map((c) => c.id).join(","), "c1,c1copy,c2");
assert.equal(trackClips(dup, "v1")[2].start, 20, "later clips are pushed right");
assert.deepEqual(validateTimeline(dup), []);

// --- reorder repacks without gaps
const re = reorderClip(doc, "c2", 0);
assert.equal(trackClips(re, "v1").map((c) => c.id).join(","), "c2,c1");
assert.equal(trackClips(re, "v1").map((c) => c.start).join(","), "0,6");
assert.deepEqual(validateTimeline(re), []);

// --- locked tracks are protected
const locked = setTrackFlags(doc, "v1", { locked: true });
for (const op of [() => splitClip(locked, "c1", 4), () => deleteClip(locked, "c1"), () => moveClip(locked, "c1", 1), () => duplicateClip(locked, "c1"), () => setClipSpeed(locked, "c1", 2), () => addClip(locked, { trackId: "v1", assetId: "a" })]) throwsTimeline(op, /locked/i);

// --- clipAt
assert.equal(clipAt(doc, "v1", 3).id, "c1");
assert.equal(clipAt(doc, "v1", 10).id, "c2");
assert.equal(clipAt(doc, "v1", 16), null);

// --- validation catches corrupt stored documents
assert.ok(validateTimeline(null).length);
assert.ok(validateTimeline({ ...doc, version: 2 }).length);
assert.ok(validateTimeline({ ...doc, clips: [{ ...doc.clips[0], assetId: "ghost" }] }).some((e) => /missing media/.test(e)));
assert.ok(validateTimeline({ ...doc, clips: [{ ...doc.clips[0], sourceOut: 99 }] }).some((e) => /past its media/.test(e)));
assert.ok(validateTimeline({ ...doc, clips: [{ ...doc.clips[0], speed: 50 }] }).some((e) => /speed/.test(e)));
assert.ok(validateTimeline({ ...doc, clips: [{ ...doc.clips[0], start: Number.NaN }] }).some((e) => /invalid numbers/.test(e)));
assert.ok(validateTimeline({ ...doc, clips: [doc.clips[0], { ...doc.clips[1], start: 5 }] }).some((e) => /overlap/.test(e)));
// every operation's result must itself validate
for (const out of [s, fast, slow, t, m, plain, rip, dup, re]) assert.deepEqual(validateTimeline(out), []);

// --- undo / redo
let h = createHistory(doc);
assert.ok(!canUndo(h) && !canRedo(h));
h = commit(h, splitClip(h.present, "c1", 4, "x1"));
h = commit(h, deleteClip(h.present, "x1", true));
assert.equal(h.present.clips.length, 2);
h = undo(h);
assert.equal(h.present.clips.length, 3);
h = undo(h);
assert.equal(h.present, doc);
assert.equal(undo(h), h, "undo at the start is a no-op");
h = redo(h);
assert.equal(h.present.clips.length, 3);
h = commit(h, deleteClip(h.present, "c2"));
assert.ok(!canRedo(h), "a new edit clears redo");
assert.equal(commit(h, h.present), h, "committing an unchanged document does not add history");
let big = createHistory(doc);
for (let i = 0; i < 150; i += 1) big = commit(big, moveClip(big.present, "c2", 12 + (i % 2)));
assert.equal(big.past.length, 100, "history is capped");

// --- clip count cap
let many = createTimeline();
many = addAsset(many, asset("x", 1));
for (let i = 0; i < 200; i += 1) many = addClip(many, { trackId: "v1", assetId: "x" });
throwsTimeline(() => addClip(many, { trackId: "v1", assetId: "x" }), /at most 200/);


// --- On-device silence detection (pure signal analysis) and timeline persistence in the project model
{
  const { detectSilenceFromSamples, mixToMono } = await import(base + "audioAnalysis.ts");
  const rate = 8000;
  const build = (segments) => {
    const total = segments.reduce((n, [d]) => n + d, 0);
    const out = new Float32Array(Math.round(total * rate));
    let at = 0;
    for (const [d, amp] of segments) { const n = Math.round(d * rate); for (let i = 0; i < n; i += 1) out[at + i] = amp * Math.sin((2 * Math.PI * 440 * (at + i)) / rate); at += n; }
    return out;
  };
  const near = (a, e, tol, l) => assert.ok(Math.abs(a - e) <= tol, `${l}: ${a} vs ${e}`);
  const sig = build([[2, 0.5], [1.5, 0], [2, 0.5], [0.8, 0], [1.5, 0.5]]);
  const found = detectSilenceFromSamples(sig, rate);
  assert.equal(found.length, 2, JSON.stringify(found));
  near(found[0].start, 2, 0.03, "start 1"); near(found[0].end, 3.5, 0.03, "end 1");
  near(found[1].start, 5.5, 0.03, "start 2"); near(found[1].end, 6.3, 0.03, "end 2");
  assert.equal(detectSilenceFromSamples(build([[2, 0.5], [0.3, 0], [2, 0.5]]), rate).length, 0, "short pauses are not silence");
  assert.equal(detectSilenceFromSamples(build([[2, 0.5], [0.3, 0], [2, 0.5]]), rate, { minSilence: 0.2 }).length, 1);
  assert.deepEqual(detectSilenceFromSamples(build([[1, 0.5], [2, 0]]), rate), [{ start: 1, end: 3 }], "trailing silence runs to the end");
  assert.equal(detectSilenceFromSamples(build([[3, 0.5]]), rate).length, 0, "continuous sound has no silence");
  assert.equal(detectSilenceFromSamples(build([[3, 0.0005]]), rate).length, 1, "a very quiet noise floor counts as silence");
  assert.equal(detectSilenceFromSamples(build([[3, 0.05]]), rate, { noiseDb: -35 }).length, 0, "quiet speech above the threshold is kept");
  assert.deepEqual(detectSilenceFromSamples(new Float32Array(0), rate), []);
  assert.deepEqual(detectSilenceFromSamples(sig, 0), []);
  // Faint noise inside a silence does not split it, but an audible pop does (it is sound, not dead air)
  const faint = build([[3, 0]]); faint[12000] = 0.05;
  assert.equal(detectSilenceFromSamples(faint, rate).length, 1, "a faint blip does not end a silence");
  const pop = build([[3, 0]]); pop[12000] = 0.9;
  assert.equal(detectSilenceFromSamples(pop, rate, { minSilence: 0.4 }).length, 2, "a loud pop splits the silence in two");
  assert.equal(mixToMono([Float32Array.of(1, 1), Float32Array.of(-1, 0)])[0], 0);
  assert.equal(mixToMono([]).length, 0);

  // Timeline + captions survive storage; a corrupt stored timeline is dropped instead of crashing
  const { parseStudioMeta, metaToMetadata } = await import(base + "../projects/projectMapping.ts");
  const { createStudioProjectService } = await import(base + "../projects/projectService.ts");
  const { createDeviceBackend, MemoryStore } = await import(base + "../projects/deviceBackend.ts");
  const svc = createStudioProjectService(createDeviceBackend(new MemoryStore()));
  let project = await svc.create({ name: "Editor", kind: "video" });
  assert.equal(project.meta.timeline, null);
  assert.deepEqual(project.meta.captions, []);
  const tl = addClip(addAsset(createTimeline(30), asset("a", 6)), { trackId: "v1", assetId: "a", id: "k1" });
  const saved = await svc.saveEditor(project, { timeline: tl, captions: [{ id: "c", start: 0, end: 1, text: "Hi" }] });
  assert.equal(saved.meta.status, "editing", "first edit moves planning to editing");
  assert.equal(saved.version, project.version + 1);
  const back = parseStudioMeta(metaToMetadata({}, saved.meta));
  assert.deepEqual(back.timeline, tl);
  assert.equal(back.captions[0].text, "Hi");
  assert.equal(parseStudioMeta({ studio: { ...saved.meta, timeline: { version: 9 } } }).timeline, null, "corrupt timeline is dropped");
  assert.equal(parseStudioMeta({ studio: { ...saved.meta, captions: [{ id: "x", start: 3, end: 1, text: "bad" }, "junk", { id: "y", start: 0, end: 1, text: "ok" }] } }).captions.length, 1, "bad captions are dropped");
  try { await svc.saveEditor(saved, { timeline: { ...tl, clips: [{ ...tl.clips[0], assetId: "ghost" }] }, captions: [] }); assert.fail("must reject"); } catch (e) { assert.match(e.message, /missing media/i); }
  const dup = await svc.duplicate(saved);
  assert.deepEqual(dup.meta.timeline, tl, "duplicating a project keeps its edit");
  const trashed = await svc.moveToTrash(saved);
  try { await svc.saveEditor(trashed, { timeline: tl, captions: [] }); assert.fail("must reject"); } catch (e) { assert.match(e.message, /trash/i); }
}

console.log("Fresh Studio timeline contract passed.");

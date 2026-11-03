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

console.log("Fresh Studio timeline contract passed.");

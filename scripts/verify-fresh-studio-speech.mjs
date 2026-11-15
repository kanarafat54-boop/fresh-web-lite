import assert from "node:assert/strict";
const base = "../src/features/fresh-studio/video-studio/";
const S = await import(base + "speech.ts");
const A = await import(base + "analysis.ts");
const T = await import(base + "timeline.ts");
const w = (text, start, end) => ({ text, start, end });
const talk = [w("So", 0.2, 0.4), w("um", 0.5, 0.8), w("I", 1.0, 1.1), w("think", 1.1, 1.4), w("uh,", 1.5, 1.7), w("this", 1.8, 2.0), w("works.", 2.0, 2.5), w("Hmm", 2.6, 2.9), w("Really", 5.0, 5.4), w("well.", 5.4, 5.8)];
// fillers: only hesitation sounds, never real words
const f = S.findFillers([...talk, w("like", 6, 6.2), w("you", 6.2, 6.3), w("know", 6.3, 6.4), w("Umbrella", 6.5, 7)]);
assert.deepEqual(f.map((x) => x.text), ["um", "uh,", "Hmm"]);
assert.match(S.describeFillers(f), /^3 filler words \(um, uh, hmm\), about 0\.8 s\.$/);
assert.equal(S.describeFillers([]), "No filler words found.");
// ranges: padded, merged when touching
const r = S.fillerRanges([w("um", 1, 1.2), w("uh", 1.22, 1.4), w("er", 3, 3.1)]);
assert.equal(r.length, 2); assert.ok(r[0].start < 1 && r[0].end > 1.4);
// cues: split on sentence end, pause, length
let n = 0; const cues = S.wordsToCues(talk, {}, () => `c${n++}`);
assert.deepEqual(cues.map((c) => c.text), ["So um I think uh, this works.", "Hmm", "Really well."]);
assert.equal(cues[0].start, 0.2); assert.equal(cues[2].end, 5.8);
for (const c of cues) assert.ok(c.end > c.start);
const long = S.wordsToCues(Array.from({ length: 30 }, (_, i) => w("word", i * 0.3, i * 0.3 + 0.25)));
assert.ok(long.length > 2 && long.every((c) => c.text.length <= 38 && c.end - c.start <= 3.6), "long speech is split into readable cues");
// bad engine output is repaired
const c = S.cleanWords([w("b", 1, 0.5), w("", 0, 1), w("a", -1, 0), w("c", 0.9, 1.2), w("x", NaN, 1)]);
assert.deepEqual(c.map((x) => x.text), ["c", "b"]); assert.ok(c[0].end > c[0].start && c[1].start >= c[0].end);
// timeline mapping honours trim, start and speed
const clip = { start: 10, sourceIn: 1, sourceOut: 3, speed: 2 };
const m = S.wordsOnTimeline(talk, clip);
assert.deepEqual(m.map((x) => x.text), ["I", "think", "uh,", "this", "works.", "Hmm"]);
assert.equal(m[0].start, 10); assert.equal(m[1].start, 10.05);
assert.ok(S.isNonSpeech("[MUSIC]") && S.isNonSpeech("(laughs)") && S.isNonSpeech("♪") && !S.isNonSpeech("hello"));
// cutting fillers out of a real timeline reuses the silence cutter: the clip gets shorter by the cut length
let d = T.addAsset(T.createTimeline(30), { id: "a", name: "a", kind: "video", duration: 8, width: 320, height: 180, hasAudio: true });
d = T.addClip(d, { trackId: "v1", assetId: "a", id: "c1" });
const before = T.timelineDuration(d);
const cuts = S.fillerRanges(S.findFillers(talk));
const out = A.removeSilences(d, "c1", cuts, { minSilence: 0, padding: 0, minRemove: 0.1 });
assert.equal(out.cuts, 3);
assert.ok(Math.abs(before - out.removedSeconds - T.timelineDuration(out.doc)) < 0.01, "length drops by exactly what was removed");
assert.equal(T.validateTimeline(out.doc).length, 0);
const Eng = await import(base + "speechEngine.ts");
assert.deepEqual(Eng.wordsFromChunks([{ text: " Hello", timestamp: [0, 0.4] }, { text: " [MUSIC]", timestamp: [0.5, 0.9] }, { text: " um", timestamp: [1, null] }], 3), [w("Hello", 0, 0.4), w("um", 1, 1.4)], "engine chunks: non-speech dropped, missing end filled");
console.log("Fresh Studio speech contract passed (fillers, cues, mapping and cuts).");

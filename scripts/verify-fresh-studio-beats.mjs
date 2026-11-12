import assert from "node:assert/strict";
const base = "../src/features/fresh-studio/video-studio/";
const B = await import(base + "beats.ts");
const T = await import(base + "timeline.ts");

const SR = 8000;
/** Clicks (short decaying bursts) at `bpm` starting at `offset` seconds, over a quiet bed. */
function clicks(bpm, seconds, offset = 0, noise = 0.003) {
  const s = new Float32Array(SR * seconds);
  let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) - 0.5;
  for (let i = 0; i < s.length; i += 1) s[i] = noise * rnd();
  const gap = 60 / bpm;
  for (let t = offset; t < seconds; t += gap) {
    const at = Math.round(t * SR);
    for (let i = 0; i < 400 && at + i < s.length; i += 1) s[at + i] += 0.8 * Math.exp(-i / 90) * Math.sin(i * 0.5);
  }
  return s;
}

for (const [bpm, offset] of [[120, 0.1], [90, 0.35], [140, 0.0]]) {
  const r = B.detectBeats(clicks(bpm, 20, offset), SR);
  assert.ok(r, `${bpm} bpm found`);
  assert.ok(Math.abs(r.bpm - bpm) < 1.5, `${bpm} bpm read as ${r.bpm}`);
  const gap = 60 / bpm;
  const err = Math.abs(((r.beats[0] - offset) % gap + gap) % gap);
  assert.ok(Math.min(err, gap - err) < 0.05, `${bpm} bpm phase off by ${err}`);
  assert.ok(r.beats.every((b, i) => i === 0 || b > r.beats[i - 1]));
}

// no pulse: silence, steady noise and too-short audio are refused, not guessed
assert.equal(B.detectBeats(new Float32Array(SR * 20), SR), null);
let seed = 3; const noise = new Float32Array(SR * 20).map(() => (((seed = (seed * 16807) % 2147483647) / 2147483647) - 0.5) * 0.2);
assert.equal(B.detectBeats(noise, SR), null);
assert.equal(B.detectBeats(clicks(120, 2), SR), null);
assert.equal(B.detectBeats(new Float32Array(0), SR), null);
assert.equal(B.detectBeats(clicks(120, 20), 0), null);

// placing and thinning beats
const clip = { id: "m", trackId: "m1", assetId: "s", start: 5, sourceIn: 2, sourceOut: 12, speed: 2 };
assert.deepEqual(B.beatsOnTimeline(clip, [1, 2, 3, 4, 12, 13]), [5.5, 6], "only the played part, at timeline speed");
assert.deepEqual(B.everyNth([1, 2, 3, 4, 5, 6, 7], 4), [1, 5]);
assert.deepEqual(B.everyNth([1, 2, 3], 0), [1, 2, 3]);

// cutting a video track on the beat
let doc = T.createTimeline(30);
doc = T.addAsset(doc, { id: "v", name: "v.mp4", kind: "video", duration: 20, width: 1280, height: 720, hasAudio: true });
doc = T.addClip(doc, { trackId: "v1", assetId: "v", id: "c1" });
const cut = B.splitTrackAt(doc, "v1", [2, 4, 4.1, 6, 25, -1], 0.4);
assert.equal(cut.splits, 3, "2, 4 and 6; 4.1 leaves a sliver; 25 and -1 are outside");
assert.deepEqual(T.trackClips(cut.doc, "v1").map((c) => c.start), [0, 2, 4, 6]);
assert.equal(T.timelineDuration(cut.doc), T.timelineDuration(doc), "cutting never changes the length");
assert.deepEqual(T.validateTimeline(cut.doc), []);
assert.equal(B.splitTrackAt(doc, "nope", [2]).splits, 0);

console.log("beats ok");

import assert from "node:assert/strict";
import { downmixToMono, resample, normalizePeak, isSilent, prepareForSpeech, SPEECH_SAMPLE_RATE } from "../src/features/fresh-flow/core/speechAudio.ts";
import { cleanSegmentText, wrapLines, cuesFromSpeech, segmentsFromWhisper } from "../src/features/fresh-flow/core/speechCues.ts";

// Audio preparation.
assert.deepEqual([...downmixToMono([new Float32Array([1, 0, 1]), new Float32Array([0, 1, 1])])], [0.5, 0.5, 1]);
assert.equal(downmixToMono([]).length, 0);
const mono = new Float32Array([0.1, 0.2]);
assert.equal(downmixToMono([mono]), mono);
const sine = (rate, seconds, hz) => Float32Array.from({ length: Math.floor(rate * seconds) }, (_, i) => Math.sin((2 * Math.PI * hz * i) / rate) * 0.5);
const down = resample(sine(48000, 1, 440), 48000, 16000);
assert.equal(down.length, 16000);
let peak = 0; for (const v of down) peak = Math.max(peak, Math.abs(v));
assert.ok(peak > 0.45 && peak < 0.51, `a 440 Hz tone survives downsampling, peak ${peak}`);
const dc = resample(new Float32Array(44100).fill(0.25), 44100, 16000);
assert.ok(dc.every((v) => Math.abs(v - 0.25) < 1e-6), "constant signal stays constant (no edge artefacts)");
assert.equal(resample(mono, 16000, 16000), mono);
assert.equal(resample(new Float32Array(0), 44100, 16000).length, 0);
assert.throws(() => resample(mono, 0, 16000));
// High frequencies the lower rate cannot hold are attenuated, not folded into the speech band.
const hiss = resample(sine(48000, 1, 20000), 48000, 16000);
let hissPeak = 0; for (const v of hiss) hissPeak = Math.max(hissPeak, Math.abs(v));
assert.ok(hissPeak < 0.25, `ultrasonic content is attenuated (${hissPeak})`);
assert.equal(normalizePeak(new Float32Array(4)).every((v) => v === 0), true);
const quiet = normalizePeak(new Float32Array([0.01, -0.02]));
assert.ok(Math.abs(quiet[1] + 0.16) < 1e-6, "gain capped at 8x");
const loud = new Float32Array([0.95]); assert.equal(normalizePeak(loud), loud);
assert.equal(isSilent(new Float32Array(1000)), true);
assert.equal(isSilent(new Float32Array(0)), true);
assert.equal(isSilent(sine(16000, 1, 200)), false);
const prepared = prepareForSpeech([sine(48000, 2, 300), sine(48000, 2, 300)], 48000);
assert.equal(prepared.samples.length, 2 * SPEECH_SAMPLE_RATE);
assert.ok(Math.abs(prepared.seconds - 2) < 1e-6);

// Cleaning.
for (const noise of ["[BLANK_AUDIO]", "(music)", " [Music] ", "♪", "♪ ♪", "*applause*", "", "   ", "...", "Thanks for watching!", "Thank you for watching.", "Subtitles by the Amara.org community"]) assert.equal(cleanSegmentText(noise), "", JSON.stringify(noise));
assert.equal(cleanSegmentText("  Hello   there  "), "Hello there");
assert.equal(cleanSegmentText("I said (quietly) hello"), "I said (quietly) hello");
assert.deepEqual(wrapLines("one two three", 7), ["one two", "three"]);
assert.deepEqual(wrapLines("supercalifragilistic", 5), ["supercalifragilistic"]);

// Cues.
let cues = cuesFromSpeech([{ text: "Hello and welcome.", start: 0.2, end: 2 }, { text: "[BLANK_AUDIO]", start: 2, end: 4 }, { text: "Today we talk about cats.", start: 4, end: 6.5 }], 10);
assert.deepEqual(cues.map((c) => c.text), ["Hello and welcome.", "Today we talk about cats."]);
assert.ok(cues.every((c, i) => c.end > c.start && (i === 0 || c.start >= cues[i - 1].end - 1e-9)));
const long = "This is a much longer sentence that keeps going on and on so it cannot fit in two short caption lines at all, really.";
cues = cuesFromSpeech([{ text: long, start: 0, end: 12 }], 12);
assert.ok(cues.length >= 2);
assert.ok(cues.every((c) => c.text.split("\n").length <= 2 && c.text.split("\n").every((l) => l.length <= 42 + 20)), "two lines each");
assert.equal(cues.map((c) => c.text.replace(/\n/g, " ")).join(" "), long, "no words lost or reordered");
assert.ok(cues.every((c) => c.end - c.start <= 6.01));
assert.ok(Math.abs(cues[0].start) < 1e-9 && cues[cues.length - 1].end <= 12.0001);
// Very short cue gets reading time; never extends past the next cue or the video.
cues = cuesFromSpeech([{ text: "Hi.", start: 1, end: 1.1 }, { text: "Next.", start: 1.4, end: 3 }], 3);
assert.ok(cues[0].end - cues[0].start >= 0.3 && cues[0].end <= cues[1].start + 1e-9);
cues = cuesFromSpeech([{ text: "Late.", start: 9.9, end: 20 }], 10);
assert.ok(cues[0].end <= 10 && cues[0].start >= 0);
// Out of order and bad numbers.
cues = cuesFromSpeech([{ text: "Second.", start: 5, end: 6 }, { text: "First.", start: 1, end: 2 }, { text: "Bad.", start: NaN, end: 3 }, { text: "Past the end.", start: 50, end: 60 }], 10);
assert.equal(cues[0].text, "First.");
assert.ok(!cues.some((c) => c.text === "Bad." || c.start > 10));
// A line repeated many times in a row is a model loop, not speech.
cues = cuesFromSpeech(Array.from({ length: 6 }, (_, i) => ({ text: "I don't know.", start: i * 2, end: i * 2 + 2 })), 12);
assert.equal(cues.length, 2, "kept twice, the rest dropped");
assert.deepEqual(cuesFromSpeech([], 10), []);
assert.deepEqual(cuesFromSpeech([{ text: "[Music]", start: 0, end: 5 }], 10), []);
// Unknown duration (0) does not clamp to nothing.
assert.equal(cuesFromSpeech([{ text: "Hello.", start: 0, end: 2 }], 0).length, 1);

// Model output.
const out = { text: "hi there you", chunks: [{ text: " hi there", timestamp: [0, 1.5] }, { text: " you", timestamp: [1.5, null] }, { text: " junk", timestamp: ["x", 3] }] };
assert.deepEqual(segmentsFromWhisper(out, 4), [{ text: " hi there", start: 0, end: 1.5 }, { text: " you", start: 1.5, end: 4 }]);
assert.deepEqual(segmentsFromWhisper({ text: "just text" }, 5), [{ text: "just text", start: 0, end: 5 }]);
assert.deepEqual(segmentsFromWhisper(null, 5), []);
assert.deepEqual(segmentsFromWhisper({ chunks: [{ text: "a", timestamp: [2, null] }, { text: "b", timestamp: [3, null] }] }, 9), [{ text: "a", start: 2, end: 3 }, { text: "b", start: 3, end: 9 }]);
console.log("speech captions ok");

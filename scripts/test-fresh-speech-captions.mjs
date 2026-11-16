import assert from "node:assert/strict";
import { wordsToCues } from "../src/features/fresh-studio/video-studio/speech.ts";
import { cleanSegmentText, wrapLines, cuesFromSpeech, modelForLanguage, languageName } from "../src/features/fresh-flow/core/speechCues.ts";

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

// Model choice for Studio's shared engine.
assert.equal(modelForLanguage("en", false), "Xenova/whisper-tiny.en");
assert.equal(modelForLanguage("en", true), "Xenova/whisper-base.en");
assert.equal(modelForLanguage("sw", true), "Xenova/whisper-tiny");
assert.equal(modelForLanguage("", false), "Xenova/whisper-tiny");
assert.equal(languageName("sw"), "swahili");
assert.equal(languageName(""), undefined);
// Studio words become Shorts cues through the shared grouping.
const words = [{ text: "Hello", start: 0, end: 0.4 }, { text: "everyone.", start: 0.4, end: 1 }, { text: "Today", start: 2.5, end: 3 }, { text: "we", start: 3, end: 3.2 }, { text: "test", start: 3.2, end: 3.6 }];
cues = cuesFromSpeech(wordsToCues(words).map((c) => ({ text: c.text, start: c.start, end: c.end })), 5);
assert.deepEqual(cues.map((c) => c.text), ["Hello everyone.", "Today we test"]);
console.log("speech captions ok");

import assert from "node:assert/strict";
import { parseTimestamp, parseCaptionFile, normalizeCues, activeCue, pickTrack } from "../src/features/fresh-flow/core/shortsCaptions.ts";

// timestamps
assert.equal(parseTimestamp("00:01.500"), 1.5);
assert.equal(parseTimestamp("00:00:01.500"), 1.5);
assert.equal(parseTimestamp("00:00:01,500"), 1.5);
assert.equal(parseTimestamp("01:02:03.004"), 3723.004);
assert.equal(parseTimestamp("nonsense"), null);

// WebVTT with header, notes, cue ids, settings and markup
const vtt = `WEBVTT

NOTE this is a comment

intro
00:00.000 --> 00:02.000 align:start position:0%
<c.yellow>Hello</c> &amp; welcome

00:02.500 --> 00:04.000
Second line
continues here
`;
const v = parseCaptionFile(vtt);
assert.equal(v.error, null);
assert.deepEqual(v.cues, [
  { start: 0, end: 2, text: "Hello & welcome" },
  { start: 2.5, end: 4, text: "Second line\ncontinues here" },
]);

// SRT with BOM, CRLF and numeric ids
const srt = "﻿1\r\n00:00:01,000 --> 00:00:02,500\r\nFirst\r\n\r\n2\r\n00:00:03,000 --> 00:00:04,000\r\nSecond\r\n";
const s = parseCaptionFile(srt);
assert.equal(s.error, null);
assert.deepEqual(s.cues.map((c) => c.text), ["First", "Second"]);

// rejects things that are not captions, empty files, and bad ranges
assert.ok(parseCaptionFile("").error);
assert.ok(parseCaptionFile("just some prose, no timing").error);
assert.ok(parseCaptionFile("WEBVTT\n\n00:05.000 --> 00:04.000\nbackwards").error, "end before start is dropped");
assert.ok(parseCaptionFile("x".repeat(600 * 1024)).error, "oversized file refused");

// out-of-order cues are sorted
const o = parseCaptionFile("WEBVTT\n\n00:03.000 --> 00:04.000\nB\n\n00:01.000 --> 00:02.000\nA\n");
assert.deepEqual(o.cues.map((c) => c.text), ["A", "B"]);

// stored data of unknown shape
assert.deepEqual(normalizeCues(null), []);
assert.deepEqual(normalizeCues([{ start: 1, end: 2, text: " ok " }, { start: 3, end: 2, text: "bad" }, { start: "1", end: 2, text: "bad" }, null, { start: 0, end: 1, text: "  " }]), [{ start: 1, end: 2, text: "ok" }]);

// lookup
const cues = v.cues;
assert.equal(activeCue(cues, 1)?.text, "Hello & welcome");
assert.equal(activeCue(cues, 2.2), null, "gap between cues shows nothing");
assert.equal(activeCue(cues, 3)?.text.startsWith("Second"), true);
assert.equal(activeCue(cues, 4), null, "end is exclusive");
assert.equal(activeCue([], 1), null);
assert.equal(activeCue(cues, Number.NaN), null);

// track choice
const tracks = [{ language: "fr", cues: [] }, { language: "en", cues: [] }, { language: "sw", cues: [] }];
assert.equal(pickTrack(tracks, "sw-KE")?.language, "sw");
assert.equal(pickTrack(tracks, "de")?.language, "en", "falls back to English");
assert.equal(pickTrack([{ language: "fr", cues: [] }], "de")?.language, "fr", "then to whatever exists");
assert.equal(pickTrack([], "en"), null);
console.log("Fresh Shorts caption tests passed.");

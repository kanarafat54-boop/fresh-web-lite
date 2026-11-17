import assert from "node:assert/strict";
const base = "../src/features/fresh-studio/";
const A = await import(base + "audio-studio/audioEdit.ts");
const P = await import(base + "shared/projectSettings.ts");
const rate = 8000;
const tone = (secs, amp = 0.5, from = 0) => Float32Array.from({ length: Math.round(secs * rate) }, (_, i) => amp * Math.sin((2 * Math.PI * 440 * (i + from)) / rate));
// settings round trip, safe defaults for old projects
assert.deepEqual(A.readAudioEdit({}), A.DEFAULT_EDIT);
assert.deepEqual(A.readAudioEdit({ gainDb: 99, fadeInMs: -5, trimStartMs: "x", normalize: 1, markers: "not json" }), { ...A.DEFAULT_EDIT, gainDb: 24, normalize: true });
const edit = { trimStartMs: 500, trimEndMs: 3500, fadeInMs: 200, fadeOutMs: 300, gainDb: -6, normalize: false, markers: [{ ms: 2000, name: "Second" }, { ms: 1000, name: " First  one " }] };
const saved = A.toSettings(edit);
assert.deepEqual(A.readAudioEdit(saved).markers, [{ ms: 1000, name: "First one" }, { ms: 2000, name: "Second" }], "markers are cleaned and sorted");
assert.equal(A.parseMarkers(JSON.stringify([{ ms: -1, name: "x" }, { ms: 1e12, name: "y" }, null, 5])).length, 0, "bad markers are dropped");
assert.equal(A.parseMarkers(JSON.stringify(Array.from({ length: 500 }, (_, i) => ({ ms: i, name: "m" })))).length, A.MAX_MARKERS);
// the project service accepts and keeps the editor's settings for audio and podcast, and still rejects nonsense
for (const kind of ["audio", "podcast"]) {
  const merged = P.mergeSettings(kind, P.defaultSettingsFor(kind), saved);
  assert.ok(merged.ok, JSON.stringify(merged.errors));
  assert.deepEqual(A.readAudioEdit(merged.settings), A.readAudioEdit(saved), `${kind} settings survive validation`);
  assert.equal(P.mergeSettings(kind, P.defaultSettingsFor(kind), { gainDb: 50 }).ok, false);
  assert.equal(P.mergeSettings(kind, P.defaultSettingsFor(kind), { markers: "x".repeat(7000) }).ok, false, "marker text is capped");
}
// processing: trim, gain, fades, normalise, clipping
const src = [tone(4)];
const out = A.processChannels(src, rate, edit)[0];
assert.equal(out.length, 3 * rate, "trim keeps 0.5 s to 3.5 s");
assert.ok(Math.abs(out[0]) < 1e-3 && Math.abs(out[out.length - 1]) < 1e-3, "fades reach silence at both ends");
const mid = out.slice(Math.round(1.2 * rate), Math.round(1.3 * rate));
assert.ok(Math.abs(Math.max(...mid) - 0.5 * Math.pow(10, -6 / 20)) < 0.02, "-6 dB gain in the middle");
assert.equal(src[0][100], tone(4)[100], "the original samples are untouched");
const norm = A.processChannels([tone(1, 0.1)], rate, { ...A.DEFAULT_EDIT, normalize: true })[0];
assert.ok(Math.abs(Math.max(...norm) - Math.pow(10, -1 / 20)) < 0.01, "normalise brings the peak to -1 dBFS");
const hot = A.processChannels([tone(1, 0.9)], rate, { ...A.DEFAULT_EDIT, gainDb: 24 })[0];
assert.ok(Math.max(...hot) <= 1 && Math.min(...hot) >= -1, "nothing goes past full scale");
assert.equal(A.processChannels([new Float32Array(100)], rate, { ...A.DEFAULT_EDIT, normalize: true })[0].every((x) => x === 0), true, "silence stays silent when normalised");
assert.deepEqual(A.processChannels([], rate, A.DEFAULT_EDIT), []);
// the audible range ignores quiet at the ends
const padded = new Float32Array(rate * 6); padded.set(tone(2), rate * 2);
const range = A.audibleRangeMs([padded], rate);
assert.ok(range.startMs >= 1800 && range.startMs <= 2000 && range.endMs >= 4000 && range.endMs <= 4200, JSON.stringify(range));
assert.equal(A.audibleRangeMs([new Float32Array(rate)], rate), null);
// waveform peaks
const peaks = A.waveformPeaks([padded], 6);
assert.ok(peaks[0] < 0.01 && peaks[2] > 0.4 && peaks[5] < 0.01);
// WAV bytes are a valid file
const wav = A.encodeWav([tone(1), tone(1, 0.25)], rate), dv = new DataView(wav.buffer);
assert.equal(String.fromCharCode(...wav.slice(0, 4)), "RIFF"); assert.equal(String.fromCharCode(...wav.slice(8, 12)), "WAVE");
assert.equal(dv.getUint16(22, true), 2); assert.equal(dv.getUint32(24, true), rate); assert.equal(dv.getUint32(40, true), rate * 2 * 2);
assert.equal(wav.length, 44 + rate * 4); assert.throws(() => A.encodeWav([], rate), /mono and stereo/);
// chapters follow the trim
const mk = A.markersInExport(edit, 4 * rate, rate);
assert.deepEqual(mk, [{ ms: 500, name: "First one" }, { ms: 1500, name: "Second" }].map((m) => m), "markers move with the trim");
assert.equal(A.markersInExport({ ...edit, trimStartMs: 1500 }, 4 * rate, rate).length, 1, "markers before the trim are dropped");
assert.deepEqual(JSON.parse(A.chaptersJson(mk)).chapters.map((c) => c.title), ["Start", "First one", "Second"]);
assert.equal(A.chaptersText([{ ms: 3_725_000, name: "Late" }]), "01:02:05 Late");
assert.equal(A.exportFileName("My show: ep 1!", "wav"), "fresh-studio-My-show-ep-1.wav");
console.log("Fresh Studio audio contract passed (settings, trim, fades, gain, normalise, waveform, WAV and chapters).");

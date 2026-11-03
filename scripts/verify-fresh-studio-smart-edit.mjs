import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const have = (bin) => spawnSync(bin, ["-version"]).status === 0;
if (!have("ffmpeg") || !have("ffprobe")) {
  if (process.env.FRESH_REQUIRE_FFMPEG) throw new Error("ffmpeg and ffprobe are required for this test.");
  console.log("Fresh Studio smart-edit contract SKIPPED: ffmpeg/ffprobe are not installed here.");
  process.exit(0);
}

const base = "../src/features/fresh-studio/video-studio/";
const T = await import(base + "timeline.ts");
const A = await import(base + "analysis.ts");
const C = await import(base + "captions.ts");
const R = await import(base + "renderPlan.ts");
const { createTimeline, addAsset, addClip, setClipSpeed, trackClips, timelineDuration, validateTimeline } = T;

const dir = fs.mkdtempSync(path.join(process.env.FRESH_TEST_TMP || os.tmpdir(), "fresh-studio-smart-"));
const run = (bin, args) => spawnSync(bin, args, { encoding: "utf8" });
const ff = (...args) => { const r = run("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", ...args]); assert.equal(r.status, 0, r.stderr); };
const duration = (f) => Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", f]).toString());
const near = (a, e, tol, label) => assert.ok(Math.abs(a - e) <= tol, `${label}: expected ~${e}, got ${a}`);

// --- Source: 7.8s of tone with silence at 2.0–3.5s and 5.5–6.3s, over a test pattern
const SPEECH = path.join(dir, "speech.mp4");
ff("-f", "lavfi", "-i", "testsrc=duration=7.8:size=320x240:rate=30",
   "-f", "lavfi", "-i", "aevalsrc=if(between(t\\,2\\,3.5)+between(t\\,5.5\\,6.3)\\,0\\,0.5*sin(2*PI*440*t)):d=7.8:s=44100",
   "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest", SPEECH);
const TOTAL = duration(SPEECH);

// --- 1) Silence detection finds what we put there
const sil = A.parseSilence(run("ffmpeg", A.silenceDetectArgs(SPEECH)).stderr, TOTAL);
assert.equal(sil.length, 2, JSON.stringify(sil));
near(sil[0].start, 2.0, 0.12, "silence 1 start"); near(sil[0].end, 3.5, 0.12, "silence 1 end");
near(sil[1].start, 5.5, 0.12, "silence 2 start"); near(sil[1].end, 6.3, 0.12, "silence 2 end");

// --- parser edge cases
assert.deepEqual(A.parseSilence("[x] silence_start: 1.5\n", 4), [{ start: 1.5, end: 4 }], "trailing silence runs to the end");
assert.deepEqual(A.parseSilence("nothing here", 4), []);
assert.deepEqual(A.parseSceneTimes("pts_time:2.0 x pts_time:4.0 pts_time:2.0"), [2, 4], "scene times are unique and sorted");

// --- 2) Silences become timeline edits
const asset = { id: "speech", name: "speech", kind: "video", duration: TOTAL, width: 320, height: 240, hasAudio: true };
let doc = addAsset(createTimeline(30), asset);
doc = addClip(doc, { trackId: "v1", assetId: "speech", id: "c1" });
const result = A.removeSilences(doc, "c1", sil);
assert.equal(result.cuts, 2);
near(result.removedSeconds, 1.9, 0.25, "removed seconds");
assert.deepEqual(validateTimeline(result.doc), [], "edited timeline is valid");
near(timelineDuration(result.doc), TOTAL - result.removedSeconds, 0.01, "timeline length matches removal");
const pieces = trackClips(result.doc, "v1");
assert.equal(pieces.length, 3);
for (let i = 1; i < pieces.length; i += 1) near(pieces[i].start, pieces[i - 1].start + (pieces[i - 1].sourceOut - pieces[i - 1].sourceIn), 0.002, "pieces are packed without gaps");
// Speech is never clipped: every piece keeps padding around the pauses
assert.ok(pieces[0].sourceOut >= sil[0].start + 0.09, "padding kept before the pause");
assert.ok(pieces[1].sourceIn <= sil[0].end - 0.09, "padding kept after the pause");
// Short pauses are left alone
assert.equal(A.removeSilences(doc, "c1", sil, { minSilence: 2 }).cuts, 0, "pauses shorter than the minimum are kept");
assert.equal(A.removeSilences(doc, "c1", []).doc, doc, "no silences means no change");
// Works on an already sped-up clip
const fast = setClipSpeed(doc, "c1", 2);
const fastCut = A.removeSilences(fast, "c1", sil);
assert.equal(fastCut.cuts, 2);
assert.deepEqual(validateTimeline(fastCut.doc), []);
near(fastCut.removedSeconds, 1.9 / 2, 0.15, "removed time is measured in timeline seconds at 2x");

// --- 3) Render the result for real: right length, no dead air left
const sources = { speech: SPEECH };
const out = path.join(dir, "tight.mp4");
const plan = R.planRender({ doc: result.doc, preset: "360p", aspectRatio: "16:9", sources, outputPath: out });
assert.ok(plan.ok, plan.errors?.join("; "));
ff(...plan.args);
near(duration(out), timelineDuration(result.doc), 0.25, "rendered length");
const leftover = A.parseSilence(run("ffmpeg", A.silenceDetectArgs(out, { minSilence: 0.5 })).stderr, duration(out));
assert.equal(leftover.length, 0, `no pause of 0.5s or more remains in the render: ${JSON.stringify(leftover)}`);

// --- 4) Scene detection on a three-colour clip
const SCENES = path.join(dir, "scenes.mp4");
ff("-f", "lavfi", "-i", "color=c=red:s=320x240:r=30:d=2", "-f", "lavfi", "-i", "color=c=blue:s=320x240:r=30:d=2", "-f", "lavfi", "-i", "color=c=green:s=320x240:r=30:d=2",
   "-filter_complex", "[0][1][2]concat=n=3:v=1:a=0[v]", "-map", "[v]", "-c:v", "libx264", "-pix_fmt", "yuv420p", SCENES);
const scenes = A.parseSceneTimes(run("ffmpeg", A.sceneDetectArgs(SCENES)).stderr);
assert.equal(scenes.length, 2, JSON.stringify(scenes));
near(scenes[0], 2, 0.1, "scene 1"); near(scenes[1], 4, 0.1, "scene 2");
let sdoc = addAsset(createTimeline(30), { id: "scenes", name: "scenes", kind: "video", duration: duration(SCENES), width: 320, height: 240, hasAudio: false });
sdoc = addClip(sdoc, { trackId: "v1", assetId: "scenes", id: "s1" });
const split = A.splitAtScenes(sdoc, "s1", scenes);
assert.equal(split.splits, 2);
assert.equal(trackClips(split.doc, "v1").length, 3);
assert.deepEqual(validateTimeline(split.doc), []);
assert.equal(A.splitAtScenes(sdoc, "s1", [0.3, 5.8]).splits, 0, "scene changes that would make tiny pieces are ignored");

// --- 5) Captions: import/export round trips
const srt = "\uFEFF1\r\n00:00:00,500 --> 00:00:01,500\r\n<i>Hello</i> world\r\n\r\n2\r\n00:00:01.900 --> 00:00:03.800\r\nAmina: this crosses a cut\r\n\r\nbad block\r\nno times here\r\n\r\n3\r\n00:00:04,000 --> 00:00:03,000\r\nbackwards\r\n";
const parsed = C.parseCaptions(srt);
assert.equal(parsed.cues.length, 2);
assert.equal(parsed.skipped, 2, "malformed and backwards cues are skipped, not guessed");
assert.equal(parsed.cues[0].text, "Hello world", "markup is stripped");
assert.equal(parsed.cues[1].speaker, "Amina");
const vtt = "WEBVTT\n\nNOTE a comment\n\n00:01.000 --> 00:02.000 line:90%\nFirst\n\n1:00:00.250 --> 1:00:01.000\nHour mark\n";
const pv = C.parseCaptions(vtt);
assert.equal(pv.cues.length, 2);
assert.equal(pv.cues[1].start, 3600.25);
const roundTrip = C.parseCaptions(C.serializeSrt(parsed.cues));
assert.deepEqual(roundTrip.cues.map((c) => [c.start, c.end, c.text]), parsed.cues.map((c) => [c.start, c.end, c.text]));
assert.match(C.serializeVtt(parsed.cues), /^WEBVTT\n\n00:00:00\.500 --> 00:00:01\.500\n/);
assert.equal(C.serializeSrt([]), "");
assert.deepEqual(C.validateCues([{ id: "a", start: 0, end: 2, text: "x" }, { id: "b", start: 1, end: 3, text: "y" }]).map((i) => i.message), ["Overlaps the previous caption."]);
assert.equal(C.formatTimestamp(3661.5, ","), "01:01:01,500");

// --- 6) Captions follow the cuts (the caption "crosses a cut" is split around the removed silence)
const cues = [{ id: "k1", start: 0.5, end: 1.5, text: "Before the pause" }, { id: "k2", start: 1.9, end: 3.8, text: "Across the pause" }, { id: "k3", start: 4.0, end: 5.0, text: "After the pause" }, { id: "k4", start: 2.2, end: 3.3, text: "Inside the cut" }];
const mapped = C.remapCuesToTimeline(result.doc, "speech", cues);
const by = (id) => mapped.filter((c) => c.id.startsWith(id));
near(by("k1")[0].start, 0.5, 0.01, "caption before first cut is unchanged");
assert.equal(by("k2").length, 2, "a caption across a cut becomes two pieces");
near(by("k2")[1].start, by("k2")[0].end, 0.12, "the two pieces meet at the cut");
assert.ok(by("k3")[0].start < 4.0 - 1.0, "later captions move earlier by the removed time");
assert.equal(by("k4").length, 0, "a caption entirely inside removed silence disappears");
assert.deepEqual(C.validateCues(mapped).filter((i) => /Overlaps/.test(i.message)), [], "remapped captions do not overlap");

// --- 7) Burn-in really changes the picture, and is absent without captions
const capFile = path.join(dir, "caps.srt");
fs.writeFileSync(capFile, C.serializeSrt([{ id: "x", start: 0.2, end: 3, text: "BURNED IN CAPTION" }]));
const withCaps = path.join(dir, "with.mp4"), without = path.join(dir, "without.mp4");
const mk = (o, extra) => { const p = R.planRender({ doc: result.doc, preset: "360p", aspectRatio: "16:9", sources, outputPath: o, ...extra }); assert.ok(p.ok, p.errors?.join("; ")); ff(...p.args); };
mk(withCaps, { captionsFile: capFile }); mk(without, {});
// Re-encoding shifts pixels slightly everywhere, so compare picture similarity, not exact hashes.
const psnr = (t) => {
  const r = run("ffmpeg", ["-hide_banner", "-ss", String(t), "-t", "0.3", "-i", withCaps, "-ss", String(t), "-t", "0.3", "-i", without, "-lavfi", "psnr", "-f", "null", "-"]);
  const m = r.stderr.match(/average:(inf|[\d.]+)/);
  assert.ok(m, r.stderr.slice(-300));
  return m[1] === "inf" ? 100 : Number(m[1]);
};
const during = psnr(1), after = psnr(4.5);
assert.ok(after - during > 8, `caption is visible while on screen (PSNR ${during.toFixed(1)} dB) and gone afterwards (${after.toFixed(1)} dB)`);
near(duration(withCaps), duration(without), 0.1, "burn-in does not change length");
assert.ok(C.escapeFilterPath("C:\\a b\\it's.srt").includes("C\\:/a b/it\\'s.srt"));

// --- 8) Honest transcription status
const status = C.getTranscriptionStatus();
assert.equal(status.available, false);
assert.match(status.reason, /not connected/i);
assert.equal(C.getTranscriptionStatus([{ id: "p", name: "P", languages: ["en"], transcribe: async () => ({ cues: [], language: "en" }) }]).available, true);

fs.rmSync(dir, { recursive: true, force: true });
console.log("Fresh Studio smart-edit contract passed (silence, scenes, captions verified on real media).");

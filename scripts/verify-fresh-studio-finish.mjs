// Audio finishing (clean-up, ducking, loudness) and green-screen removal, checked on real ffmpeg output.
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const base = "../src/features/fresh-studio/video-studio/";
const T = await import(base + "timeline.ts");
const R = await import(base + "renderPlan.ts");
const have = spawnSync("ffmpeg", ["-version"]).status === 0;
if (!have && process.env.FRESH_REQUIRE_FFMPEG) assert.fail("ffmpeg is required");

// ---------- model ----------
{
  let d = T.addClip(T.addAsset(T.createTimeline(30), { id: "a", name: "a", kind: "video", duration: 4, width: 320, height: 180, hasAudio: true }), { trackId: "v1", assetId: "a", id: "c1" });
  const f = T.setAudioFinish(d, { cleanup: true, loudness: "social" });
  assert.deepEqual(f.audioFinish, { cleanup: true, loudness: "social" });
  assert.equal(T.validateTimeline(f).length, 0);
  assert.equal(T.setAudioFinish(T.setAudioFinish(f, { cleanup: false }), { loudness: null }).audioFinish, undefined, "all off removes the setting");
  assert.throws(() => T.setAudioFinish(d, { loudness: "loud" }), /Unknown loudness/);
  assert.ok(T.validateTimeline({ ...d, audioFinish: { duck: "yes" } }).length > 0, "bad saved data is rejected");
  assert.throws(() => T.setClipLayer(d, "c1", { chroma: { color: "#00ff00", similarity: 0.3 } }), /upper video track/);
  d = T.addVideoLayer(d);
  const lt = d.tracks.filter((t) => t.kind === "video")[1].id;
  d = T.addClip(d, { trackId: lt, assetId: "a", id: "c2" });
  const k = T.setClipLayer(d, "c2", { chroma: { color: "#00FF00", similarity: 0.3 } });
  assert.deepEqual(k.clips.find((c) => c.id === "c2").layer.chroma, { color: "#00ff00", similarity: 0.3 });
  assert.equal(T.setClipLayer(k, "c2", { x: 0.5 }).clips.find((c) => c.id === "c2").layer.chroma.similarity, 0.3, "moving keeps the key");
  assert.equal(T.setClipLayer(k, "c2", { chroma: null }).clips.find((c) => c.id === "c2").layer.chroma, undefined);
  assert.throws(() => T.setClipLayer(d, "c2", { chroma: { color: "green", similarity: 0.3 } }), /colour to remove/);
  assert.throws(() => T.setClipLayer(d, "c2", { chroma: { color: "#00ff00", similarity: 0.9 } }), /range/);
}

if (!have) { console.log("Fresh Studio finishing model checks passed (ffmpeg not installed, render checks skipped)."); process.exit(0); }

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "fresh-finish-"));
const ff = (...a) => execFileSync("ffmpeg", ["-v", "error", "-y", ...a], { stdio: ["ignore", "pipe", "pipe"] });
/** Mean level (dB) of a sound after an optional filter, over a time window. */
const level = (file, from, to, af = "anull") => {
  const r = spawnSync("ffmpeg", ["-hide_banner", "-ss", String(from), "-t", String(to - from), "-i", file, "-af", `${af},volumedetect`, "-f", "null", "-"], { encoding: "utf8" });
  const m = r.stderr.match(/mean_volume: (-?[\d.]+|-inf) dB/);
  assert.ok(m, `no level for ${file}: ${r.stderr.slice(-200)}`);
  return m[1] === "-inf" ? -120 : Number(m[1]);
};
const render = (doc, sources, name) => {
  const out = path.join(dir, name);
  const plan = R.planRender({ doc, preset: "480p", aspectRatio: "16:9", sources, outputPath: out });
  assert.ok(plan.ok, JSON.stringify(plan.errors));
  ff(...plan.args);
  return out;
};
const withAsset = (id, file, hasAudio, dur) => ({ id, name: id, kind: "video", duration: dur, width: 320, height: 180, hasAudio });

// ---------- ducking: music is quieter while the voice speaks ----------
{
  // voice: a 440 Hz tone for the first 2 s, then silence for 2 s. music: a steady 1 kHz tone, quieter.
  const voice = path.join(dir, "voice.mp4"), music = path.join(dir, "music.mp3");
  ff("-f", "lavfi", "-i", "color=c=black:s=320x180:r=30:d=4", "-f", "lavfi", "-i", "aevalsrc='if(lt(t,2),0.5*sin(2*PI*300*t),0)':s=44100:d=4", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest", voice);
  ff("-f", "lavfi", "-i", "sine=frequency=1000:sample_rate=44100:duration=4", "-af", "volume=0.35", music);
  let doc = T.addClip(T.addAsset(T.createTimeline(30), withAsset("v", voice, true, 4)), { trackId: "v1", assetId: "v", id: "c1" });
  doc = T.addAsset(doc, { id: "m", name: "m", kind: "audio", duration: 4, width: null, height: null, hasAudio: true });
  const mt = doc.tracks.find((t) => t.kind === "music");
  doc = T.addClip(doc, { trackId: mt.id, assetId: "m", id: "m1" });
  const src = { v: voice, m: music };
  const key = "bandpass=f=1000:width_type=h:w=40";
  const plain = render(doc, src, "plain.mp4"), ducked = render(T.setAudioFinish(doc, { duck: true }), src, "ducked.mp4");
  const plainTalk = level(plain, 0.5, 1.8, key), plainQuiet = level(plain, 2.5, 3.8, key);
  const duckTalk = level(ducked, 0.5, 1.8, key), duckQuiet = level(ducked, 2.5, 3.8, key);
  assert.ok(Math.abs(plainTalk - plainQuiet) < 1.5, `music is steady without ducking (${plainTalk} vs ${plainQuiet})`);
  assert.ok(duckTalk < duckQuiet - 6, `music is at least 6 dB lower while speaking (${duckTalk} vs ${duckQuiet})`);
  assert.ok(duckQuiet > plainQuiet - 3, `music returns to full level when the voice stops (${duckQuiet} vs ${plainQuiet})`);
}

// ---------- loudness: a quiet clip is brought to the target ----------
{
  const quiet = path.join(dir, "quiet.mp4");
  ff("-f", "lavfi", "-i", "color=c=black:s=320x180:r=30:d=6", "-f", "lavfi", "-i", "anoisesrc=color=pink:amplitude=0.02:sample_rate=44100:duration=6", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest", quiet);
  const doc = T.addClip(T.addAsset(T.createTimeline(30), withAsset("q", quiet, true, 6)), { trackId: "v1", assetId: "q", id: "c1" });
  const lufs = (f) => { const r = spawnSync("ffmpeg", ["-hide_banner", "-i", f, "-af", "ebur128=peak=true", "-f", "null", "-"], { encoding: "utf8" }); const m = r.stderr.match(/I:\s+(-?[\d.]+) LUFS/g); return Number(m.at(-1).match(/(-?[\d.]+)/)[1]); };
  const before = lufs(render(doc, { q: quiet }, "q0.mp4"));
  const social = lufs(render(T.setAudioFinish(doc, { loudness: "social" }), { q: quiet }, "q1.mp4"));
  const podcast = lufs(render(T.setAudioFinish(doc, { loudness: "podcast" }), { q: quiet }, "q2.mp4"));
  assert.ok(before < -30, `the source is quiet (${before} LUFS)`);
  assert.ok(Math.abs(social - -14) < 2.5, `social lands near -14 LUFS (${social})`);
  assert.ok(Math.abs(podcast - -16) < 2.5, `podcast lands near -16 LUFS (${podcast})`);
  assert.ok(social > podcast + 0.5, "social is louder than podcast");
}

// ---------- clean-up: steady noise is reduced, speech-like tone is kept ----------
{
  const noisy = path.join(dir, "noisy.mp4");
  // 0-2 s noise only, 2-4 s noise plus a 440 Hz tone
  ff("-f", "lavfi", "-i", "color=c=black:s=320x180:r=30:d=4", "-f", "lavfi", "-i", "anoisesrc=color=white:amplitude=0.05:sample_rate=44100:duration=4", "-f", "lavfi", "-i", "aevalsrc='if(gte(t,2),0.4*sin(2*PI*440*t),0)':s=44100:d=4", "-filter_complex", "[1][2]amix=inputs=2:normalize=0[a]", "-map", "0:v", "-map", "[a]", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest", noisy);
  const doc = T.addClip(T.addAsset(T.createTimeline(30), withAsset("n", noisy, true, 4)), { trackId: "v1", assetId: "n", id: "c1" });
  const A = await import(base + "analysis.ts");
  const pcm = execFileSync("ffmpeg", ["-v", "error", "-i", noisy, "-vn", "-ac", "1", "-ar", "8000", "-f", "f32le", "-"], { maxBuffer: 1 << 26 });
  const floor = A.estimateNoiseFloorDb(new Float32Array(pcm.buffer, pcm.byteOffset, pcm.length / 4), 8000);
  assert.ok(floor !== null && floor <= -28 && floor >= -38, `the noise level is measured from the recording (${floor} dB)`);
  assert.equal(A.estimateNoiseFloorDb(new Float32Array(100), 8000), null, "no sound, no estimate");
  assert.throws(() => T.setAudioFinish(T.setAudioFinish(doc, { cleanup: true }), { noiseFloor: -5 }), /Noise level/);
  assert.equal(T.setAudioFinish(T.setAudioFinish(T.setAudioFinish(doc, { cleanup: true }), { noiseFloor: floor }), { cleanup: false }).audioFinish, undefined, "turning clean-up off forgets the measurement");
  const raw = render(doc, { n: noisy }, "n0.mp4"), clean = render(T.setAudioFinish(T.setAudioFinish(doc, { cleanup: true }), { noiseFloor: floor }), { n: noisy }, "n1.mp4");
  const noiseRaw = level(raw, 0.5, 1.8), noiseClean = level(clean, 0.5, 1.8);
  const toneRaw = level(raw, 2.5, 3.8, "bandpass=f=440:width_type=h:w=100"), toneClean = level(clean, 2.5, 3.8, "bandpass=f=440:width_type=h:w=100");
  assert.ok(noiseClean < noiseRaw - 6, `steady noise drops by at least 6 dB (${noiseRaw} -> ${noiseClean})`);
  assert.ok(toneClean > toneRaw - 6, `the tone is kept (${toneRaw} -> ${toneClean})`);
}

// ---------- green screen: the keyed colour shows what is underneath ----------
{
  const stat = (file, at, crop) => { const r = spawnSync("ffmpeg", ["-hide_banner", "-ss", String(at), "-i", file, "-frames:v", "1", "-vf", `${crop},signalstats,metadata=print:key=lavfi.signalstats.UAVG`, "-f", "null", "-"], { encoding: "utf8" }); return Number((r.stderr.match(/UAVG=([\d.]+)/) ?? [])[1]); };
  const bg = path.join(dir, "red.mp4"), screen = path.join(dir, "screen.mp4");
  ff("-f", "lavfi", "-i", "color=c=0xff0000:s=320x180:r=30:d=3", "-c:v", "libx264", "-pix_fmt", "yuv420p", bg);
  // green screen with a blue square in the middle
  ff("-f", "lavfi", "-i", "color=c=0x00ff00:s=320x180:r=30:d=3", "-vf", "drawbox=x=110:y=50:w=100:h=80:color=0x0000ff:t=fill", "-c:v", "libx264", "-pix_fmt", "yuv420p", screen);
  let doc = T.addClip(T.addAsset(T.addAsset(T.createTimeline(30), withAsset("bg", bg, false, 3)), withAsset("sc", screen, false, 3)), { trackId: "v1", assetId: "bg", id: "c1" });
  doc = T.addVideoLayer(doc);
  const lt = doc.tracks.filter((t) => t.kind === "video")[1].id;
  doc = T.addClip(doc, { trackId: lt, assetId: "sc", id: "c2" });
  doc = T.setClipLayer(doc, "c2", { x: 0.5, y: 0.5, width: 1, opacity: 1 });
  const src = { bg, sc: screen };
  const corner = "crop=iw/10:ih/10:0:0", middle = "crop=iw/10:ih/10:iw*0.45:ih*0.45";
  const plain = render(doc, src, "g0.mp4");
  assert.ok(stat(plain, 1, corner) < 110, "without the key, the corner is green (low U)");
  const keyed = render(T.setClipLayer(doc, "c2", { chroma: { color: "#00ff00", similarity: 0.3 } }), src, "g1.mp4");
  assert.ok(stat(keyed, 1, corner) < 100 && stat(keyed, 1, corner) > 0, "corner shows the red background (U stays low, V high)");
  const uPlain = stat(plain, 1, corner), uKeyed = stat(keyed, 1, corner);
  assert.ok(Math.abs(uKeyed - uPlain) > 8, `the corner changes when the green is keyed out (${uPlain} -> ${uKeyed})`);
  assert.ok(stat(keyed, 1, middle) > 200, "the blue square stays");
}
console.log("Fresh Studio finishing contract passed (ducking, loudness, noise clean-up and green screen verified on real ffmpeg output).");

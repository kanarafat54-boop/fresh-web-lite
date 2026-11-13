import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const base = "../src/features/fresh-studio/video-studio/";
const T = await import(base + "timeline.ts");
const R = await import(base + "renderPlan.ts");

const asset = (id, duration, kind, hasAudio, w = 640, h = 360) => ({ id, name: id, kind, duration, width: w, height: h, hasAudio });
const mk = () => T.addClip(T.addAsset(T.addAsset(T.createTimeline(30), asset("a", 6, "video", true)), asset("b", 4, "video", false, 320, 240)), { trackId: "v1", assetId: "a", id: "c1" });

// ---------- model (pure) ----------
{
  let d = mk();
  assert.equal(T.validateTimeline(d).length, 0);
  d = T.setClipAudio(d, "c1", { volume: 1.5 });
  assert.equal(d.clips[0].volume, 1.5);
  assert.throws(() => T.setClipAudio(d, "c1", { volume: 2.5 }), /Volume/);
  assert.throws(() => T.setClipAudio(d, "c1", { volume: -1 }), /Volume/);
  assert.throws(() => T.setClipAudio(d, "c1", { fadeIn: -1 }), /negative/);
  // fades are capped at the clip length and the other fade yields
  let f = T.setClipAudio(d, "c1", { fadeIn: 4 });
  f = T.setClipAudio(f, "c1", { fadeOut: 4 });
  assert.ok(f.clips[0].fadeIn + f.clips[0].fadeOut <= 6.0001, "fades never exceed the clip");
  assert.equal(f.clips[0].fadeOut, 4); assert.equal(f.clips[0].fadeIn, 2);
  assert.equal(T.validateTimeline(f).length, 0);
  // split gives the fade-in to the left half and the fade-out to the right half only
  let s = T.setClipAudio(d, "c1", { fadeIn: 1, fadeOut: 1 });
  s = T.splitClip(s, "c1", 3, "c2");
  const [l, r] = [s.clips.find((c) => c.id === "c1"), s.clips.find((c) => c.id === "c2")];
  assert.equal(l.fadeIn, 1); assert.ok(!l.fadeOut); assert.ok(!r.fadeIn); assert.equal(r.fadeOut, 1);
  // trimming and speed re-fit fades so a saved timeline always stays valid
  let t = T.setClipAudio(d, "c1", { fadeIn: 2, fadeOut: 2 });
  t = T.trimClipEnd(t, "c1", 1);
  assert.equal(T.validateTimeline(t).length, 0);
  t = T.setClipSpeed(T.setClipAudio(d, "c1", { fadeIn: 3, fadeOut: 3 }), "c1", 4);
  assert.equal(T.validateTimeline(t).length, 0);
  // look
  assert.throws(() => T.setClipLook(d, "c1", { brightness: 2, contrast: 1, saturation: 1 }), /range/);
  assert.throws(() => T.setClipLook(d, "c1", { brightness: 0, contrast: 1, saturation: NaN }), /range/);
  const lk = T.setClipLook(d, "c1", T.LOOK_PRESETS[1].look); assert.equal(lk.clips[0].look.saturation, 0);
  assert.ok(!("look" in T.setClipLook(lk, "c1", null).clips[0]));
  assert.throws(() => T.setClipFit(d, "c1", "stretch"), /framing/);
  assert.equal(T.setClipFit(d, "c1", "fill").clips[0].fit, "fill");
  assert.throws(() => T.setAspect(d, "5:3"), /aspect/); assert.equal(T.setAspect(d, "9:16").aspect, "9:16");
  // locked tracks refuse look/audio edits
  const locked = T.setTrackFlags(d, "v1", { locked: true });
  assert.throws(() => T.setClipLook(locked, "c1", T.LOOK_PRESETS[2].look), /locked/);
  // text
  let x = T.addText(d, { start: 1, id: "t1", text: "Hello" });
  assert.equal(x.texts.length, 1); assert.deepEqual(T.textsAt(x, 2).map((q) => q.id), ["t1"]); assert.equal(T.textsAt(x, 5).length, 0);
  assert.throws(() => T.addText(d, { start: 0, text: "   " }), /empty/);
  assert.throws(() => T.addText(d, { start: 0, text: "x".repeat(201) }), /at most 200/);
  assert.throws(() => T.addText(d, { start: 0, text: "a\u0000b" }), /cannot be shown/);
  assert.throws(() => T.updateText(x, "t1", { color: "red" }), /colour/);
  assert.throws(() => T.updateText(x, "t1", { x: 1.5 }), /inside the frame/);
  assert.throws(() => T.updateText(x, "t1", { duration: 0.05 }), /at least/);
  x = T.updateText(x, "t1", { text: "Line 1\nLine 2", bold: false, box: true, color: "#ff0000" });
  assert.equal(x.texts[0].text, "Line 1\nLine 2");
  assert.equal(T.validateTimeline(x).length, 0);
  assert.equal(T.deleteText(x, "t1").texts.length, 0);
  assert.throws(() => T.deleteText(x, "nope"), /no longer/);
  let many = d; for (let i = 0; i < T.MAX_TEXTS; i += 1) many = T.addText(many, { start: i });
  assert.throws(() => T.addText(many, { start: 0 }), /at most/);
  // corrupt saved data is caught by validation
  assert.ok(T.validateTimeline({ ...d, texts: [{ id: "q", text: "", start: 0, duration: 1, x: 0.5, y: 0.5, size: 0.1, color: "#fff", bold: true, box: false }] }).length > 0);
  assert.ok(T.validateTimeline({ ...d, aspect: "7:3" }).length > 0);
  assert.ok(T.validateTimeline({ ...d, clips: [{ ...d.clips[0], volume: 9 }] }).length > 0);
  // old documents without any of the new fields still validate and plan
  assert.equal(T.validateTimeline(JSON.parse(JSON.stringify(mk()))).length, 0);
}

// ---------- renderer (real ffmpeg) ----------
const have = (bin) => spawnSync(bin, ["-version"]).status === 0;
const FONTS = { regular: "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", bold: "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" };
if (!have("ffmpeg") || !have("ffprobe") || !fs.existsSync(FONTS.bold)) {
  if (process.env.FRESH_REQUIRE_FFMPEG) throw new Error("ffmpeg, ffprobe and the DejaVu fonts are required for this test.");
  console.log("Fresh Studio look contract: model checks passed; render checks SKIPPED (ffmpeg or fonts missing).");
  process.exit(0);
}
const dir = fs.mkdtempSync(path.join(process.env.FRESH_TEST_TMP || os.tmpdir(), "fresh-studio-look-"));
const ff = (...args) => execFileSync("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", ...args], { stdio: "pipe" });
const A = path.join(dir, "a.mp4"), B = path.join(dir, "b.mp4"), DARK = path.join(dir, "dark.mp4");
ff("-f", "lavfi", "-i", "testsrc=duration=6:size=640x360:rate=30", "-f", "lavfi", "-i", "sine=frequency=440:duration=6", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-shortest", A);
ff("-f", "lavfi", "-i", "testsrc2=duration=4:size=320x240:rate=25", "-c:v", "libx264", "-pix_fmt", "yuv420p", B);
ff("-f", "lavfi", "-i", "color=c=0x202020:s=640x360:d=6:r=30", "-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo", "-t", "6", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", DARK);
const sources = { a: A, b: B, dark: DARK };

const render = (doc, extra = {}, preset = "360p", aspect = "16:9") => {
  const out = path.join(dir, `o-${Math.random().toString(36).slice(2)}.mp4`);
  const plan = R.planRender({ doc, preset, aspectRatio: aspect, sources, outputPath: out, ...extra });
  assert.ok(plan.ok, plan.errors?.join("; "));
  ff(...plan.args);
  return out;
};
const stat = (file, key, { at = 0, vf = "" } = {}) => {
  const r = spawnSync("ffmpeg", ["-hide_banner", "-ss", String(at), "-i", file, "-frames:v", "1", "-vf", `${vf}${vf ? "," : ""}signalstats,metadata=print:file=-`, "-f", "null", "-"], { encoding: "utf8" });
  const m = (r.stdout + r.stderr).match(new RegExp(`lavfi\\.signalstats\\.${key}=([\\d.]+)`));
  assert.ok(m, `no ${key} in ${r.stderr.slice(-200)}`);
  return Number(m[1]);
};
const vol = (file, from, to) => {
  const r = spawnSync("ffmpeg", ["-hide_banner", "-ss", String(from), "-t", String(to - from), "-i", file, "-vn", "-af", "volumedetect", "-f", "null", "-"], { encoding: "utf8" });
  const m = r.stderr.match(/mean_volume:\s*(-?[\d.]+|-inf) dB/); return m[1] === "-inf" ? -Infinity : Number(m[1]);
};
const near = (a, e, tol, label) => assert.ok(Math.abs(a - e) <= tol, `${label}: expected ~${e}, got ${a}`);

// volume
{
  const plain = vol(render(mk()), 0.5, 5);
  const half = vol(render(T.setClipAudio(mk(), "c1", { volume: 0.5 })), 0.5, 5);
  const boost = vol(render(T.setClipAudio(mk(), "c1", { volume: 2 })), 0.5, 5);
  const mute = vol(render(T.setClipAudio(mk(), "c1", { volume: 0 })), 0.5, 5);
  near(plain - half, 6, 0.6, "half volume is about -6 dB");
  near(boost - plain, 6, 0.8, "double volume is about +6 dB");
  assert.ok(mute < -80, `volume 0 is silent (${mute})`);
}
// fades (audio and picture)
{
  const d = T.setClipAudio(mk(), "c1", { fadeIn: 1, fadeOut: 1 });
  const out = render(d);
  assert.ok(vol(out, 0, 0.25) < vol(out, 2, 3) - 8, "audio fades in");
  assert.ok(vol(out, 5.75, 6) < vol(out, 2, 3) - 8, "audio fades out");
  assert.ok(stat(out, "YAVG", { at: 0 }) < 25, "picture starts black");
  assert.ok(stat(out, "YAVG", { at: 3 }) > 60, "picture is normal mid-clip");
  assert.ok(stat(out, "YAVG", { at: 5.95 }) < 40, "picture ends black");
}
// colour
{
  const plainFrame = render(mk());
  const mono = render(T.setClipLook(mk(), "c1", T.LOOK_PRESETS[1].look));
  assert.ok(stat(plainFrame, "SATAVG", { at: 2 }) > 30, "source has colour");
  assert.ok(stat(mono, "SATAVG", { at: 2 }) < 3, "Mono removes colour");
  const bright = render(T.setClipLook(mk(), "c1", { brightness: 0.3, contrast: 1, saturation: 1 }));
  assert.ok(stat(bright, "YAVG", { at: 2 }) > stat(plainFrame, "YAVG", { at: 2 }) + 20, "brightness raises luma");
  const vivid = render(T.setClipLook(mk(), "c1", T.LOOK_PRESETS[2].look));
  assert.ok(stat(vivid, "SATAVG", { at: 2 }) > stat(plainFrame, "SATAVG", { at: 2 }) + 10, "Vivid adds colour");
}
// fit vs fill: a 4:3 source in a 16:9 frame
{
  let d = T.addClip(T.addAsset(T.createTimeline(30), asset("b", 4, "video", false, 320, 240)), { trackId: "v1", assetId: "b", id: "c1" });
  const edge = "crop=24:360:0:0";
  const fit = render(d, {}, "360p"); const fill = render(T.setClipFit(d, "c1", "fill"), {}, "360p");
  assert.ok(stat(fit, "YAVG", { at: 1, vf: edge }) < 20, "fit leaves black bars at the sides");
  assert.ok(stat(fill, "YAVG", { at: 1, vf: edge }) > 30, "fill covers the frame");
  const vertical = render(T.setClipFit(d, "c1", "fill"), {}, "360p", "9:16");
  const info = JSON.parse(execFileSync("ffprobe", ["-v", "error", "-print_format", "json", "-show_streams", vertical]).toString());
  assert.equal(info.streams.find((s) => s.codec_type === "video").width, 360);
}
// text
{
  const files = {}; const write = (id, text) => { files[id] = path.join(dir, `${id}.txt`); fs.writeFileSync(files[id], text, "utf8"); };
  const dark = () => T.addClip(T.addAsset(T.createTimeline(30), asset("dark", 6, "video", true)), { trackId: "v1", assetId: "dark", id: "c1" });
  const centre = "crop=200:90:220:135";
  const baseOut = render(dark());
  const baseLuma = stat(baseOut, "YAVG", { at: 1, vf: centre });

  let d = T.addText(dark(), { start: 1, duration: 2, id: "t1", text: "HELLO WORLD" });
  d = T.updateText(d, "t1", { size: 0.2 });
  write("t1", "HELLO WORLD");
  const withText = render(d, { textFiles: files, fonts: FONTS });
  assert.ok(stat(withText, "YAVG", { at: 1.5, vf: centre }) > baseLuma + 15, "text appears inside its time range");
  near(stat(withText, "YAVG", { at: 0.4, vf: centre }), baseLuma, 2, "no text before it starts");
  near(stat(withText, "YAVG", { at: 4, vf: centre }), baseLuma, 2, "no text after it ends");
  // position: moved to the top, the centre is empty
  const top = T.updateText(d, "t1", { y: 0.12 });
  near(stat(render(top, { textFiles: files, fonts: FONTS }), "YAVG", { at: 1.5, vf: centre }), baseLuma, 3, "moving the text moves it");
  // hostile text renders literally and cannot break out of the filter graph
  const nasty = "It's 100%: a, b; [c] \\ {d} %{pts} $(x) '";
  let n = T.addText(dark(), { start: 0.5, duration: 3, id: "t2", text: nasty }); n = T.updateText(n, "t2", { size: 0.15, bold: false, box: true });
  write("t2", nasty);
  const nastyOut = render(n, { textFiles: files, fonts: FONTS });
  assert.ok(stat(nastyOut, "YAVG", { at: 1.5, vf: centre }) > baseLuma + 5, "special characters render");
  // multi-line and several layers together with burned-in captions
  write("t3", "Line one\nLine two");
  let m = T.addText(d, { start: 0, duration: 4, id: "t3", text: "Line one\nLine two" });
  const srt = path.join(dir, "c.srt"); fs.writeFileSync(srt, "1\n00:00:00,500 --> 00:00:02,500\nCaption\n", "utf8");
  render(m, { textFiles: files, fonts: FONTS, captionsFile: srt });
  // caption styles
  {
    assert.equal(T.CAPTION_STYLES.length, 5);
    assert.throws(() => T.setCaptionStyle(m, "neon"), /Unknown caption style/);
    assert.ok(!("captionStyle" in T.setCaptionStyle(T.setCaptionStyle(m, "bold"), "classic")), "classic clears the setting");
    assert.equal(T.setCaptionStyle(m, "box").captionStyle, "box");
    assert.ok(T.validateTimeline({ ...m, captionStyle: "nope" }).some((e) => /caption style/.test(e)));
    assert.equal(R.captionForceStyle(undefined, 360), R.captionForceStyle("classic", 360), "classic is the original look");
    const cap = path.join(dir, "styles.srt"); fs.writeFileSync(cap, "1\n00:00:00,500 --> 00:00:03,500\nHello world\n", "utf8");
    const shot = (style) => render(T.setCaptionStyle(dark(), style), { captionsFile: cap });
    const bottom = "crop=400:60:120:290", top = "crop=400:60:120:10";
    const bright = (f, vf, at = 2) => stat(f, "YMAX", { at, vf }), avg = (f, vf, at = 2) => stat(f, "YAVG", { at, vf });
    const classic = shot("classic");
    assert.ok(bright(classic, bottom) > 200, "classic captions sit at the bottom");
    assert.ok(stat(shot("bold"), "VMAX", { at: 2, vf: bottom }) > stat(classic, "VMAX", { at: 2, vf: bottom }) + 10, "bold is yellow");
    const topped = shot("top");
    assert.ok(bright(topped, top) > 200 && bright(topped, bottom) < 80, "headline sits at the top");
    assert.ok(Math.abs(avg(shot("box"), bottom) - avg(classic, bottom)) > 0.3, "box draws a different caption from classic");
    const quiet = shot("minimal"); assert.ok(bright(quiet, bottom) > 200 && Math.abs(avg(quiet, bottom) - avg(classic, bottom)) > 0.3, "minimal still shows its text, differently from classic");
    assert.ok(bright(classic, bottom, 0.2) < 80, "captions only show while their cue lasts");
  }
  // refuses to guess
  assert.deepEqual(R.planRender({ doc: d, preset: "360p", aspectRatio: "16:9", sources, outputPath: "o.mp4" }).ok, false);
  assert.match(R.planRender({ doc: d, preset: "360p", aspectRatio: "16:9", sources, outputPath: "o.mp4", fonts: FONTS }).errors[0], /missing/);
  const badColour = { ...d, texts: [{ ...d.texts[0], color: "red;rm" }] };
  assert.equal(R.planRender({ doc: badColour, preset: "360p", aspectRatio: "16:9", sources, outputPath: "o.mp4", textFiles: files, fonts: FONTS }).ok, false);
}
// existing behaviour is untouched: an old-style clip renders the same graph as before
{
  const plan = R.planRender({ doc: mk(), preset: "360p", aspectRatio: "16:9", sources, outputPath: "o.mp4" });
  assert.ok(plan.ok);
  assert.ok(!/eq=|fade=|afade=|volume=|drawtext|alimiter/.test(plan.filterGraph), "no new filters unless asked");
}
console.log("Fresh Studio look contract passed (volume, fades, colour, framing, text verified on real media).");

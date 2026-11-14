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
  // grades: optional extras validate, store only when used, and old looks stay valid
  const g = T.setClipLook(d, "c1", { brightness: 0, contrast: 1, saturation: 1, warmth: 0.5, vignette: 0, grain: 0.2 });
  assert.equal(g.clips[0].look.warmth, 0.5); assert.ok(!("vignette" in g.clips[0].look), "zero extras are not stored"); assert.equal(T.validateTimeline(g).length, 0);
  for (const bad of [{ warmth: 1.5 }, { warmth: -2 }, { split: -0.1 }, { vignette: 2 }, { grain: NaN }]) assert.throws(() => T.setClipLook(d, "c1", { brightness: 0, contrast: 1, saturation: 1, ...bad }), /out of range/);
  const sneaky = { ...g, clips: g.clips.map((c) => ({ ...c, look: { ...c.look, grain: 9 } })) };
  assert.ok(T.validateTimeline(sneaky).some((e) => /invalid colour/.test(e)));
  assert.ok(T.LOOK_PRESETS.every((p) => T.lookExtrasValid(p.look)) && T.LOOK_PRESETS.length >= 11);
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
const GRAY = path.join(dir, "gray.mp4");
ff("-f", "lavfi", "-i", "color=c=0x808080:s=640x360:d=6:r=30", "-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo", "-t", "6", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", GRAY);
const sources = { a: A, b: B, dark: DARK, gray: GRAY };

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
  // turning, fading and moving titles
  {
    const lay = (patch, text = "WWWWWWWW", id = "t9") => {
      write(id, text);
      let x = T.addText(dark(), { start: 1, duration: 3, id, text }); x = T.updateText(x, id, { size: 0.12, ...patch }); return x;
    };
    const rend = (x) => render(x, { textFiles: files, fonts: FONTS });
    const flat = baseLuma;
    // model rules
    assert.throws(() => T.updateText(lay({}), "t9", { rotation: 200 }), /at most 180/);
    assert.throws(() => T.updateText(lay({}), "t9", { animIn: "spin" }), /Unknown/);
    assert.throws(() => T.updateText(lay({}), "t9", { animIn: "fade", animSeconds: 5 }), /between/);
    assert.throws(() => T.updateText(lay({}), "t9", { animIn: "fade", animOut: "fade", animSeconds: 2, duration: 3 }), /too short/);
    const tidy = T.updateText(T.updateText(lay({ rotation: 30, animIn: "rise" }), "t9", { rotation: 0, animIn: "none" }), "t9", {});
    assert.ok(!("rotation" in tidy.texts[0]) && !("animIn" in tidy.texts[0]) && !("animSeconds" in tidy.texts[0]), "cleared options leave nothing behind");
    // rotation: a wide word turned a quarter turn becomes tall
    const wide = rend(lay({}));
    const turned = rend(lay({ rotation: 90 }));
    const leftBand = "crop=60:40:140:160", topBand = "crop=40:60:300:60";
    assert.ok(stat(wide, "YAVG", { at: 2, vf: leftBand }) > flat + 15, "plain text reaches the left");
    assert.ok(stat(turned, "YAVG", { at: 2, vf: leftBand }) < flat + 4, "turned text no longer reaches the left");
    assert.ok(stat(turned, "YAVG", { at: 2, vf: topBand }) > flat + 15, "turned text reaches the top");
    assert.ok(stat(wide, "YAVG", { at: 2, vf: topBand }) < flat + 4, "plain text does not");
    assert.ok(stat(turned, "YAVG", { at: 0.4, vf: topBand }) < flat + 2 && stat(turned, "YAVG", { at: 4.5, vf: topBand }) < flat + 2, "turned text keeps its time window");
    // fade in and out
    const faded = rend(lay({ animIn: "fade", animOut: "fade", animSeconds: 1 }));
    const mid = "crop=200:60:220:150";
    assert.ok(stat(faded, "YAVG", { at: 1.1, vf: mid }) < stat(faded, "YAVG", { at: 2.5, vf: mid }) - 10, "fades in");
    assert.ok(stat(faded, "YAVG", { at: 3.9, vf: mid }) < stat(faded, "YAVG", { at: 2.5, vf: mid }) - 10, "fades out");
    const fadedTurned = rend(lay({ rotation: 15, animIn: "fade", animOut: "fade", animSeconds: 1 }));
    assert.ok(stat(fadedTurned, "YAVG", { at: 1.1, vf: mid }) < stat(fadedTurned, "YAVG", { at: 2.5, vf: mid }) - 6, "a turned title fades in too");
    // slide comes from the left; rise comes from below
    const slide = rend(lay({ animIn: "slide", animSeconds: 1 })), still = rend(lay({ animIn: "fade", animSeconds: 1 }));
    const leftHalf = "crop=100:60:170:150", rightHalf = "crop=40:60:456:150";
        assert.ok(stat(slide, "YAVG", { at: 1.5, vf: rightHalf }) < stat(still, "YAVG", { at: 1.5, vf: rightHalf }) - 4, "so the right is emptier than a plain fade");
    const rise = rend(lay({ animIn: "rise", animSeconds: 0.3 })), fade = rend(lay({ animIn: "fade", animSeconds: 0.3 }));
    const below = "crop=300:20:170:197";
    assert.ok(stat(rise, "YMAX", { at: 1.1, vf: below }) > stat(fade, "YMAX", { at: 1.1, vf: below }) + 15, "rise starts lower than a plain fade");
    // after the animation everything matches an unanimated title
    near(stat(rise, "YAVG", { at: 2.5, vf: mid }), stat(wide, "YAVG", { at: 2.5, vf: mid }), 2, "settled position and colour are unchanged");
    // old-style text still plans the same filters
    assert.ok(!/fade=t=|overlay=x='/.test(R.planRender({ doc: lay({}), preset: "360p", aspectRatio: "16:9", sources, outputPath: "o.mp4", textFiles: files, fonts: FONTS }).filterGraph), "plain text adds no new filters");
  }
  // stickers are ordinary titles that the model accepts and the export can draw
  {
    const St = await import("../src/features/fresh-studio/video-studio/stickers.ts");
    assert.ok(St.STICKERS.length >= 20 && new Set(St.STICKERS.map((x) => x.glyph)).size === St.STICKERS.length && new Set(St.STICKERS.map((x) => x.name)).size === St.STICKERS.length, "unique stickers");
    for (const st of St.STICKERS) {
      let x = T.addText(dark(), { start: 1, duration: 3, id: "s1" });
      x = T.updateText(x, "s1", St.stickerLayer(st));
      assert.equal(T.validateTimeline(x).length, 0, `${st.name} is valid`);
    }
    const star = St.STICKERS[0];
    write("s1", star.glyph);
    let x = T.addText(dark(), { start: 1, duration: 3, id: "s1" }); x = T.updateText(x, "s1", St.stickerLayer(star));
    const out = render(x, { textFiles: files, fonts: FONTS });
    assert.ok(stat(out, "YAVG", { at: 2.5, vf: centre }) > baseLuma + 3, "the sticker is drawn");
    near(stat(out, "YAVG", { at: 0.3, vf: centre }), baseLuma, 2, "and only in its time window");
    // a turned sticker renders too
    const spun = T.updateText(x, "s1", { rotation: 40 });
    assert.ok(stat(render(spun, { textFiles: files, fonts: FONTS }), "YAVG", { at: 2.5, vf: centre }) > baseLuma + 3, "a turned sticker is drawn");
  }
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
  // refuses to guess
  assert.deepEqual(R.planRender({ doc: d, preset: "360p", aspectRatio: "16:9", sources, outputPath: "o.mp4" }).ok, false);
  assert.match(R.planRender({ doc: d, preset: "360p", aspectRatio: "16:9", sources, outputPath: "o.mp4", fonts: FONTS }).errors[0], /missing/);
  const badColour = { ...d, texts: [{ ...d.texts[0], color: "red;rm" }] };
  assert.equal(R.planRender({ doc: badColour, preset: "360p", aspectRatio: "16:9", sources, outputPath: "o.mp4", textFiles: files, fonts: FONTS }).ok, false);
}
// grades render: warmth, cool, vignette and grain change the picture the way they say
{
  const U = (f) => stat(f, "UAVG", { at: 2 }), V = (f) => stat(f, "VAVG", { at: 2 });
  const withLook = (look) => render(T.setClipLook(mk(), "c1", { brightness: 0, contrast: 1, saturation: 1, ...look }));
  const plain = render(mk());
  const warm = withLook({ warmth: 0.8 }), cool = withLook({ warmth: -0.8 });
  assert.ok(V(warm) > V(plain) + 3 && U(warm) < U(plain) - 3, "warm adds red and removes blue");
  assert.ok(V(cool) < V(plain) - 3 && U(cool) > U(plain) + 3, "cool adds blue and removes red");
  const grayDoc = (look) => T.setClipLook(T.addClip(T.addAsset(T.createTimeline(30), asset("gray", 6, "video", true)), { trackId: "v1", assetId: "gray", id: "c1" }), "c1", { brightness: 0, contrast: 1, saturation: 1, ...look });
  const flat = render(grayDoc({})), vig = render(grayDoc({ vignette: 1 }));
  const corner = (f) => stat(f, "YAVG", { at: 2, vf: "crop=60:40:0:0" }), centre = (f) => stat(f, "YAVG", { at: 2, vf: "crop=60:40:290:160" });
  assert.ok(corner(vig) < corner(flat) - 15, "vignette darkens the corners");
  assert.ok(Math.abs(centre(vig) - centre(flat)) < 6, "and leaves the centre alone");
  const split = withLook({ split: 1 });
  assert.notEqual(Math.round(U(split)), Math.round(U(plain)), "teal and orange changes the colour balance");
  // grain: a still picture should shimmer from frame to frame
  const still = (look) => { const d = T.setClipLook(T.addClip(T.addAsset(T.createTimeline(30), asset("dark", 6, "video", true)), { trackId: "v1", assetId: "dark", id: "c1" }), "c1", { brightness: 0, contrast: 1, saturation: 1, ...look }); return render(d); };
  const ydif = (f) => { const r = spawnSync("ffmpeg", ["-hide_banner", "-ss", "1", "-i", f, "-frames:v", "4", "-vf", "signalstats,metadata=print:file=-", "-f", "null", "-"], { encoding: "utf8" }); const all = [...(r.stdout + r.stderr).matchAll(/YDIF=([\d.]+)/g)]; return Number(all[all.length - 1][1]); };
  assert.ok(ydif(still({ grain: 1 })) > ydif(still({})) + 0.5, "grain shimmers");
  // every preset renders
  for (const p of T.LOOK_PRESETS) render(T.setClipLook(mk(), "c1", p.look));
}
// existing behaviour is untouched: an old-style clip renders the same graph as before
{
  const plan = R.planRender({ doc: mk(), preset: "360p", aspectRatio: "16:9", sources, outputPath: "o.mp4" });
  assert.ok(plan.ok);
  assert.ok(!/eq=|fade=|afade=|volume=|drawtext|alimiter/.test(plan.filterGraph), "no new filters unless asked");
}
console.log("Fresh Studio look contract passed (volume, fades, colour, framing, text verified on real media).");

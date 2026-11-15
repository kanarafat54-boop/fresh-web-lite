/**
 * Live check of the on-device speech engine: needs internet (jsDelivr + Hugging Face), Playwright with Chromium,
 * and a WAV of speech (FRESH_SPEECH_WAV). Run by the "Fresh Studio speech engine (live)" workflow, not by the normal build,
 * because it downloads a model and a network hiccup must not fail unrelated pull requests.
 */
import { build } from "esbuild";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import assert from "node:assert/strict";
import { chromium } from "playwright";

const wavPath = process.env.FRESH_SPEECH_WAV;
assert.ok(wavPath && fs.existsSync(wavPath), "Set FRESH_SPEECH_WAV to a WAV file of speech.");
const expected = (process.env.FRESH_SPEECH_WORDS ?? "hello everyone today we are testing automatic captions").split(" ");
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "fresh-speech-"));
const base = path.resolve("src/features/fresh-studio/video-studio") + "/";
fs.writeFileSync(path.join(dir, "entry.ts"), `import { decodeForSpeech, transcribeSamples } from "${base}speechEngine.ts"; import { wordsToCues } from "${base}speech.ts"; (window as any).E = { decodeForSpeech, transcribeSamples, wordsToCues };`);
await build({ entryPoints: [path.join(dir, "entry.ts")], bundle: true, outfile: path.join(dir, "bundle.js"), format: "iife", logLevel: "warning" });
const srv = http.createServer((q, r) => { if (q.url === "/speech.wav") { r.writeHead(200, { "content-type": "audio/wav" }); return r.end(fs.readFileSync(wavPath)); } if (q.url === "/bundle.js") { r.writeHead(200, { "content-type": "text/javascript" }); return r.end(fs.readFileSync(path.join(dir, "bundle.js"))); } r.writeHead(200, { "content-type": "text/html" }); r.end("<!doctype html><body></body>"); }).listen(0);
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  const errors = []; page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(`http://127.0.0.1:${srv.address().port}/`);
  await page.addScriptTag({ url: "/bundle.js" });
  const result = await page.evaluate(async () => {
    const blob = await (await fetch("/speech.wav")).blob();
    const samples = await window.E.decodeForSpeech(blob);
    if (!samples) throw new Error("decode failed");
    const progress = [];
    const words = await window.E.transcribeSamples(samples, { model: "Xenova/whisper-tiny.en", onProgress: (p) => progress.push(p.stage) });
    return { seconds: samples.length / 16000, words, stages: [...new Set(progress)], cues: window.E.wordsToCues(words).map((c) => c.text) };
  });
  console.log(JSON.stringify(result));
  const heard = result.words.map((w) => w.text.toLowerCase().replace(/[^a-z']/g, ""));
  const hits = expected.filter((w) => heard.includes(w));
  assert.ok(hits.length >= Math.ceil(expected.length * 0.6), `heard ${hits.length}/${expected.length} expected words: ${heard.join(" ")}`);
  for (const w of result.words) assert.ok(w.start >= 0 && w.end > w.start && w.end <= result.seconds + 1, `word time ${JSON.stringify(w)} lies inside the audio`);
  assert.ok(result.cues.length >= 1);
  assert.deepEqual(errors, []);
  console.log("Fresh Studio speech engine live check passed.");
} finally { await browser.close(); srv.close(); }

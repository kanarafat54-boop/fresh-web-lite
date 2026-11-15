/**
 * On-device speech recognition. The audio never leaves the browser: a Whisper model runs in a Web Worker through
 * transformers.js. The first use downloads the library and the model (tens of megabytes) and the browser caches them.
 *
 * Honest limits: the library and the model are fetched from public hosts at run time (jsDelivr and Hugging Face), the
 * first run needs internet, and Whisper often leaves hesitation sounds like "um" out of its transcript, so the filler
 * cutter finds only the ones the model writes down.
 */
import type { Word } from "./speech.ts";
import { cleanWords, isNonSpeech } from "./speech.ts";

export const SPEECH_LIBRARY_URL = "https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2";
export const SPEECH_RATE = 16000;
export const MAX_SPEECH_SECONDS = 30 * 60;
export const SPEECH_MODELS = [
  { id: "Xenova/whisper-tiny.en", label: "English · fastest (about 40 MB)", english: true },
  { id: "Xenova/whisper-base.en", label: "English · more accurate (about 80 MB)", english: true },
  { id: "Xenova/whisper-tiny", label: "Other languages · fastest (about 40 MB)", english: false },
] as const;
export type SpeechModelId = (typeof SPEECH_MODELS)[number]["id"];
export type SpeechProgress = { stage: "download" | "listen"; fraction: number; note: string };

/** Pure: turns the model's word chunks into timed words. Last words can come back without an end time. */
export function wordsFromChunks(chunks: readonly { text: string; timestamp: readonly [number, number | null] | readonly number[] }[], totalSeconds: number): Word[] {
  const raw: Word[] = [];
  for (const c of chunks) {
    const [s, e] = c.timestamp as [number, number | null];
    if (typeof s !== "number" || isNonSpeech(c.text)) continue;
    raw.push({ text: c.text, start: s, end: typeof e === "number" ? e : Math.min(totalSeconds, s + 0.4) });
  }
  return cleanWords(raw);
}

const WORKER_SOURCE = `
let asr = null, loaded = "";
self.onmessage = async (e) => {
  const m = e.data;
  try {
    if (!asr || loaded !== m.model) {
      let lib;
      try { lib = await import(${JSON.stringify(SPEECH_LIBRARY_URL)}); }
      catch (err) { throw new Error("The speech library could not be loaded. Check your internet connection and try again."); }
      lib.env.allowLocalModels = false;
      asr = await lib.pipeline("automatic-speech-recognition", m.model, { progress_callback: (p) => { if (p && p.status === "progress") self.postMessage({ type: "download", fraction: Math.min(1, (p.progress || 0) / 100), file: p.file || "" }); } });
      loaded = m.model;
    }
    self.postMessage({ type: "listen" });
    const out = await asr(m.samples, { return_timestamps: "word", chunk_length_s: 30, stride_length_s: 5, language: m.language || undefined, task: "transcribe" });
    self.postMessage({ type: "done", chunks: out.chunks || [] });
  } catch (err) { self.postMessage({ type: "error", message: err && err.message ? err.message : String(err) }); }
};`;

/** Runs the model over 16 kHz mono samples. Resolves with timed words in the samples' own seconds. */
export function transcribeSamples(samples: Float32Array, opts: { model: SpeechModelId; language?: string; onProgress?: (p: SpeechProgress) => void; signal?: AbortSignal }): Promise<Word[]> {
  return new Promise((resolve, reject) => {
    if (typeof Worker === "undefined") return reject(new Error("This browser cannot run the speech engine."));
    const url = URL.createObjectURL(new Blob([WORKER_SOURCE], { type: "text/javascript" }));
    let worker: Worker;
    try { worker = new Worker(url, { type: "module" }); } catch { URL.revokeObjectURL(url); return reject(new Error("This browser cannot run the speech engine.")); }
    const finish = () => { worker.terminate(); URL.revokeObjectURL(url); opts.signal?.removeEventListener("abort", onAbort); };
    const onAbort = () => { finish(); reject(new Error("Stopped.")); };
    if (opts.signal?.aborted) return onAbort();
    opts.signal?.addEventListener("abort", onAbort);
    worker.onerror = (e) => { finish(); reject(new Error(e.message || "The speech engine stopped unexpectedly.")); };
    worker.onmessage = (e: MessageEvent) => {
      const m = e.data as { type: string; fraction?: number; file?: string; chunks?: never[]; message?: string };
      if (m.type === "download") opts.onProgress?.({ stage: "download", fraction: m.fraction ?? 0, note: "Downloading the speech model (saved for next time)…" });
      else if (m.type === "listen") opts.onProgress?.({ stage: "listen", fraction: 0, note: "Listening…" });
      else if (m.type === "done") { finish(); resolve(wordsFromChunks(m.chunks ?? [], samples.length / SPEECH_RATE)); }
      else if (m.type === "error") { finish(); reject(new Error(m.message || "Speech recognition failed.")); }
    };
    worker.postMessage({ model: opts.model, samples, language: opts.language });
  });
}

/** Decodes a media file to 16 kHz mono for the speech model. Null when the file has no usable audio. */
export async function decodeForSpeech(blob: Blob): Promise<Float32Array | null> {
  try {
    const Ctx = window.OfflineAudioContext ?? (window as unknown as { webkitOfflineAudioContext?: typeof OfflineAudioContext }).webkitOfflineAudioContext;
    if (!Ctx) return null;
    const decoded = await new Ctx(1, 1, SPEECH_RATE).decodeAudioData(await blob.arrayBuffer());
    if (decoded.numberOfChannels === 0 || decoded.duration > MAX_SPEECH_SECONDS) return null;
    const mono = new Float32Array(decoded.length);
    for (let c = 0; c < decoded.numberOfChannels; c++) { const ch = decoded.getChannelData(c); for (let i = 0; i < mono.length; i++) mono[i] += ch[i] / decoded.numberOfChannels; }
    return mono;
  } catch { return null; }
}

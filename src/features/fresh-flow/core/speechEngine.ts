import { segmentsFromWhisper, SPEECH_LANGUAGES, type SpeechSegment } from "./speechCues";
import { isSilent } from "./speechAudio";

/**
 * Fresh's on-device speech recognition. The audio never leaves the device: a background worker runs an open-source
 * Whisper model in the browser. The model files are downloaded once from Hugging Face and cached by the browser.
 */
export type SpeechModel = "tiny" | "base";
export const SPEECH_MODELS: Array<{ id: SpeechModel; label: string; note: string }> = [
  { id: "tiny", label: "Fast (about 40 MB download)", note: "Quicker, less accurate, good for clear speech." },
  { id: "base", label: "Better (about 75 MB download)", note: "Slower, more accurate." },
];

export type SpeechProgress = { phase: "model" | "listening"; fraction: number | null };
export type SpeechOptions = { language: string | null; model: SpeechModel; durationSeconds: number; signal?: AbortSignal; onProgress?: (p: SpeechProgress) => void };

export class SpeechEngineError extends Error {}

export function speechSupported(): boolean {
  return typeof Worker !== "undefined" && typeof WebAssembly !== "undefined" && typeof window !== "undefined" && typeof (window.AudioContext ?? (window as unknown as { webkitAudioContext?: unknown }).webkitAudioContext) !== "undefined";
}

export function languageName(code: string | null): string | null {
  if (!code) return null;
  return SPEECH_LANGUAGES.find((l) => l.code === code.toLowerCase().split("-")[0])?.name ?? null;
}

export async function transcribeOnDevice(samples: Float32Array, options: SpeechOptions): Promise<SpeechSegment[]> {
  if (isSilent(samples)) throw new SpeechEngineError("Fresh found no speech in this video's audio.");
  if (!speechSupported()) throw new SpeechEngineError("This browser cannot run captions on the device.");
  const worker = new Worker(new URL("./speechWorker.ts", import.meta.url), { type: "module" });
  try {
    return await new Promise<SpeechSegment[]>((resolve, reject) => {
      const abort = () => { reject(new SpeechEngineError("Stopped.")); };
      if (options.signal?.aborted) return abort();
      options.signal?.addEventListener("abort", abort, { once: true });
      worker.onerror = () => reject(new SpeechEngineError("The speech engine could not start. Check your connection and try again."));
      worker.onmessage = (event: MessageEvent) => {
        const m = event.data as { type: string; fraction?: number | null; output?: unknown; message?: string };
        if (m.type === "progress") options.onProgress?.({ phase: "model", fraction: typeof m.fraction === "number" ? m.fraction : null });
        else if (m.type === "listening") options.onProgress?.({ phase: "listening", fraction: null });
        else if (m.type === "done") resolve(segmentsFromWhisper(m.output, options.durationSeconds));
        else if (m.type === "error") reject(new SpeechEngineError(m.message || "The speech engine failed."));
      };
      const copy = samples.slice();
      worker.postMessage({ type: "run", samples: copy, model: options.model, language: languageName(options.language) }, [copy.buffer]);
    });
  } finally {
    worker.terminate();
  }
}

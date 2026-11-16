/// <reference lib="webworker" />
// Runs the speech model off the main thread. The library comes from a pinned CDN version and the model files from
// Hugging Face; both are fetched by the browser and cached. Nothing about the audio is sent anywhere.

const LIBRARY = "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.0.2";
const MODELS: Record<string, string> = { tiny: "Xenova/whisper-tiny", base: "Xenova/whisper-base" };

type Run = { type: "run"; samples: Float32Array; model: string; language: string | null };

self.onmessage = async (event: MessageEvent<Run>) => {
  const message = event.data;
  if (message?.type !== "run") return;
  try {
    const lib = await import(/* @vite-ignore */ LIBRARY);
    lib.env.allowLocalModels = false;
    const transcriber = await lib.pipeline("automatic-speech-recognition", MODELS[message.model] ?? MODELS.tiny, {
      progress_callback: (p: { status?: string; progress?: number }) => {
        if (p.status === "progress" && typeof p.progress === "number") (self as unknown as Worker).postMessage({ type: "progress", fraction: Math.min(1, p.progress / 100) });
      },
    });
    (self as unknown as Worker).postMessage({ type: "listening" });
    const output = await transcriber(message.samples, {
      chunk_length_s: 30,
      stride_length_s: 5,
      return_timestamps: true,
      task: "transcribe",
      ...(message.language ? { language: message.language } : {}),
    });
    (self as unknown as Worker).postMessage({ type: "done", output });
  } catch (error) {
    (self as unknown as Worker).postMessage({ type: "error", message: error instanceof Error && error.message ? `Captions could not be made: ${error.message}` : "Captions could not be made on this device." });
  }
};

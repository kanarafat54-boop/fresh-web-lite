/**
 * Export orchestration: check → upload sources → render on the worker → download.
 * Pure over injected ports so every failure path can be tested without a network.
 * The UI only offers what the worker reports in its capabilities (spec §6.10).
 */
import { serializeSrt, type Cue } from "./captions.ts";
import { planRender, type ExportPresetId } from "./renderPlan.ts";
import { overlayAssetIds, type TimelineDoc } from "./timeline.ts";

/** Every file the render needs: clip media and overlay pictures. */
export const usedAssetIds = (doc: TimelineDoc): string[] => [...new Set([...doc.clips.map((c) => c.assetId), ...overlayAssetIds(doc)])];

export type WorkerCapabilities = {
  presets: ExportPresetId[];
  aspectRatios: string[];
  frameRates: number[];
  maxSeconds: number;
  maxSources: number;
  maxInputBytes: number;
  /** True when the worker has fonts installed, so text layers can be exported. */
  text: boolean;
};

/** Reads the worker's `/capabilities` answer, which nests the limits under `render`. Throws a plain message if it is not usable. */
export function parseCapabilities(raw: unknown): WorkerCapabilities {
  const r = (raw as { render?: Partial<WorkerCapabilities> } | null)?.render;
  const strings = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => typeof x === "string");
  const numbers = (v: unknown): v is number[] => Array.isArray(v) && v.every((x) => typeof x === "number");
  if (!r || !strings(r.presets) || !strings(r.aspectRatios) || !numbers(r.frameRates) || ![r.maxSeconds, r.maxSources, r.maxInputBytes].every((n) => typeof n === "number" && Number.isFinite(n))) {
    throw new Error("The render service answered, but not with what this version of Fresh expects. It may need updating.");
  }
  return { presets: r.presets as ExportPresetId[], aspectRatios: r.aspectRatios, frameRates: r.frameRates, maxSeconds: r.maxSeconds!, maxSources: r.maxSources!, maxInputBytes: r.maxInputBytes!, text: r.text === true };
}

/** What the worker recorded about the finished file, read back with ffprobe. */
export type OutputFacts = { bytes: number; sha256: string; duration: number; width: number; height: number };
export type WorkerStatus = { status: "queued" | "running" | "succeeded" | "failed" | "cancelled"; progress?: number; error?: string; output?: OutputFacts };
export type RenderRequestBody = { timeline: TimelineDoc; preset: ExportPresetId; aspectRatio: string; fps?: number; sources: Record<string, string>; captionsSrt?: string };

export type ExportPorts = {
  getCapabilities(): Promise<WorkerCapabilities>;
  /** Uploads one source and returns an https URL the worker can fetch. */
  uploadSource(assetId: string, blob: Blob): Promise<string>;
  /** The key makes a repeated submit return the same job instead of starting a second render. */
  submit(body: RenderRequestBody, idempotencyKey: string): Promise<{ jobId: string }>;
  status(jobId: string): Promise<WorkerStatus>;
  cancel(jobId: string): Promise<void>;
  download(jobId: string): Promise<Blob>;
  sleep(ms: number): Promise<void>;
};

export type ExportStage = "checking" | "uploading" | "rendering" | "downloading";
export type ExportInput = { doc: TimelineDoc; preset: ExportPresetId; aspectRatio: string; fps?: number; captions: Cue[]; blobs: Map<string, Blob>; names: Map<string, string> };
export type ExportHooks = {
  onStage?: (stage: ExportStage, detail?: string) => void; onProgress?: (fraction: number) => void; signal?: AbortSignal;
  /** Called with what the worker recorded; `verified` is true only when the downloaded bytes matched it exactly. */
  onOutput?: (facts: OutputFacts & { verified: boolean }) => void;
  /** Overridable for tests. */
  idempotencyKey?: string;
};

async function sha256Hex(blob: Blob): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest("SHA-256", await blob.arrayBuffer());
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

export class ExportError extends Error {
  constructor(message: string) { super(message); this.name = "ExportError"; }
}
export class ExportCancelled extends Error {
  constructor() { super("Export cancelled."); this.name = "ExportCancelled"; }
}

export const POLL_INTERVAL_MS = 1500;
export const MAX_POLL_SECONDS = 20 * 60;

const mb = (n: number) => `${(n / 1048576).toFixed(n < 10 * 1048576 ? 1 : 0)} MB`;

/** Which of the editor's options this worker can really do. */
export function availableExportOptions(caps: WorkerCapabilities | null) {
  return caps
    ? { presets: caps.presets, aspectRatios: caps.aspectRatios, frameRates: caps.frameRates }
    : { presets: [] as ExportPresetId[], aspectRatios: [] as string[], frameRates: [] as number[] };
}

/** Local, instant checks so mistakes are reported before anything is uploaded. */
export function checkExport(input: ExportInput, caps: WorkerCapabilities): string | null {
  if (!caps.presets.includes(input.preset)) return `${input.preset} is not available on this render worker. Choose ${caps.presets.join(", ")}.`;
  if (!caps.aspectRatios.includes(input.aspectRatio)) return "That aspect ratio is not available.";
  if (input.fps !== undefined && !caps.frameRates.includes(input.fps)) return "That frame rate is not available.";
  const used = usedAssetIds(input.doc);
  if (used.length > caps.maxSources) return `A render can use at most ${caps.maxSources} different files. This timeline uses ${used.length}.`;
  for (const id of used) {
    const blob = input.blobs.get(id);
    const name = input.names.get(id) ?? id;
    if (!blob) return `“${name}” is not stored on this device, so it cannot be exported from here.`;
    if (blob.size > caps.maxInputBytes) return `“${name}” is ${mb(blob.size)}. The render worker accepts files up to ${mb(caps.maxInputBytes)}. Trim or compress it first.`;
  }
  const texts = input.doc.texts ?? [];
  if (texts.length > 0 && !caps.text) return "This render worker cannot export text yet. Remove the text layers or update the worker.";
  const dry = planRender({ doc: input.doc, preset: input.preset, aspectRatio: input.aspectRatio, fps: input.fps, sources: Object.fromEntries(used.map((id) => [id, "x"])), outputPath: "out.mp4", captionsFile: input.captions.length ? "c.srt" : undefined, textFiles: Object.fromEntries(texts.map((t) => [t.id, "t.txt"])), fonts: { regular: "r.ttf", bold: "b.ttf" } });
  if (!dry.ok) return dry.errors[0];
  if (dry.duration > caps.maxSeconds) return `This worker renders up to ${caps.maxSeconds} seconds at a time. Your video is ${Math.ceil(dry.duration)} seconds.`;
  return null;
}

export async function runExport(ports: ExportPorts, input: ExportInput, hooks: ExportHooks = {}): Promise<Blob> {
  const { onStage, onProgress, signal } = hooks;
  const ensureLive = () => { if (signal?.aborted) throw new ExportCancelled(); };

  onStage?.("checking");
  const caps = await ports.getCapabilities();
  const problem = checkExport(input, caps);
  if (problem) throw new ExportError(problem);
  ensureLive();

  const used = usedAssetIds(input.doc);
  const sources: Record<string, string> = {};
  for (let i = 0; i < used.length; i += 1) {
    ensureLive();
    onStage?.("uploading", `${i + 1} of ${used.length}`);
    onProgress?.(i / used.length);
    sources[used[i]] = await ports.uploadSource(used[i], input.blobs.get(used[i])!);
  }
  ensureLive();

  onStage?.("rendering");
  onProgress?.(0);
  const key = hooks.idempotencyKey ?? globalThis.crypto.randomUUID();
  const body: RenderRequestBody = {
    timeline: input.doc, preset: input.preset, aspectRatio: input.aspectRatio, ...(input.fps !== undefined ? { fps: input.fps } : {}), sources,
    ...(input.captions.length ? { captionsSrt: serializeSrt(input.captions) } : {}),
  };
  // One quiet retry for a dropped connection. The key means a request that did reach the worker is not rendered twice.
  const { jobId } = await ports.submit(body, key).catch(async (e: unknown) => {
    ensureLive();
    if (e instanceof ExportError) throw e;
    await ports.sleep(1500);
    ensureLive();
    return ports.submit(body, key);
  });

  const deadline = MAX_POLL_SECONDS * 1000;
  let waited = 0;
  let facts: OutputFacts | undefined;
  for (;;) {
    if (signal?.aborted) { await ports.cancel(jobId).catch(() => {}); throw new ExportCancelled(); }
    const st = await ports.status(jobId);
    if (typeof st.progress === "number") onProgress?.(Math.min(1, Math.max(0, st.progress)));
    if (st.status === "succeeded") { facts = st.output; break; }
    if (st.status === "failed") throw new ExportError(st.error || "The render failed.");
    if (st.status === "cancelled") throw new ExportCancelled();
    if (waited >= deadline) { await ports.cancel(jobId).catch(() => {}); throw new ExportError("The render took too long and was stopped."); }
    await ports.sleep(POLL_INTERVAL_MS);
    waited += POLL_INTERVAL_MS;
  }

  ensureLive();
  onStage?.("downloading");
  // A download that does not match what the worker recorded is fetched once more before giving up.
  let blob = await ports.download(jobId);
  let verified = false;
  if (facts) {
    for (let attempt = 0; ; attempt += 1) {
      if (blob.size === facts.bytes && (await sha256Hex(blob)) === facts.sha256) { verified = true; break; }
      if (attempt >= 1) throw new ExportError("The downloaded video does not match what the server rendered, so it was not saved. Try the export again.");
      ensureLive();
      blob = await ports.download(jobId);
    }
  }
  if (blob.size < 1000) throw new ExportError("The finished video was empty. Try again.");
  onProgress?.(1);
  if (facts) hooks.onOutput?.({ ...facts, verified });
  return blob;
}

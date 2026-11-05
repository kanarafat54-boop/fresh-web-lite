/**
 * Importing media into the editor (browser only). Files are stored on this device in IndexedDB;
 * nothing is uploaded until the user exports. Audio is decoded once so we know whether the file really
 * has sound (the renderer needs that to be accurate) and to power on-device silence detection.
 */
import { deleteMediaAsset, loadMediaAsset, saveMediaAsset } from "../../../core/platform/mediaStorage";
import { ANALYSIS_SAMPLE_RATE, MAX_ANALYSIS_SECONDS, mixToMono } from "./audioAnalysis.ts";
import { round3, type TimelineAsset } from "./timeline.ts";

export const MAX_IMPORT_BYTES = 500 * 1024 * 1024;
/** Decoding loads the whole file into memory, so very large files skip audio analysis. */
export const MAX_DECODE_BYTES = 200 * 1024 * 1024;

export type MediaEntry = { asset: TimelineAsset; blob: Blob | null; url: string | null; samples: Float32Array | null; missing: boolean };

export function classifyFile(file: { type: string; name: string }): "video" | "audio" | null {
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("audio/")) return "audio";
  if (!file.type && /\.(mp4|mov|m4v|webm|mkv)$/i.test(file.name)) return "video";
  if (!file.type && /\.(mp3|m4a|wav|ogg|aac|flac)$/i.test(file.name)) return "audio";
  return null;
}

export const storageKey = (projectId: string, assetId: string) => `studio:${projectId}:${assetId}`;
export const newAssetId = () => `media-${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;

function readMetadata(url: string, kind: "video" | "audio"): Promise<{ duration: number; width: number | null; height: number | null }> {
  return new Promise((resolve, reject) => {
    const el = document.createElement(kind === "video" ? "video" : "audio");
    el.preload = "metadata";
    const timer = window.setTimeout(() => reject(new Error("Reading this file took too long.")), 20000);
    el.onloadedmetadata = () => {
      window.clearTimeout(timer);
      const duration = el.duration;
      if (!Number.isFinite(duration) || duration <= 0) return reject(new Error("This file has no readable duration."));
      resolve({ duration: round3(duration), width: kind === "video" ? (el as HTMLVideoElement).videoWidth || null : null, height: kind === "video" ? (el as HTMLVideoElement).videoHeight || null : null });
    };
    el.onerror = () => { window.clearTimeout(timer); reject(new Error("This browser cannot read that file. Try an MP4 (H.264) or MP3/M4A file.")); };
    el.src = url;
  });
}

/** Returns mono samples at 8 kHz, or null if the file has no decodable audio. */
export async function decodeForAnalysis(blob: Blob): Promise<Float32Array | null> {
  if (blob.size > MAX_DECODE_BYTES) return null;
  try {
    const Ctx = window.OfflineAudioContext ?? (window as unknown as { webkitOfflineAudioContext?: typeof OfflineAudioContext }).webkitOfflineAudioContext;
    if (!Ctx) return null;
    const ctx = new Ctx(1, 1, ANALYSIS_SAMPLE_RATE);
    const decoded = await ctx.decodeAudioData(await blob.arrayBuffer());
    if (decoded.duration > MAX_ANALYSIS_SECONDS || decoded.numberOfChannels === 0) return null;
    return mixToMono(Array.from({ length: decoded.numberOfChannels }, (_, i) => decoded.getChannelData(i)));
  } catch {
    return null;
  }
}

export async function importMediaFile(file: File, projectId: string): Promise<MediaEntry> {
  const kind = classifyFile(file);
  if (!kind) throw new Error(`“${file.name}” is not a video or audio file.`);
  if (file.size > MAX_IMPORT_BYTES) throw new Error(`“${file.name}” is larger than ${Math.round(MAX_IMPORT_BYTES / 1048576)} MB.`);
  const url = URL.createObjectURL(file);
  try {
    const meta = await readMetadata(url, kind);
    const samples = await decodeForAnalysis(file);
    const asset: TimelineAsset = { id: newAssetId(), name: file.name.slice(0, 120), kind, duration: meta.duration, width: meta.width, height: meta.height, hasAudio: samples !== null };
    await saveMediaAsset(storageKey(projectId, asset.id), file);
    return { asset, blob: file, url, samples, missing: false };
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
}

/** Re-opens media for an asset already in the timeline. `missing` means this device does not have the file. */
export async function loadStoredMedia(projectId: string, asset: TimelineAsset): Promise<MediaEntry> {
  let blob: Blob | null = null;
  try { blob = await loadMediaAsset(storageKey(projectId, asset.id)); } catch { blob = null; }
  if (!blob) return { asset, blob: null, url: null, samples: null, missing: true };
  const samples = asset.hasAudio ? await decodeForAnalysis(blob) : null;
  return { asset, blob, url: URL.createObjectURL(blob), samples, missing: false };
}

export async function removeStoredMedia(projectId: string, assetId: string): Promise<void> {
  try { await deleteMediaAsset(storageKey(projectId, assetId)); } catch { /* nothing stored */ }
}

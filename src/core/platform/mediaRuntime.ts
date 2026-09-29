import { getRemoteMediaJob, isRemoteMediaWorkerConfigured, submitRemoteMediaJob } from "./remoteMediaWorker";

export type MediaProbe = {
  duration: number;
  width: number;
  height: number;
  aspectRatio: number;
  videoTracks: number;
  audioTracks: number;
};

export type MediaRuntimeState = {
  contentId: string;
  stage: "draft" | "queued" | "processing" | "ready" | "failed";
  probe?: MediaProbe;
  thumbnailUrl?: string;
  remoteJobId?: string;
  remoteOutputUrl?: string;
  error?: string;
  updatedAt: string;
};

export async function probeMedia(url: string): Promise<MediaProbe> {
  const video = document.createElement("video");
  video.preload = "metadata";
  video.src = url;
  await new Promise<void>((resolve, reject) => {
    video.onloadedmetadata = () => resolve();
    video.onerror = () => reject(new Error("Unable to read media metadata."));
  });
  const width = video.videoWidth || 0;
  const height = video.videoHeight || 0;
  const duration = Number.isFinite(video.duration) ? video.duration : 0;
  if (!width || !height) throw new Error("Media has no readable video dimensions.");
  return { duration, width, height, aspectRatio: width / height, videoTracks: 1, audioTracks: 0 };
}

export async function createThumbnail(url: string, atSeconds = 0): Promise<string> {
  const video = document.createElement("video");
  video.preload = "metadata";
  video.muted = true;
  video.src = url;
  await new Promise<void>((resolve, reject) => {
    video.onloadedmetadata = () => resolve();
    video.onerror = () => reject(new Error("Unable to load media for thumbnail."));
  });
  video.currentTime = Math.min(Math.max(0, atSeconds), Math.max(0, video.duration - 0.01));
  await new Promise<void>((resolve) => { video.onseeked = () => resolve(); });
  const canvas = document.createElement("canvas");
  canvas.width = Math.min(1280, video.videoWidth || 1280);
  canvas.height = Math.round(canvas.width * (video.videoHeight / video.videoWidth));
  canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.82);
}

export async function submitMediaToWorker(inputUrl: string, outputFormat: "webm" | "mp4" = "webm") {
  if (!isRemoteMediaWorkerConfigured()) throw new Error("Remote media worker is not configured.");
  return submitRemoteMediaJob({ inputUrl, outputFormat, maxSeconds: 30 });
}

export async function waitForMediaWorker(jobId: string, timeoutMs = 180000): Promise<Awaited<ReturnType<typeof getRemoteMediaJob>>> {
  const started = Date.now();
  let delay = 800;
  while (Date.now() - started < timeoutMs) {
    const state = await getRemoteMediaJob(jobId);
    if (state.status === "succeeded" || state.status === "failed") return state;
    await new Promise((resolve) => setTimeout(resolve, delay));
    delay = Math.min(5000, Math.round(delay * 1.5));
  }
  throw new Error("Media worker timed out.");
}

export function buildMediaRuntimeState(contentId: string, patch: Partial<MediaRuntimeState> = {}): MediaRuntimeState {
  return { contentId, stage: "draft", updatedAt: new Date().toISOString(), ...patch };
}

export type BrowserExportOptions = {
  aspect?: "16:9" | "9:16" | "1:1";
  fps?: number;
  mimeTypes?: string[];
  startSeconds?: number;
  endSeconds?: number;
  grade?: { preset: string; intensity: number };
  overlayText?: { text: string; start: number; end: number };
};

function pickMimeType(preferred: string[] = ["video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"]) {
  if (typeof MediaRecorder === "undefined") return "";
  return preferred.find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
}

export function getBrowserExportSupport() {
  return {
    mediaRecorder: typeof MediaRecorder !== "undefined",
    canvasCapture: typeof HTMLCanvasElement !== "undefined" && "captureStream" in HTMLCanvasElement.prototype,
    supportedMimeType: pickMimeType(),
  };
}

export async function exportVideoFrameStream(
  video: HTMLVideoElement,
  options: BrowserExportOptions = {},
): Promise<Blob> {
  if (!video.videoWidth || !video.videoHeight) throw new Error("Video metadata is not ready.");
  if (typeof document === "undefined") throw new Error("Browser export requires a document.");

  const canvas = document.createElement("canvas");
  const aspect = options.aspect ?? "9:16";
  const sourceAspect = video.videoWidth / video.videoHeight;
  const targetAspect = aspect === "9:16" ? 9 / 16 : aspect === "1:1" ? 1 : 16 / 9;
  const height = targetAspect < 1 ? 720 : 720;
  const width = targetAspect < 1 ? Math.round(height * targetAspect) : 720;
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas 2D is unavailable.");
  if (!(typeof HTMLCanvasElement !== "undefined" && "captureStream" in HTMLCanvasElement.prototype)) {
    throw new Error("Canvas capture is unavailable in this browser.");
  }

  const stream = canvas.captureStream(options.fps ?? 30);
  const mediaElement = video as HTMLVideoElement & { captureStream?: () => MediaStream };
  const audioStream = typeof mediaElement.captureStream === "function" ? mediaElement.captureStream() : undefined;
  audioStream?.getAudioTracks().forEach((track) => stream.addTrack(track));

  const mimeType = pickMimeType(options.mimeTypes);
  if (!mimeType) throw new Error("This browser does not support MediaRecorder video export.");

  const recorder = new MediaRecorder(stream, { mimeType });
  const chunks: BlobPart[] = [];
  const data = new Promise<Blob>((resolve, reject) => {
    recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
    recorder.onerror = () => reject(recorder.error ?? new Error("Media recording failed."));
    recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
  });

  const duration = Number.isFinite(video.duration) ? video.duration : 0;
  const start = Math.max(0, Math.min(options.startSeconds ?? 0, duration));
  const end = Math.max(start + 0.05, Math.min(options.endSeconds ?? duration, duration || Number.MAX_SAFE_INTEGER));
  const wasPaused = video.paused;
  const originalTime = video.currentTime;
  const originalRate = video.playbackRate;

  const cleanup = () => {
    video.pause();
    video.currentTime = Math.min(originalTime, duration || originalTime);
    video.playbackRate = originalRate;
    stream.getTracks().forEach((track) => track.stop());
    audioStream?.getTracks().forEach((track) => track.stop());
  };

  recorder.start(250);
  video.currentTime = start;
  video.playbackRate = 1;
  await video.play();

  const draw = () => {
    const currentAspect = sourceAspect;
    let drawWidth = video.videoWidth;
    let drawHeight = video.videoHeight;
    let sx = 0;
    let sy = 0;

    if (currentAspect > targetAspect) {
      drawWidth = video.videoHeight * targetAspect;
      sx = (video.videoWidth - drawWidth) / 2;
    } else if (currentAspect < targetAspect) {
      drawHeight = video.videoWidth / targetAspect;
      sy = (video.videoHeight - drawHeight) / 2;
    }

    context.filter = options.grade?.preset === "Fresh Clean"
      ? `brightness(${100 + options.grade.intensity * 8}%) contrast(${100 + options.grade.intensity * 6}%) saturate(${100 + options.grade.intensity * 8}%)`
      : "none";
    context.drawImage(video, sx, sy, drawWidth, drawHeight, 0, 0, canvas.width, canvas.height);
    context.filter = "none";

    const currentTime = video.currentTime;
    const overlay = options.overlayText;
    if (overlay && currentTime >= overlay.start && currentTime <= overlay.end) {
      context.font = "700 36px sans-serif";
      context.textAlign = "center";
      context.textBaseline = "bottom";
      context.fillStyle = "white";
      context.shadowColor = "black";
      context.shadowBlur = 8;
      context.fillText(overlay.text, canvas.width / 2, canvas.height - 32);
      context.shadowBlur = 0;
    }

    if (currentTime >= end || video.ended) {
      recorder.stop();
      return;
    }
    requestAnimationFrame(draw);
  };

  draw();

  try {
    const blob = await data;
    cleanup();
    if (!wasPaused) await video.play().catch(() => undefined);
    return blob;
  } catch (error) {
    cleanup();
    throw error;
  }
}

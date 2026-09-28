export type BrowserExportOptions = {
  aspect?: "16:9" | "9:16" | "1:1";
  fps?: number;
  mimeTypes?: string[];
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
  let width = 720;
  let height = Math.round(width / targetAspect);
  if (targetAspect < 1) {
    height = 720;
    width = Math.round(height * targetAspect);
  }
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas 2D is unavailable.");
  const stream = canvas.captureStream(options.fps ?? 30);
  const audioStream = "captureStream" in HTMLMediaElement.prototype
    ? (video as HTMLVideoElement & { captureStream?: () => MediaStream }).captureStream?.()
    : undefined;
  if (audioStream) {
    audioStream.getAudioTracks().forEach((track) => stream.addTrack(track));
  }
  const mimeType = pickMimeType(options.mimeTypes);
  if (!mimeType) throw new Error("This browser does not support MediaRecorder video export.");
  const recorder = new MediaRecorder(stream, { mimeType });
  const chunks: BlobPart[] = [];
  const data = new Promise<Blob>((resolve, reject) => {
    recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
    recorder.onerror = () => reject(recorder.error ?? new Error("Media recording failed."));
    recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
  });

  const wasPaused = video.paused;
  const originalTime = video.currentTime;
  const originalRate = video.playbackRate;
  recorder.start(250);
  video.currentTime = 0;
  video.playbackRate = 1;
  await video.play();

  const draw = () => {
    const currentAspect = sourceAspect;
    let drawWidth = canvas.width;
    let drawHeight = canvas.height;
    let sx = 0;
    let sy = 0;
    if (currentAspect > targetAspect) {
      drawWidth = video.videoHeight * targetAspect;
      sx = (video.videoWidth - drawWidth) / 2;
    } else {
      drawHeight = video.videoWidth / targetAspect;
      sy = (video.videoHeight - drawHeight) / 2;
    }
    context.drawImage(video, sx, sy, drawWidth, drawHeight, 0, 0, canvas.width, canvas.height);
    if (!video.ended) requestAnimationFrame(draw);
    else recorder.stop();
  };
  draw();

  const blob = await data;
  video.pause();
  video.currentTime = originalTime;
  video.playbackRate = originalRate;
  if (!wasPaused) await video.play().catch(() => undefined);
  return blob;
}

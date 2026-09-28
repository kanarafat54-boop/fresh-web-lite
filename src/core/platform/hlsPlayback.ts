export type AdaptivePlaybackSupport = {
  mediaSource: boolean;
  nativeHls: boolean;
};

export function getAdaptivePlaybackSupport(): AdaptivePlaybackSupport {
  if (typeof document === "undefined") return { mediaSource: false, nativeHls: false };
  const video = document.createElement("video");
  return {
    mediaSource: typeof MediaSource !== "undefined",
    nativeHls: video.canPlayType("application/vnd.apple.mpegurl") !== "",
  };
}

export function attachAdaptiveSource(video: HTMLVideoElement, sourceUrl: string, mimeType?: string) {
  if (mimeType && "MediaSource" in window && sourceUrl.endsWith(".m3u8")) {
    video.src = sourceUrl;
    return "native-url";
  }
  video.src = sourceUrl;
  video.load();
  return "direct";
}

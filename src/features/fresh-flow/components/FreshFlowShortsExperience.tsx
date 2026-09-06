import { useEffect, useRef, useState } from "react";
import FreshFlowShortsStream from "./FreshFlowShortsStream";

type Props = { onOpenTopic?: (tag: string) => void };

/**
 * Keeps the landing feed intact until a Short is genuinely playing. After
 * five seconds of continuous playback of the same Short, that Short expands
 * into a full-page viewing surface. The back control returns to the landing
 * shell; the stream is remounted so its discovery tabs are restored.
 */
export default function FreshFlowShortsExperience({ onOpenTopic }: Props) {
  const [immersive, setImmersive] = useState(false);
  const [streamKey, setStreamKey] = useState(0);
  const timerRef = useRef<number | null>(null);
  const triggeredIdsRef = useRef<Set<string>>(new Set());
  const watchedVideoIdsRef = useRef<Map<HTMLVideoElement, string>>(new Map());

  useEffect(() => {
    const clearTimer = () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };

    const beginWatchTimer = (video: HTMLVideoElement) => {
      clearTimer();
      const shortId = video.dataset.shortId;
      if (!shortId || triggeredIdsRef.current.has(shortId)) return;

      timerRef.current = window.setTimeout(() => {
        triggeredIdsRef.current.add(shortId);
        setImmersive(true);
        timerRef.current = null;
      }, 5000);
    };

    const onPlaying = (event: Event) => {
      const video = event.currentTarget as HTMLVideoElement;
      beginWatchTimer(video);
    };

    const onPause = () => clearTimer();

    const attach = (video: HTMLVideoElement) => {
      if (watchedVideoIdsRef.current.has(video)) return;
      watchedVideoIdsRef.current.set(video, video.dataset.shortId ?? "");
      video.addEventListener("playing", onPlaying);
      video.addEventListener("pause", onPause);
      video.addEventListener("ended", onPause);
      if (!video.paused) beginWatchTimer(video);
    };

    const scan = () => {
      document.querySelectorAll<HTMLVideoElement>(".fresh-flow-stream video[data-short-id]").forEach(attach);
    };

    scan();
    const observer = new MutationObserver(scan);
    observer.observe(document.body, { childList: true, subtree: true });
    const interval = window.setInterval(scan, 500);

    return () => {
      clearTimer();
      observer.disconnect();
      window.clearInterval(interval);
      watchedVideoIdsRef.current.forEach((_id, video) => {
        video.removeEventListener("playing", onPlaying);
        video.removeEventListener("pause", onPause);
        video.removeEventListener("ended", onPause);
      });
      watchedVideoIdsRef.current.clear();
    };
  }, [streamKey]);

  const exitImmersive = () => {
    setImmersive(false);
    setStreamKey((key) => key + 1);
  };

  return (
    <div className={immersive ? "fresh-flow-short-experience immersive" : "fresh-flow-short-experience"}>
      <FreshFlowShortsStream key={streamKey} onOpenTopic={onOpenTopic} />
      {immersive && (
        <button type="button" className="fresh-flow-immersive-back" onClick={exitImmersive} aria-label="Back to Fresh Flow">
          <span aria-hidden="true">←</span>
          <span>Fresh Flow</span>
        </button>
      )}
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import { useLayout } from "../../../app/contexts/useLayout";
import { useFreshId } from "../../fresh-id/context/FreshIdContext";
import FreshFlowShortsStream from "./FreshFlowShortsStream";
import { recordFreshShortsTelemetry } from "../core/shortsTelemetry";
import "./FreshFlowShortsExperience.css";

type Props = { onOpenTopic?: (tag: string) => void };

function getConnectionType(): string | undefined {
  const connection = (navigator as Navigator & { connection?: { effectiveType?: string } }).connection;
  return connection?.effectiveType;
}

/**
 * The landing feed stays intact until the active Short has actually started
 * playing. We watch the real HTMLMediaElement state as a fallback to the
 * `playing` event because some mobile browsers can attach/play a video before
 * React's listener is installed. Five continuous seconds then opens the
 * Short as a full-page surface with a persistent back control.
 */
export default function FreshFlowShortsExperience({ onOpenTopic }: Props) {
  const { setActiveRoute } = useLayout();
  const { isGuest } = useFreshId();
  const [immersive, setImmersive] = useState(false);
  const [streamKey, setStreamKey] = useState(0);
  const [giftShortcutVisible, setGiftShortcutVisible] = useState(true);
  const timerRef = useRef<number | null>(null);
  const triggeredIdsRef = useRef<Set<string>>(new Set());
  const watchedVideoIdsRef = useRef<Map<HTMLVideoElement, string>>(new Map());
  const watchingVideoRef = useRef<HTMLVideoElement | null>(null);
  const startedAtRef = useRef<Map<string, number>>(new Map());
  const firstFrameIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const clearTimer = () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };

    const beginWatchTimer = (video: HTMLVideoElement) => {
      const shortId = video.dataset.shortId;
      if (!shortId || triggeredIdsRef.current.has(shortId)) return;
      if (watchingVideoRef.current === video && timerRef.current !== null) return;
      clearTimer();
      watchingVideoRef.current = video;
      timerRef.current = window.setTimeout(() => {
        if (video.paused || video.ended || video.currentTime <= 0) {
          clearTimer();
          return;
        }
        triggeredIdsRef.current.add(shortId);
        setImmersive(true);
        recordFreshShortsTelemetry({ event: "immersive_enter", shortId, connection: getConnectionType(), online: navigator.onLine });
        timerRef.current = null;
      }, 5000);
    };

    const stopWatchTimer = (video?: HTMLVideoElement) => {
      if (!video || watchingVideoRef.current === video) {
        clearTimer();
        watchingVideoRef.current = null;
      }
    };

    const onPlaying = (event: Event) => {
      const video = event.currentTarget as HTMLVideoElement;
      const shortId = video.dataset.shortId;
      if (shortId) {
        const startedAt = startedAtRef.current.get(shortId);
        if (!startedAt) {
          startedAtRef.current.set(shortId, performance.now());
          recordFreshShortsTelemetry({ event: "playback_start", shortId, connection: getConnectionType(), online: navigator.onLine });
        } else {
          recordFreshShortsTelemetry({ event: "buffer_end", shortId, durationMs: Math.round(performance.now() - startedAt), connection: getConnectionType(), online: navigator.onLine });
        }
      }
      beginWatchTimer(video);
    };

    const onLoadedData = (event: Event) => {
      const video = event.currentTarget as HTMLVideoElement;
      const shortId = video.dataset.shortId;
      if (!shortId || firstFrameIdsRef.current.has(shortId)) return;
      firstFrameIdsRef.current.add(shortId);
      const startedAt = startedAtRef.current.get(shortId);
      recordFreshShortsTelemetry({ event: "first_frame", shortId, durationMs: startedAt ? Math.round(performance.now() - startedAt) : undefined, connection: getConnectionType(), online: navigator.onLine });
    };

    const onWaiting = (event: Event) => {
      const video = event.currentTarget as HTMLVideoElement;
      const shortId = video.dataset.shortId;
      if (shortId) recordFreshShortsTelemetry({ event: "buffer_start", shortId, value: video.currentTime, connection: getConnectionType(), online: navigator.onLine });
    };

    const onError = (event: Event) => {
      const video = event.currentTarget as HTMLVideoElement;
      const shortId = video.dataset.shortId;
      if (shortId) recordFreshShortsTelemetry({ event: "playback_error", shortId, metadata: { code: video.error?.code ?? null }, connection: getConnectionType(), online: navigator.onLine });
    };

    const onPause = (event: Event) => stopWatchTimer(event.currentTarget as HTMLVideoElement);
    const onEnded = (event: Event) => stopWatchTimer(event.currentTarget as HTMLVideoElement);

    const attach = (video: HTMLVideoElement) => {
      if (watchedVideoIdsRef.current.has(video)) return;
      watchedVideoIdsRef.current.set(video, video.dataset.shortId ?? "");
      video.addEventListener("playing", onPlaying);
      video.addEventListener("loadeddata", onLoadedData);
      video.addEventListener("waiting", onWaiting);
      video.addEventListener("error", onError);
      video.addEventListener("pause", onPause);
      video.addEventListener("ended", onEnded);
    };

    const scan = () => {
      const videos = Array.from(document.querySelectorAll<HTMLVideoElement>(".fresh-flow-stream video[data-short-id]"));
      videos.forEach(attach);

      let active: HTMLVideoElement | null = null;
      let bestRatio = 0;
      videos.forEach((video) => {
        if (video.paused || video.ended || video.currentTime <= 0) return;
        const rect = video.getBoundingClientRect();
        const visibleHeight = Math.max(0, Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0));
        const ratio = rect.height > 0 ? visibleHeight / rect.height : 0;
        if (ratio > bestRatio) { bestRatio = ratio; active = video; }
      });

      if (active) beginWatchTimer(active);
      else stopWatchTimer();

      const hasNativeGift = Boolean(document.querySelector('.fresh-flow-stream button[aria-label="Send gift"]'));
      setGiftShortcutVisible(!hasNativeGift);
    };

    scan();
    const observer = new MutationObserver(scan);
    observer.observe(document.body, { childList: true, subtree: true });
    const interval = window.setInterval(scan, 250);

    return () => {
      clearTimer();
      observer.disconnect();
      window.clearInterval(interval);
      watchedVideoIdsRef.current.forEach((_id, video) => {
        video.removeEventListener("playing", onPlaying);
        video.removeEventListener("loadeddata", onLoadedData);
        video.removeEventListener("waiting", onWaiting);
        video.removeEventListener("error", onError);
        video.removeEventListener("pause", onPause);
        video.removeEventListener("ended", onEnded);
      });
      watchedVideoIdsRef.current.clear();
      watchingVideoRef.current = null;
    };
  }, [streamKey]);

  const exitImmersive = () => {
    setImmersive(false);
    setStreamKey((key) => key + 1);
  };

  const openGift = () => {
    const nativeGift = document.querySelector<HTMLButtonElement>('.fresh-flow-stream button[aria-label="Send gift"]');
    if (nativeGift) {
      nativeGift.click();
      return;
    }
    if (isGuest) setActiveRoute("auth-signin");
    else window.alert("Gift actions are unavailable when viewing your own Short.");
  };

  return (
    <div className={immersive ? "fresh-flow-short-experience immersive" : "fresh-flow-short-experience"}>
      <FreshFlowShortsStream key={streamKey} onOpenTopic={onOpenTopic} />
      {giftShortcutVisible && (
        <button type="button" className="fresh-flow-quick-gift" onClick={openGift} aria-label="Send gift">
          <span aria-hidden="true">🎁</span>
          <span>Gift</span>
        </button>
      )}
      {immersive && (
        <button type="button" className="fresh-flow-immersive-back" onClick={exitImmersive} aria-label="Back to Fresh Flow">
          <span aria-hidden="true">←</span>
          <span>Fresh Flow</span>
        </button>
      )}
    </div>
  );
}

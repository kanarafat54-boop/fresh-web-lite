import { useEffect, useRef } from "react";
import { useLayout } from "../../../app/contexts/useLayout";
import { useFreshId } from "../../fresh-id/context/FreshIdContext";
import FreshFlowShortsStream from "./FreshFlowShortsStream";
import { recordFreshShortsTelemetry } from "../core/shortsTelemetry";
import "./FreshFlowShortsExperience.css";

type Props = { onOpenTopic?: (tag: string) => void };

type CreateIntent = { action?: string; sourceShortId?: string; sourceVideoUrl?: string };

function getConnectionType(): string | undefined {
  const connection = (navigator as Navigator & { connection?: { effectiveType?: string } }).connection;
  return connection?.effectiveType;
}

/**
 * Playback-quality telemetry for the Shorts feed (first frame, buffering, errors).
 * Both navigations stay visible: Shorts scrolls like a vertical pager and never
 * hides the app chrome, so there is no separate "immersive" mode to enter or exit.
 */
export default function FreshFlowShortsExperience({ onOpenTopic }: Props) {
  const { setActiveRoute } = useLayout();
  const { isGuest } = useFreshId();
  const watchedVideoIdsRef = useRef<Map<HTMLVideoElement, string>>(new Map());
  const startedAtRef = useRef<Map<string, number>>(new Map());
  const firstFrameIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const onPlaying = (event: Event) => {
      const video = event.currentTarget as HTMLVideoElement;
      const shortId = video.dataset.shortId;

      if (shortId) {
        const startedAt = startedAtRef.current.get(shortId);
        if (!startedAt) {
          startedAtRef.current.set(shortId, performance.now());
          recordFreshShortsTelemetry({
            event: "playback_start",
            shortId,
            connection: getConnectionType(),
            online: navigator.onLine,
          });
        } else {
          recordFreshShortsTelemetry({
            event: "buffer_end",
            shortId,
            durationMs: Math.round(performance.now() - startedAt),
            connection: getConnectionType(),
            online: navigator.onLine,
          });
        }
      }
    };

    const onLoadedData = (event: Event) => {
      const video = event.currentTarget as HTMLVideoElement;
      const shortId = video.dataset.shortId;
      if (!shortId || firstFrameIdsRef.current.has(shortId)) return;

      firstFrameIdsRef.current.add(shortId);
      const startedAt = startedAtRef.current.get(shortId);
      recordFreshShortsTelemetry({
        event: "first_frame",
        shortId,
        durationMs: startedAt ? Math.round(performance.now() - startedAt) : undefined,
        connection: getConnectionType(),
        online: navigator.onLine,
      });
    };

    const onWaiting = (event: Event) => {
      const video = event.currentTarget as HTMLVideoElement;
      const shortId = video.dataset.shortId;
      if (shortId) {
        recordFreshShortsTelemetry({
          event: "buffer_start",
          shortId,
          value: video.currentTime,
          connection: getConnectionType(),
          online: navigator.onLine,
        });
      }
    };

    const onError = (event: Event) => {
      const video = event.currentTarget as HTMLVideoElement;
      const shortId = video.dataset.shortId;
      if (shortId) {
        recordFreshShortsTelemetry({
          event: "playback_error",
          shortId,
          metadata: { code: video.error?.code ?? null },
          connection: getConnectionType(),
          online: navigator.onLine,
        });
      }
    };

    const attach = (video: HTMLVideoElement) => {
      if (watchedVideoIdsRef.current.has(video)) return;

      watchedVideoIdsRef.current.set(video, video.dataset.shortId ?? "");
      video.addEventListener("playing", onPlaying);
      video.addEventListener("loadeddata", onLoadedData);
      video.addEventListener("waiting", onWaiting);
      video.addEventListener("error", onError);
    };

    const scan = () => {
      document.querySelectorAll<HTMLVideoElement>(".fresh-flow-stream video[data-short-id]").forEach(attach);
    };

    scan();
    const observer = new MutationObserver(scan);
    observer.observe(document.querySelector(".fresh-flow-stream") ?? document.body, { childList: true, subtree: true });

    const watchedVideoIds = watchedVideoIdsRef.current;

    return () => {
      observer.disconnect();
      watchedVideoIds.forEach((_id, video) => {
        video.removeEventListener("playing", onPlaying);
        video.removeEventListener("loadeddata", onLoadedData);
        video.removeEventListener("waiting", onWaiting);
        video.removeEventListener("error", onError);
      });
      watchedVideoIds.clear();
    };
  }, []);

  return (
    <div className="fresh-flow-short-experience">
      <FreshFlowShortsStream
        onOpenTopic={onOpenTopic}
        onOpenCreate={(intent?: CreateIntent) => {
          try {
            if (intent) sessionStorage.setItem("fresh-flow-create-intent", JSON.stringify(intent));
          } catch {
            /* ignore */
          }
          if (isGuest) setActiveRoute("auth-signin");
          else setActiveRoute("creator");
        }}
      />
    </div>
  );
}

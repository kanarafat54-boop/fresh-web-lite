import { useEffect, useRef } from "react";
import { ShortsModule } from "./ShortsModule";
import { ShortsFeedNavigationRuntime } from "../core/ShortsFeedNavigationRuntime";

type ShortsFeedShellProps = {
  openComposerSignal?: number;
  onExit?: () => void;
};

/**
 * Keeps ShortsModule as the source of truth and adds the production navigation
 * runtime around its existing feed DOM.
 */
export default function ShortsFeedShell(props: ShortsFeedShellProps) {
  const runtimeRef = useRef<ShortsFeedNavigationRuntime | null>(null);

  useEffect(() => {
    let cancelled = false;
    let frame = 0;

    const attach = () => {
      if (cancelled) return;
      const container = document.querySelector<HTMLElement>(".shorts-scroll-container");
      if (!container) {
        frame = requestAnimationFrame(attach);
        return;
      }

      runtimeRef.current?.destroy();
      runtimeRef.current = new ShortsFeedNavigationRuntime(container, {
        onActiveChange: (index) => {
          const items = Array.from(container.querySelectorAll<HTMLElement>(".short-item"));
          items.forEach((item, itemIndex) => {
            item.setAttribute("aria-current", itemIndex === index ? "true" : "false");
          });

          // Keep the browser's media pipeline warm for adjacent items without
          // forcing playback outside the existing Shorts IntersectionObserver.
          [index - 1, index + 1].forEach((adjacentIndex) => {
            const video = items[adjacentIndex]?.querySelector<HTMLVideoElement>("video[data-short-id]");
            if (video) video.preload = "metadata";
          });
        },
      });
    };

    frame = requestAnimationFrame(attach);
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      runtimeRef.current?.destroy();
      runtimeRef.current = null;
    };
  });

  return <ShortsModule {...props} />;
}

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
  const containerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    let attachFrame = 0;

    const attach = () => {
      if (cancelled) return;
      const container = document.querySelector<HTMLElement>(".shorts-scroll-container");
      if (!container) {
        attachFrame = requestAnimationFrame(attach);
        return;
      }
      if (containerRef.current === container && runtimeRef.current) {
        return;
      }

      runtimeRef.current?.destroy();
      containerRef.current = container;
      runtimeRef.current = new ShortsFeedNavigationRuntime(container, {
        onActiveChange: (index) => {
          const items = Array.from(container.querySelectorAll<HTMLElement>(".short-item"));
          items.forEach((item, itemIndex) => {
            item.setAttribute("aria-current", itemIndex === index ? "true" : "false");
          });

          // Warm adjacent media metadata without taking playback ownership away
          // from ShortsModule's existing IntersectionObserver.
          [index - 1, index + 1].forEach((adjacentIndex) => {
            const video = items[adjacentIndex]?.querySelector<HTMLVideoElement>("video[data-short-id]");
            if (video) video.preload = "metadata";
          });
        },
      });
    };

    const mutationObserver = new MutationObserver(() => attach());
    mutationObserver.observe(document.body, { childList: true, subtree: true });
    attach();

    return () => {
      cancelled = true;
      cancelAnimationFrame(attachFrame);
      mutationObserver.disconnect();
      runtimeRef.current?.destroy();
      runtimeRef.current = null;
      containerRef.current = null;
    };
  }, []);

  return <ShortsModule {...props} />;
}

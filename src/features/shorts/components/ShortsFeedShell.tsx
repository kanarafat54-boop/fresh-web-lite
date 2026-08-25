import { useEffect, useRef } from "react";
import { ShortsModule } from "./ShortsModule";
import { ShortsFeedNavigationRuntime } from "../core/ShortsFeedNavigationRuntime";
import {
  attachShortsMediaContext,
  type ShortsMediaContext,
} from "../core/ShortsMediaContextBridge";

type ShortsFeedShellProps = {
  openComposerSignal?: number;
  onExit?: () => void;
  mediaContext?: ShortsMediaContext;
};

/**
 * Keeps ShortsModule as the source of truth and adds the production navigation
 * runtime plus the optional Fresh Media OS context boundary around its feed DOM.
 */
export default function ShortsFeedShell({ mediaContext, ...props }: ShortsFeedShellProps) {
  const runtimeRef = useRef<ShortsFeedNavigationRuntime | null>(null);
  const containerRef = useRef<HTMLElement | null>(null);
  const detachContextRef = useRef<(() => void) | null>(null);

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
      detachContextRef.current?.();
      detachContextRef.current = null;
      containerRef.current = container;

      if (mediaContext) {
        detachContextRef.current = attachShortsMediaContext(container, mediaContext);
      }

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
      detachContextRef.current?.();
      detachContextRef.current = null;
      containerRef.current = null;
    };
  }, [mediaContext]);

  return <ShortsModule {...props} />;
}

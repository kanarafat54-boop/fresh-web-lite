import { useEffect, useRef } from "react";
import { ShortsModule } from "./ShortsModule";
import { ShortsFeedNavigationRuntime } from "../core/ShortsFeedNavigationRuntime";
import { ShortsMediaContextRuntime } from "../core/ShortsMediaContextRuntime";

type ShortsFeedShellProps = {
  openComposerSignal?: number;
  onExit?: () => void;
};

/**
 * Keeps ShortsModule as the source of truth while layering production
 * navigation and Fresh Media OS context around its existing feed DOM.
 */
export default function ShortsFeedShell(props: ShortsFeedShellProps) {
  const navigationRef = useRef<ShortsFeedNavigationRuntime | null>(null);
  const contextRef = useRef<ShortsMediaContextRuntime | null>(null);
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
      if (containerRef.current === container && navigationRef.current && contextRef.current) return;

      navigationRef.current?.destroy();
      contextRef.current?.destroy();
      containerRef.current = container;

      navigationRef.current = new ShortsFeedNavigationRuntime(container, {
        onActiveChange: (index) => {
          const items = Array.from(container.querySelectorAll<HTMLElement>(".short-item"));
          items.forEach((item, itemIndex) => {
            item.setAttribute("aria-current", itemIndex === index ? "true" : "false");
          });

          [index - 1, index + 1].forEach((adjacentIndex) => {
            const video = items[adjacentIndex]?.querySelector<HTMLVideoElement>("video[data-short-id]");
            if (video) video.preload = "metadata";
          });
        },
      });

      contextRef.current = new ShortsMediaContextRuntime(container);
      contextRef.current.start();
    };

    const mutationObserver = new MutationObserver(() => attach());
    mutationObserver.observe(document.body, { childList: true, subtree: true });
    attach();

    return () => {
      cancelled = true;
      cancelAnimationFrame(attachFrame);
      mutationObserver.disconnect();
      navigationRef.current?.destroy();
      contextRef.current?.destroy();
      navigationRef.current = null;
      contextRef.current = null;
      containerRef.current = null;
    };
  }, []);

  return <ShortsModule {...props} />;
}

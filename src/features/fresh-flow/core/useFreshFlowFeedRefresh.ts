import { useEffect } from "react";
import { consumeFeedRefresh } from "../../creator/core/createIntent";

/** Reload Shorts when Creator Studio signals a successful publish. */
export function useFreshFlowFeedRefresh(reload: () => void): void {
  useEffect(() => {
    const onRefresh = () => {
      consumeFeedRefresh();
      reload();
    };
    window.addEventListener("fresh-flow-feed-refresh", onRefresh as EventListener);
    if (consumeFeedRefresh()) reload();
    return () => window.removeEventListener("fresh-flow-feed-refresh", onRefresh as EventListener);
  }, [reload]);
}

import { useCallback, useMemo, useState } from "react";
import {
  createFreshFlowRuntimeState,
  mergeFreshFlowQueue,
  shouldPrefetch,
  type FreshFlowItem,
  type FreshFlowRuntimeState,
} from "./freshFlowRuntimeFabric";

export function useFreshFlowRuntime() {
  const [state, setState] = useState<FreshFlowRuntimeState>(() => createFreshFlowRuntimeState());

  const replaceQueue = useCallback((items: FreshFlowItem[], cursor: string | null = null, hasMore = false) => {
    setState((current) => ({
      ...current,
      phase: items.length ? "ready" : "idle",
      queue: mergeFreshFlowQueue([], items),
      activeId: current.activeId && items.some((item) => item.id === current.activeId) ? current.activeId : items[0]?.id ?? null,
      cursor,
      hasMore,
      lastError: null,
    }));
  }, []);

  const appendQueue = useCallback((items: FreshFlowItem[], cursor: string | null, hasMore: boolean) => {
    setState((current) => ({
      ...current,
      phase: "ready",
      queue: mergeFreshFlowQueue(current.queue, items),
      cursor,
      hasMore,
      lastError: null,
    }));
  }, []);

  const setActive = useCallback((id: string | null) => {
    setState((current) => ({ ...current, activeId: id }));
  }, []);

  const setError = useCallback((message: string) => {
    setState((current) => ({ ...current, phase: "error", lastError: message }));
  }, []);

  const activeIndex = useMemo(
    () => state.queue.findIndex((item) => item.id === state.activeId),
    [state.queue, state.activeId],
  );

  return {
    state,
    activeIndex,
    replaceQueue,
    appendQueue,
    setActive,
    setError,
    shouldPrefetch: shouldPrefetch(Math.max(0, activeIndex), state.queue.length, state.hasMore),
  };
}

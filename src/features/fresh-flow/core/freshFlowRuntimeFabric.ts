import type { FreshFlowMediaWorldId } from "./freshFlowArchitecture";

export type FreshFlowContentKind =
  | "short" | "long-video" | "news" | "post" | "vr" | "ar" | "podcast" | "image" | "interactive";

export type FreshFlowItem = {
  id: string;
  kind: FreshFlowContentKind;
  world: FreshFlowMediaWorldId;
  authorId: string | null;
  title: string;
  description: string;
  mediaUrl: string | null;
  posterUrl: string | null;
  createdAt: string;
  durationMs?: number;
  safety: "approved" | "pending" | "blocked";
  score?: number;
};

export type FreshFlowContext = {
  userId: string | null;
  world: FreshFlowMediaWorldId;
  discovery: string;
  sessionId: string;
  locale: string;
  connection: "fast" | "slow" | "offline";
  reducedMotion: boolean;
};

export type FreshFlowRuntimeState = {
  phase: "idle" | "loading" | "ready" | "error";
  activeId: string | null;
  queue: FreshFlowItem[];
  cursor: string | null;
  hasMore: boolean;
  lastError: string | null;
  loadingMore: boolean;
};

export const FRESH_FLOW_PAGE_SIZE = 24;
export const FRESH_FLOW_PREFETCH_AHEAD = 6;
export const FRESH_FLOW_MAX_QUEUE = 60;

export function createFreshFlowRuntimeState(): FreshFlowRuntimeState {
  return { phase: "idle", activeId: null, queue: [], cursor: null, hasMore: true, lastError: null, loadingMore: false };
}

export function mergeFreshFlowQueue(
  current: readonly FreshFlowItem[],
  incoming: readonly FreshFlowItem[],
): FreshFlowItem[] {
  const byId = new Map(current.map((item) => [item.id, item]));
  for (const item of incoming) byId.set(item.id, item);
  return [...byId.values()].slice(0, FRESH_FLOW_MAX_QUEUE);
}

export function shouldPrefetch(activeIndex: number, queueLength: number, hasMore: boolean): boolean {
  return hasMore && queueLength > 0 && activeIndex >= Math.max(0, queueLength - FRESH_FLOW_PREFETCH_AHEAD);
}

export function selectActiveItem(queue: readonly FreshFlowItem[], activeId: string | null): FreshFlowItem | null {
  if (!queue.length) return null;
  if (activeId) return queue.find((item) => item.id === activeId) ?? queue[0];
  return queue[0];
}

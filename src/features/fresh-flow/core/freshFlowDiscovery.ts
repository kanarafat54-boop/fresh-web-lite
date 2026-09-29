import type { FreshFlowItem, FreshFlowContext } from "./freshFlowRuntimeFabric";

export type DiscoverySignal = {
  type: "watch" | "complete" | "skip" | "like" | "save" | "share" | "follow" | "comment" | "report";
  itemId: string;
  value?: number;
};

export type DiscoveryWeights = {
  relevance: number;
  freshness: number;
  completion: number;
  affinity: number;
  diversity: number;
  safety: number;
};

const DEFAULT_WEIGHTS: DiscoveryWeights = {
  relevance: 0.30, freshness: 0.15, completion: 0.20, affinity: 0.15, diversity: 0.10, safety: 0.10,
};

export function scoreFreshFlowItem(
  item: FreshFlowItem,
  context: FreshFlowContext,
  signals: ReadonlyMap<string, DiscoverySignal[]>,
  weights: DiscoveryWeights = DEFAULT_WEIGHTS,
): number {
  if (item.safety === "blocked") return Number.NEGATIVE_INFINITY;
  const itemSignals = signals.get(item.id) ?? [];
  const watch = itemSignals.filter((s) => s.type === "watch").length;
  const completion = itemSignals.filter((s) => s.type === "complete").length;
  const positive = itemSignals.filter((s) => ["like", "save", "share", "follow", "comment"].includes(s.type)).length;
  const skip = itemSignals.filter((s) => s.type === "skip").length;

  const ageHours = Math.max(0, (Date.now() - new Date(item.createdAt).getTime()) / 3_600_000);
  const freshness = 1 / (1 + ageHours / 24);
  const completionRate = completion / Math.max(1, watch);
  const affinity = Math.min(1, positive / 4);
  const relevance = item.world === context.world ? 1 : 0.35;
  const diversity = 1 / (1 + itemSignals.length * 0.08);
  const safety = item.safety === "approved" ? 1 : 0.25;
  const penalty = Math.min(0.5, skip * 0.08);

  return (
    relevance * weights.relevance +
    freshness * weights.freshness +
    completionRate * weights.completion +
    affinity * weights.affinity +
    diversity * weights.diversity +
    safety * weights.safety -
    penalty
  );
}

export function rankFreshFlow(
  items: readonly FreshFlowItem[],
  context: FreshFlowContext,
  signals: ReadonlyMap<string, DiscoverySignal[]>,
): FreshFlowItem[] {
  return items
    .map((item) => ({ item, score: scoreFreshFlowItem(item, context, signals) }))
    .filter(({ score }) => Number.isFinite(score))
    .sort((a, b) => b.score - a.score || b.item.createdAt.localeCompare(a.item.createdAt))
    .map(({ item, score }) => ({ ...item, score }));
}

export function diversifyFreshFlow(items: readonly FreshFlowItem[], maxPerAuthor = 2): FreshFlowItem[] {
  const authorCounts = new Map<string, number>();
  const result: FreshFlowItem[] = [];
  for (const item of items) {
    const key = item.authorId ?? item.id;
    const count = authorCounts.get(key) ?? 0;
    if (count >= maxPerAuthor) continue;
    authorCounts.set(key, count + 1);
    result.push(item);
  }
  return result;
}

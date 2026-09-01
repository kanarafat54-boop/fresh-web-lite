import type { Short } from "../../shorts/types/short";

const HOUR_MS = 60 * 60 * 1000;

/**
 * Fresh Flow's ranking is deliberately the inverse bias of the dedicated
 * Shorts tab's For-You algorithm. Where Shorts favors proven engagement
 * (likes/comments/reposts, follow/hot boosts), Fresh Flow favors discovery:
 * very recent, lower-view-count content, interleaved round-robin by author
 * so no single creator can dominate consecutive slots. This is a real,
 * distinct scoring pass, not a relabeled copy of the Shorts algorithm.
 */
export function rankFreshFlow(shorts: readonly Short[]): Short[] {
  const scored = shorts.map((short) => {
    const ageHours = Math.max(0, (Date.now() - new Date(short.createdAt).getTime()) / HOUR_MS);
    const recency = Math.pow(0.5, ageHours / 12); // faster decay than Shorts (12h vs 30h half-life): favors very recent posts
    const noveltyBoost = 1 / Math.log2(short.viewCount + 4); // lower view count scores higher: the opposite of popularity-first
    const engagementFloor = Math.min(1, (short.likeCount + short.commentCount) / 20); // small floor so completely dead content doesn't dominate
    return { short, score: recency * 0.5 + noveltyBoost * 0.4 + engagementFloor * 0.1 };
  });

  scored.sort((a, b) => b.score - a.score);

  const byAuthor = new Map<string, typeof scored>();
  for (const item of scored) {
    const list = byAuthor.get(item.short.authorId) ?? [];
    list.push(item);
    byAuthor.set(item.short.authorId, list);
  }

  const queues = [...byAuthor.values()];
  const interleaved: Short[] = [];
  let remaining = scored.length;
  let cursor = 0;
  let spins = 0;
  const maxSpins = queues.length * scored.length + queues.length + 1;

  while (remaining > 0 && spins < maxSpins) {
    const queue = queues[cursor % queues.length];
    if (queue.length > 0) {
      interleaved.push(queue.shift()!.short);
      remaining -= 1;
    }
    cursor += 1;
    spins += 1;
  }

  return interleaved;
}

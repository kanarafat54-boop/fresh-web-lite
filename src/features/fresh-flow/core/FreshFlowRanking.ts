import type { Short } from "../../shorts/types/short";

const HOUR_MS = 60 * 60 * 1000;

/**
 * Fresh Flow discovery ranking: recent, lower-view-count content with
 * creator interleaving so discovery is not dominated by one author.
 */
export function rankFreshFlow(shorts: readonly Short[]): Short[] {
  const scored = shorts.map((short) => {
    const ageHours = Math.max(0, (Date.now() - new Date(short.createdAt).getTime()) / HOUR_MS);
    const recency = Math.pow(0.5, ageHours / 12);
    const noveltyBoost = 1 / Math.log2(short.viewCount + 4);
    const engagementFloor = Math.min(1, (short.likeCount + short.commentCount) / 20);
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

/**
 * Trending is intentionally popularity/recent-activity driven, distinct
 * from For You and Fresh Picks. Hot activity is the strongest signal, with
 * engagement velocity and recency providing supporting signals.
 */
export function rankTrending(shorts: readonly Short[]): Short[] {
  return [...shorts].sort((a, b) => {
    const engagementA = a.likeCount + a.commentCount * 2 + a.repostCount * 3;
    const engagementB = b.likeCount + b.commentCount * 2 + b.repostCount * 3;
    const hotA = a.isHot ? 3 : 0;
    const hotB = b.isHot ? 3 : 0;
    const ageA = Math.max(0, (Date.now() - new Date(a.createdAt).getTime()) / HOUR_MS);
    const ageB = Math.max(0, (Date.now() - new Date(b.createdAt).getTime()) / HOUR_MS);
    const recencyA = Math.pow(0.5, ageA / 24);
    const recencyB = Math.pow(0.5, ageB / 24);
    const scoreA = hotA + engagementA / Math.max(a.viewCount, 1) * 100 + recencyA;
    const scoreB = hotB + engagementB / Math.max(b.viewCount, 1) * 100 + recencyB;
    return scoreB - scoreA;
  });
}

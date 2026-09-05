import type { Short } from "../types/short";

const HOUR_MS = 60 * 60 * 1000;
const RECENCY_HALF_LIFE_HOURS = 30; // score halves roughly every 30h since posting
const SEEN_PENALTY = 0.35;
const EXPLORATION_JITTER = 0.08;

function engagementRate(short: Short): number {
  const denominator = Math.max(short.viewCount, 1);
  const weighted = short.likeCount * 1 + short.commentCount * 2 + short.repostCount * 3;
  return weighted / denominator;
}

function recencyBoost(short: Short): number {
  const ageHours = Math.max(0, (Date.now() - new Date(short.createdAt).getTime()) / HOUR_MS);
  return Math.pow(0.5, ageHours / RECENCY_HALF_LIFE_HOURS);
}

/**
 * Stable per-item exploration signal.
 *
 * The previous implementation used Math.random(), which could reshuffle the
 * same candidate set whenever ranking ran again. A deterministic hash keeps a
 * small exploration component without making the feed jump unpredictably.
 */
function explorationJitter(id: string): number {
  let hash = 2166136261;
  for (let index = 0; index < id.length; index += 1) {
    hash ^= id.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  const unit = (hash >>> 0) / 4294967295;
  return (unit - 0.5) * EXPLORATION_JITTER;
}

export function scoreShort(short: Short, viewedIds: ReadonlySet<string>): number {
  let score = engagementRate(short) * 2 + recencyBoost(short);
  if (short.isFollowingAuthor) score += 0.6;
  if (short.isHot) score += 0.5;
  if (viewedIds.has(short.id)) score -= SEEN_PENALTY;
  score += explorationJitter(short.id);
  return score;
}

export function rankForYou(shorts: readonly Short[], viewedIds: ReadonlySet<string>): Short[] {
  return [...shorts].sort((a, b) => scoreShort(b, viewedIds) - scoreShort(a, viewedIds));
}

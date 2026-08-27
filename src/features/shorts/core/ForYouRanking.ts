import type { Short } from "../types/short";

const HOUR_MS = 60 * 60 * 1000;
const RECENCY_HALF_LIFE_HOURS = 30; // score halves roughly every 30h since posting
const SEEN_PENALTY = 0.35;
const EXPLORATION_JITTER = 0.08; // small randomness so the feed isn't perfectly static

function engagementRate(short: Short): number {
  const denominator = Math.max(short.viewCount, 1);
  const weighted = short.likeCount * 1 + short.commentCount * 2 + short.repostCount * 3;
  return weighted / denominator;
}

function recencyBoost(short: Short): number {
  const ageHours = Math.max(0, (Date.now() - new Date(short.createdAt).getTime()) / HOUR_MS);
  return Math.pow(0.5, ageHours / RECENCY_HALF_LIFE_HOURS);
}

export function scoreShort(short: Short, viewedIds: ReadonlySet<string>): number {
  let score = engagementRate(short) * 2 + recencyBoost(short);
  if (short.isFollowingAuthor) score += 0.6;
  if (short.isHot) score += 0.5;
  if (viewedIds.has(short.id)) score -= SEEN_PENALTY;
  score += (Math.random() - 0.5) * EXPLORATION_JITTER;
  return score;
}

export function rankForYou(shorts: readonly Short[], viewedIds: ReadonlySet<string>): Short[] {
  return [...shorts].sort((a, b) => scoreShort(b, viewedIds) - scoreShort(a, viewedIds));
}

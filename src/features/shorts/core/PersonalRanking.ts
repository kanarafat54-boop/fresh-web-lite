/**
 * Personalised For You ranking for Fresh Shorts.
 *
 * Pure and deterministic. It learns ONLY from the signed-in user's own
 * `fresh_flow_events` rows (owner-only RLS) and the public Short fields; nothing
 * leaves the device and no model is trained server-side.
 *
 * score = baseline(engagement, recency, following, hot)         // existing ranker
 *       + W_AUTHOR * authorAffinity + W_TOPIC * topicAffinity   // learned taste
 *       + W_EXPLORE * novelty                                    // under-observed items get a chance
 *       - penalties (already finished, skipped, seen)            // don't repeat or re-serve rejects
 * followed by greedy diversity (author + topic repetition).
 */
import type { Short } from "../types/short";
import { scoreShort } from "./ForYouRanking";

export type WatchEvent = { mediaId: string; event: string; at: number };

export type TasteProfile = {
  author: Map<string, number>;
  topic: Map<string, number>;
  /** media id -> net reward from the user's own history */
  media: Map<string, number>;
  skipped: Set<string>;
  completed: Set<string>;
  events: number;
};

const DAY_MS = 86_400_000;
const HALF_LIFE_DAYS = 14;
const SHRINK_K = 3;
const W_AUTHOR = 0.9;
const W_TOPIC = 0.7;
const W_EXPLORE = 0.25;
const DIVERSITY_AUTHOR = 0.3;
const DIVERSITY_TOPIC = 0.12;
const COMPLETED_PENALTY = 1.2;
const SKIPPED_PENALTY = 1.6;

/** Reward per event. Deliberate actions outweigh passive ones; skip is negative. */
export const EVENT_REWARD: Record<string, number> = {
  play_25: 0.15, play_50: 0.2, play_75: 0.25, complete: 0.4,
  like: 1.5, save: 2, share: 2, comment_open: 0.5, skip: -1,
};

const STOP = new Set(["the", "and", "for", "you", "with", "this", "that", "from", "are", "was", "fresh", "short", "your", "have", "just", "but", "not", "all"]);

export function topicsOf(short: Pick<Short, "caption" | "soundName">): string[] {
  const text = `${short.caption ?? ""} ${short.soundName ?? ""}`.toLowerCase();
  const words = text.match(/#?[a-z][a-z0-9]{2,}/g) ?? [];
  return [...new Set(words.map((w) => w.replace(/^#/, "")).filter((w) => !STOP.has(w)))].slice(0, 12);
}

function decay(at: number, now: number): number {
  return Math.pow(0.5, Math.max(0, now - at) / (HALF_LIFE_DAYS * DAY_MS));
}

export function buildTasteProfile(events: readonly WatchEvent[], catalog: ReadonlyMap<string, Short>, now = Date.now()): TasteProfile {
  const media = new Map<string, number>();
  const skipped = new Set<string>();
  const completed = new Set<string>();
  const weight = new Map<string, number>();
  for (const e of events) {
    const reward = EVENT_REWARD[e.event];
    if (reward === undefined) continue;
    const d = decay(e.at, now);
    media.set(e.mediaId, (media.get(e.mediaId) ?? 0) + reward * d);
    weight.set(e.mediaId, (weight.get(e.mediaId) ?? 0) + d);
    if (e.event === "skip") skipped.add(e.mediaId);
    if (e.event === "complete") completed.add(e.mediaId);
  }
  // A finished or liked Short overrides an earlier skip of the same item.
  for (const id of completed) if ((media.get(id) ?? 0) > 0) skipped.delete(id);

  const authorSum = new Map<string, { sum: number; n: number }>();
  const topicSum = new Map<string, { sum: number; n: number }>();
  for (const [id, net] of media) {
    const short = catalog.get(id);
    if (!short) continue;
    const bump = (map: Map<string, { sum: number; n: number }>, key: string) => {
      const cur = map.get(key) ?? { sum: 0, n: 0 };
      cur.sum += net; cur.n += 1; map.set(key, cur);
    };
    bump(authorSum, short.authorId);
    for (const t of topicsOf(short)) bump(topicSum, t);
  }
  // tanh squashes outliers; shrinkage keeps one data point from dominating.
  const finish = (m: Map<string, { sum: number; n: number }>) => new Map([...m].map(([k, v]) => [k, Math.tanh(v.sum / v.n) * (v.n / (v.n + SHRINK_K))] as const));
  return { author: finish(authorSum), topic: finish(topicSum), media, skipped, completed, events: events.length };
}

function topicAffinity(short: Short, profile: TasteProfile): number {
  const ts = topicsOf(short);
  if (ts.length === 0) return 0;
  let sum = 0;
  for (const t of ts) sum += profile.topic.get(t) ?? 0;
  return sum / Math.sqrt(ts.length);
}

export function scorePersonal(short: Short, profile: TasteProfile, viewedIds: ReadonlySet<string>): number {
  let score = scoreShort(short, viewedIds);
  if (profile.events > 0) {
    score += W_AUTHOR * (profile.author.get(short.authorId) ?? 0);
    score += W_TOPIC * Math.max(-1, Math.min(1, topicAffinity(short, profile)));
  }
  score += W_EXPLORE / Math.sqrt(1 + Math.max(0, short.viewCount));
  if (profile.completed.has(short.id)) score -= COMPLETED_PENALTY;
  if (profile.skipped.has(short.id)) score -= SKIPPED_PENALTY;
  return score;
}

export function rankPersonal(shorts: readonly Short[], profile: TasteProfile, viewedIds: ReadonlySet<string>): Short[] {
  const remaining = shorts.map((short) => ({ short, base: scorePersonal(short, profile, viewedIds), topics: topicsOf(short) }));
  const out: Short[] = [];
  const authors = new Map<string, number>();
  const topics = new Map<string, number>();
  while (remaining.length) {
    let best = 0; let bestScore = -Infinity;
    for (let i = 0; i < remaining.length; i += 1) {
      const c = remaining[i];
      let rep = 0;
      for (const t of c.topics) rep += topics.get(t) ?? 0;
      const s = c.base - (authors.get(c.short.authorId) ?? 0) * DIVERSITY_AUTHOR - Math.min(rep, 6) * DIVERSITY_TOPIC;
      if (s > bestScore) { bestScore = s; best = i; }
    }
    const [pick] = remaining.splice(best, 1);
    out.push(pick.short);
    authors.set(pick.short.authorId, (authors.get(pick.short.authorId) ?? 0) + 1);
    for (const t of pick.topics) topics.set(t, (topics.get(t) ?? 0) + 1);
  }
  return out;
}

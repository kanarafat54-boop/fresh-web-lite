#!/usr/bin/env node
/**
 * Offline evaluation of the Shorts ranker on a SEEDED SIMULATION.
 *
 * This is not production data. Synthetic users have hidden tastes (preferred topics
 * and creators); their reactions to a Short follow that taste plus noise, and are
 * converted into the same events the app emits. We then compare rankers on held-out
 * candidates the user has not yet seen: baseline (`rankForYou`) vs personalised.
 * Metrics: NDCG@10 and mean true-affinity@10 against the hidden taste. It shows the
 * ranker uses the signals correctly; it cannot prove lift on real users.
 *
 *   node scripts/eval-fresh-shorts-ranking.mjs [--min-lift 0.15]
 */
import assert from "node:assert/strict";
import { register } from "node:module";

// The app imports extensionless TS paths (bundler style); teach Node to resolve them.
register("data:text/javascript," + encodeURIComponent(`export async function resolve(s, c, next) { try { return await next(s, c); } catch (e) { if (/^\\.\\.?\\//.test(s)) return next(s + ".ts", c); throw e; } }`));
const { rankForYou } = await import("../src/features/shorts/core/ForYouRanking.ts");
const { buildTasteProfile, rankPersonal, topicsOf } = await import("../src/features/shorts/core/PersonalRanking.ts");

let seed = 20261030;
const rand = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
const pick = (a) => a[Math.floor(rand() * a.length)];
const TOPICS = ["cooking", "football", "gaming", "travel", "music", "fitness", "comedy", "science", "fashion", "pets"];
const NOW = Date.UTC(2026, 9, 30);

const authors = Array.from({ length: 40 }, (_, i) => ({ id: `a${i}`, topics: [pick(TOPICS), pick(TOPICS)] }));
const catalog = Array.from({ length: 600 }, (_, i) => {
  const author = pick(authors);
  const topic = rand() < 0.8 ? pick(author.topics) : pick(TOPICS);
  const views = Math.floor(rand() * 5000);
  return {
    id: `s${i}`, authorId: author.id, authorName: author.id, authorUsername: author.id,
    caption: `${topic} moments with ${pick(TOPICS)} vibes`, soundName: null, videoUrl: "x",
    likeCount: Math.floor(views * rand() * 0.15), commentCount: Math.floor(views * rand() * 0.03), viewCount: views, repostCount: Math.floor(views * rand() * 0.02),
    myReaction: null, repostedByMe: false, isFollowingAuthor: false, reactionBreakdown: {}, isHot: rand() < 0.05, chapters: [],
    createdAt: new Date(NOW - rand() * 10 * 86400000).toISOString(), _topic: topic,
  };
});
const byId = new Map(catalog.map((s) => [s.id, s]));

function makeUser() {
  const likes = new Set([pick(TOPICS), pick(TOPICS), pick(TOPICS)]);
  const fav = new Set([pick(authors).id, pick(authors).id]);
  // true affinity in [0,1], hidden from rankers
  const affinity = (s) => Math.min(1, (likes.has(s._topic) ? 0.6 : 0.05) + (fav.has(s.authorId) ? 0.3 : 0) + (topicsOf(s).some((t) => likes.has(t)) ? 0.1 : 0));
  return { affinity };
}

function history(user, items) {
  const events = [];
  for (const s of items) {
    const a = Math.min(1, Math.max(0, user.affinity(s) + (rand() - 0.5) * 0.3));
    const t = NOW - rand() * 7 * 86400000;
    events.push({ mediaId: s.id, event: "play_start", at: t });
    if (a < 0.3) { events.push({ mediaId: s.id, event: "skip", at: t }); continue; }
    for (const e of ["play_25", "play_50", "play_75"]) events.push({ mediaId: s.id, event: e, at: t });
    if (a > 0.45) events.push({ mediaId: s.id, event: "complete", at: t });
    if (a > 0.7) events.push({ mediaId: s.id, event: "like", at: t });
    if (a > 0.85) events.push({ mediaId: s.id, event: "save", at: t });
  }
  return events;
}

const dcg = (gains) => gains.reduce((sum, g, i) => sum + g / Math.log2(i + 2), 0);
function evaluate(rank, user, candidates, k = 10) {
  const top = rank(candidates).slice(0, k);
  const gains = top.map((s) => user.affinity(s));
  const ideal = candidates.map((s) => user.affinity(s)).sort((a, b) => b - a).slice(0, k);
  return { ndcg: dcg(gains) / dcg(ideal), aff: gains.reduce((a, b) => a + b, 0) / k };
}

function run(historySize) {
  const N = 300; let base = { ndcg: 0, aff: 0 }; let pers = { ndcg: 0, aff: 0 }; let cold = { ndcg: 0, aff: 0 };
  for (let u = 0; u < N; u += 1) {
    const user = makeUser();
    const shuffled = [...catalog].sort(() => rand() - 0.5);
    const seen = shuffled.slice(0, historySize);
    const candidates = shuffled.slice(historySize, historySize + 60);
    const profile = buildTasteProfile(history(user, seen), byId, NOW);
    const emptyProfile = buildTasteProfile([], byId, NOW);
    const viewed = new Set(seen.map((s) => s.id));
    const b = evaluate((c) => rankForYou(c, viewed), user, candidates);
    const p = evaluate((c) => rankPersonal(c, profile, viewed), user, candidates);
    const c0 = evaluate((c) => rankPersonal(c, emptyProfile, viewed), user, candidates);
    for (const [acc, r] of [[base, b], [pers, p], [cold, c0]]) { acc.ndcg += r.ndcg / N; acc.aff += r.aff / N; }
  }
  return { base, pers, cold };
}

const minLiftArg = process.argv.indexOf("--min-lift");
const minLift = minLiftArg > 0 ? Number(process.argv[minLiftArg + 1]) : 0.15;
console.log("Seeded simulation (300 synthetic users, 60 unseen candidates, top-10). Not production data.\n");
console.log("history  baseline aff@10  personal aff@10  lift     baseline NDCG  personal NDCG  cold-start aff@10");
let last;
for (const size of [0, 10, 30, 80]) {
  const r = run(size); last = { size, r };
  const lift = r.pers.aff / r.base.aff - 1;
  console.log(`${String(size).padStart(7)}  ${r.base.aff.toFixed(3).padStart(15)}  ${r.pers.aff.toFixed(3).padStart(15)}  ${(lift * 100).toFixed(1).padStart(5)}%  ${r.base.ndcg.toFixed(3).padStart(13)}  ${r.pers.ndcg.toFixed(3).padStart(13)}  ${r.cold.aff.toFixed(3).padStart(17)}`);
  if (size === 0) assert.ok(Math.abs(r.pers.aff - r.base.aff) / r.base.aff < 0.5, "cold start must not collapse relative to baseline");
}
const finalLift = last.r.pers.aff / last.r.base.aff - 1;
assert.ok(finalLift >= minLift, `personalised ranker must beat the baseline by >= ${minLift * 100}% with 80 events of history (got ${(finalLift * 100).toFixed(1)}%)`);
console.log(`\nPASS: with ${last.size} watched Shorts of history, true-affinity@10 is ${(finalLift * 100).toFixed(1)}% above the baseline.`);

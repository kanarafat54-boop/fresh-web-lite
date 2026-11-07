import assert from "node:assert/strict";
import { explainShort, mutedOverlap } from "../src/features/fresh-flow/core/shortsWhy.ts";

const base = { tab: "for-you", signedIn: true, isFollowingAuthor: false, isHot: false, hashtags: [], interests: [], showLessTopics: [], authorWeight: null, topicWeights: {}, authorName: "@amina" };
const ids = (input) => explainShort({ ...base, ...input }).map((r) => r.id);

// No signal: the answer says so and invents nothing.
assert.deepEqual(ids({}), ["general"]);
assert.match(explainShort(base)[0].text, /no specific signal/i);
assert.match(explainShort({ ...base, signedIn: false })[0].text, /not signed in/i);

// Each reason appears only when its signal is real.
assert.deepEqual(ids({ tab: "following", isFollowingAuthor: true }), ["tab", "following"]);
assert.ok(ids({ interests: ["Cooking"], hashtags: ["cooking", "food"] }).includes("interests"));
assert.ok(!ids({ interests: ["travel"], hashtags: ["cooking"] }).includes("interests"));
assert.ok(ids({ authorWeight: 0.4 }).includes("author-history"));
assert.ok(!ids({ authorWeight: 0 }).includes("author-history"));
assert.ok(!ids({ authorWeight: -1 }).includes("author-history"));
assert.ok(!ids({ signedIn: false, authorWeight: 1 }).includes("author-history"), "no history claims for guests");
assert.ok(ids({ hashtags: ["music"], topicWeights: { music: 0.3 } }).includes("topic-history"));
assert.ok(!ids({ hashtags: ["music"], topicWeights: { music: -0.3 } }).includes("topic-history"));
assert.ok(ids({ isHot: true }).includes("hot"));
assert.ok(!ids({ isHot: true, tab: "trending" }).includes("hot"), "no duplicate of the Trending tab reason");

// Interest text names the matched tags, capped at three.
const many = explainShort({ ...base, interests: ["a1", "b2", "c3", "d4"], hashtags: ["a1", "b2", "c3", "d4"] }).find((r) => r.id === "interests");
assert.ok(many.text.includes("#a1") && !many.text.includes("#d4"));

// Show-less overlap helper.
assert.deepEqual(mutedOverlap({ hashtags: ["Gossip", "news"], showLessTopics: ["gossip", "sports"] }), ["gossip"]);
console.log("fresh-shorts-why: ok");

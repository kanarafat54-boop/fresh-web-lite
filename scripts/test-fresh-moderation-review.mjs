import assert from "node:assert/strict";
import { queueFromRows, appealsFromRows, decisionsFor, targetLabel, validateReason, validateAppeal, explainModerationError, isModerationUnavailable, isReviewer } from "../src/features/fresh-flow/core/moderationReview.ts";
import { buildActivityItems } from "../src/features/fresh-flow/core/shortsActivityModel.ts";

const U = "11111111-1111-4111-8111-111111111111";
const row = { report_id: "r1", target_type: "short", target_id: "s1", reason: "spam", details: null, status: "open", created_at: "2026-11-12T10:00:00Z", report_count: "3", target_author_id: U, preview: "caption", target_state: "visible" };
const q = queueFromRows([row, { ...row, report_id: "r2", status: "weird" }, { ...row, report_id: "r3", created_at: "nope" }, { ...row, report_id: null }, null]);
assert.equal(q.length, 1);
assert.equal(q[0].reportCount, 3);
assert.deepEqual(queueFromRows(null), []);
assert.deepEqual(queueFromRows("x"), []);

const a = { appeal_id: "a1", target_type: "short_comment", target_id: "c1", message: "mistake", status: "open", created_at: "2026-11-12T10:00:00Z", decision: "hidden", decision_reason: "abuse", preview: "text" };
assert.equal(appealsFromRows([a, { ...a, appeal_id: "a2", target_type: "profile" }, { ...a, appeal_id: "a3", status: "x" }]).length, 1);

assert.deepEqual(decisionsFor("short").map((d) => d.id), ["hidden", "dismissed"], "Shorts are hidden, never removed");
assert.deepEqual(decisionsFor("short_comment").map((d) => d.id), ["hidden", "removed", "dismissed"]);
assert.deepEqual(decisionsFor("profile").map((d) => d.id), ["dismissed"]);
assert.ok(decisionsFor("short").every((d) => d.id === "dismissed" || d.needsReason));
assert.equal(targetLabel("short_comment"), "Comment");
assert.equal(targetLabel("zzz"), "Item");

assert.equal(validateReason("ab").ok, false);
assert.equal(validateReason("  abc  ").ok, true);
assert.equal(validateReason("x".repeat(501)).ok, false);
assert.equal(validateAppeal("too short").ok, false);
assert.equal(validateAppeal("this was a mistake").ok, true);

assert.equal(explainModerationError("Only reviewers can do this."), "Only reviewers can do this.");
assert.match(explainModerationError("You already appealed this decision."), /already appealed/);
assert.match(explainModerationError("some raw sql error near foo"), /could not do that/);
assert.equal(isModerationUnavailable({ code: "PGRST202" }), true);
assert.equal(isModerationUnavailable({ code: "42883", message: "function review_queue does not exist" }), true);
assert.equal(isModerationUnavailable({ code: "42501", message: "Only reviewers" }), false);
assert.equal(isModerationUnavailable(null), false);
assert.equal(isReviewer("admin"), true);
assert.equal(isReviewer("user"), false);
assert.equal(isReviewer(undefined), false);

// notifications: moderation of the viewer's own content carries an appeal handle
const raw = {
  viewerId: U, captions: new Map(), names: new Map(), shortAuthors: new Map(), myUsername: null,
  myComments: new Map([["c1", { short_id: "s1", content: "hi", moderation_state: "removed", moderation_reason: "abuse", moderated_at: "2026-11-12T09:00:00Z" }], ["c2", { short_id: "s1", content: "ok", moderation_state: "visible", moderated_at: null }]]),
  hiddenShorts: [{ id: "s9", caption: "my short", moderation_reason: "spam", moderated_at: "2026-11-12T11:00:00Z" }, { id: "s8", caption: "x", moderation_reason: null, moderated_at: null }],
  mentions: [], followedShorts: [], likes: [], comments: [], replies: [], commentReactions: [], reposts: [], remixes: [], gifts: [], follows: [], system: [],
};
const items = buildActivityItems(raw);
assert.equal(items.length, 2, "visible comment and a hidden Short without a decision time produce nothing");
assert.deepEqual(items[0].appeal, { targetType: "short", targetId: "s9" });
assert.equal(items[0].text, "Your Short was hidden");
assert.deepEqual(items[1].appeal, { targetType: "short_comment", targetId: "c1" });
const none = buildActivityItems({ ...raw, hiddenShorts: undefined });
assert.equal(none.length, 1, "works before the moderation update exists");
console.log("moderation review: ok");

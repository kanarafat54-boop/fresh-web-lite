import assert from "node:assert/strict";
import fs from "node:fs";
import { buildActivityItems, matchesTab, timeAgo } from "../src/features/fresh-flow/core/shortsActivityModel.ts";

const ME = "me";
const base = () => ({
  viewerId: ME,
  captions: new Map([["s1", "Jollof tips"]]),
  myComments: new Map([["c-mine", { short_id: "s9", content: "great point" }]]),
  names: new Map([["u1", "@amina"], ["u2", "@kofi"]]),
  likes: [], comments: [], replies: [], commentReactions: [], reposts: [], remixes: [], gifts: [], follows: [], system: [],
});
const kinds = (raw) => buildActivityItems(raw).map((i) => i.kind);

// Empty account: nothing invented.
assert.deepEqual(buildActivityItems(base()), []);

// Replies to my comment are reported once, as a reply, even if they also appear among comments on my Short.
const raw = base();
const reply = { id: "r1", short_id: "s1", author_id: "u1", content: "agreed", created_at: "2026-11-02T10:00:00Z", parent_id: "c-mine", moderation_state: "visible" };
raw.replies = [reply];
raw.comments = [reply, { id: "c2", short_id: "s1", author_id: "u2", content: "nice", created_at: "2026-11-03T10:00:00Z", parent_id: null, moderation_state: "visible" }];
const items = buildActivityItems(raw);
assert.deepEqual(items.map((i) => i.id), ["comment-c2", "reply-r1"]);
assert.equal(items[1].text, "@amina replied to your comment");
assert.equal(items[1].shortId, "s1");

// A reply to someone else's comment is not a reply notification.
raw.replies = [{ ...reply, parent_id: "someone-elses" }];
raw.comments = [];
assert.deepEqual(kinds(raw), []);

// Hidden or removed comments never notify.
const hidden = base();
hidden.comments = [{ id: "c3", short_id: "s1", author_id: "u1", content: "x", created_at: "2026-11-03T10:00:00Z", parent_id: null, moderation_state: "removed" }];
assert.deepEqual(kinds(hidden), []);

// The viewer's own actions never notify them.
const own = base();
own.likes = [{ short_id: "s1", user_id: ME, created_at: "2026-11-01T00:00:00Z", reaction_type: "like" }];
own.reposts = [{ short_id: "s1", user_id: ME, created_at: "2026-11-01T00:00:00Z" }];
own.follows = [{ follower_id: ME, created_at: "2026-11-01T00:00:00Z" }];
own.remixes = [{ id: "x", author_id: ME, created_at: "2026-11-01T00:00:00Z", remix_of_short_id: "s1", duet_of_short_id: null }];
assert.deepEqual(kinds(own), []);

// Reactions only count when they are on the viewer's own comment.
const react = base();
react.commentReactions = [
  { comment_id: "c-mine", user_id: "u1", reaction_type: "insightful", created_at: "2026-11-04T00:00:00Z" },
  { comment_id: "other", user_id: "u1", reaction_type: "like", created_at: "2026-11-04T00:00:00Z" },
];
const reactions = buildActivityItems(react);
assert.equal(reactions.length, 1);
assert.equal(reactions[0].text, "@amina reacted (insightful) to your comment");
assert.equal(reactions[0].detail, "great point");

// Reposts, remixes and duets.
const shares = base();
shares.reposts = [{ short_id: "s1", user_id: "u1", created_at: "2026-11-05T00:00:00Z" }];
shares.remixes = [
  { id: "x1", author_id: "u2", created_at: "2026-11-06T00:00:00Z", remix_of_short_id: "s1", duet_of_short_id: null },
  { id: "x2", author_id: "u2", created_at: "2026-11-07T00:00:00Z", remix_of_short_id: null, duet_of_short_id: "s1" },
  { id: "x3", author_id: "u2", created_at: "2026-11-08T00:00:00Z", remix_of_short_id: null, duet_of_short_id: null },
];
const sh = buildActivityItems(shares);
assert.deepEqual(sh.map((i) => i.id), ["remix-x2", "remix-x1", "repost-s1-u1"]);
assert.match(sh[0].text, /made a duet with Jollof tips/);
assert.match(sh[1].text, /remixed Jollof tips/);
assert.equal(sh[0].shortId, "x2", "opens the new remix, not the original");

// Unknown actors and bad dates degrade safely.
const odd = base();
odd.likes = [{ short_id: "s1", user_id: "ghost", created_at: "2026-11-01T00:00:00Z", reaction_type: null }, { short_id: "s1", user_id: "u1", created_at: "bad", reaction_type: null }];
assert.equal(buildActivityItems(odd).length, 1);
assert.match(buildActivityItems(odd)[0].text, /^Someone liked/);

// System notifications keep unread state; results are capped and newest first.
const sys = base();
sys.system = [{ id: "n1", title: "Welcome", body: null, read_at: null, created_at: "2026-11-01T00:00:00Z" }];
assert.equal(buildActivityItems(sys)[0].unread, true);
const many = base();
many.follows = Array.from({ length: 120 }, (_, i) => ({ follower_id: `f${i}`, created_at: new Date(Date.UTC(2026, 10, 1, 0, i)).toISOString() }));
const capped = buildActivityItems(many);
assert.equal(capped.length, 80);
assert.equal(capped[0].id, "follow-f119");

// Tabs
assert.ok(matchesTab("reply", "comment") && matchesTab("reaction", "like") && matchesTab("remix", "share") && matchesTab("repost", "share"));
assert.ok(!matchesTab("gift", "like") && matchesTab("system", "all") && !matchesTab("system", "share"));
assert.equal(timeAgo("2026-11-01T00:00:00Z", Date.parse("2026-11-01T00:00:30Z")), "just now");
assert.equal(timeAgo("bad"), "");

// The loader reads only data the viewer can see and tolerates missing remix columns.
const loader = fs.readFileSync(new URL("../src/features/fresh-flow/core/shortsActivity.ts", import.meta.url), "utf8");
assert.ok(loader.includes('.eq("user_id", userId)') && loader.includes('.eq("recipient_id", userId)') && loader.includes('.eq("followed_id", userId)'));
assert.ok(loader.includes("remix_of_short_id") && loader.includes("rowsOf"), "remix read failures degrade to none");
console.log("fresh-shorts-activity: ok");

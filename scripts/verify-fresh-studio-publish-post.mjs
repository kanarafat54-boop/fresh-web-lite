import assert from "node:assert/strict";
const { postText, publishDraftAsPost, MAX_POST_CHARS } = await import("../src/features/fresh-studio/writing-studio/publishPost.ts");
const d = { title: "Hello", body: "## Big news\nWe **shipped** the editor today for everyone.", sources: "Docs | https://example.org/d" };
const t = postText(d);
assert.deepEqual(t, { ok: true, text: "Hello\n\nBig news\nWe shipped the editor today for everyone.\n\nSources\nDocs: https://example.org/d" });
assert.equal(postText({ ...d, body: " " }).ok, false);
assert.equal(postText({ ...d, sources: "nope" }).ok, false);
assert.equal(postText({ ...d, body: "word ".repeat(MAX_POST_CHARS) }).ok, false, "too long is refused");

const calls = [];
const deps = (over = {}) => ({ authorId: "u1", publish: async (i) => { calls.push(i); return { id: "p1" }; }, markPublished: async () => { calls.push("marked"); }, ...over });
let r = await publishDraftAsPost(d, deps());
assert.deepEqual(r, { ok: true, postId: "p1", statusSaved: true });
assert.deepEqual(calls, [{ authorId: "u1", content: t.text }, "marked"], "post first, then status");

calls.length = 0;
r = await publishDraftAsPost(d, deps({ authorId: null }));
assert.equal(r.ok, false); assert.equal(calls.length, 0, "signed out publishes nothing");

r = await publishDraftAsPost(d, deps({ publish: async () => { throw new Error("RLS denied"); }, markPublished: async () => { calls.push("marked"); } }));
assert.deepEqual(r, { ok: false, reason: "RLS denied" });
assert.ok(!calls.includes("marked"), "a failed post is never marked published");

r = await publishDraftAsPost(d, deps({ markPublished: async () => { throw new Error("conflict"); } }));
assert.deepEqual(r, { ok: true, postId: "p1", statusSaved: false }, "live post is reported even if the status save fails");
console.log("Fresh Studio publish-to-Posts contract passed.");

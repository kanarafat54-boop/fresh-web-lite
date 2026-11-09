import assert from "node:assert/strict";
import fs from "node:fs";
import { BLOCK_EFFECTS, isBlocksUnavailable, sortBlocked, toBlockedSet, withoutBlockedAuthors } from "../src/features/fresh-flow/core/userBlocks.ts";

// Blocked set from rows; junk rows are ignored.
assert.deepEqual([...toBlockedSet([{ blocked_id: "a" }, { blocked_id: "b" }, { blocked_id: "a" }, { blocked_id: 5 }, {}, null])].sort(), ["a", "b"]);

// Filtering hides blocked authors, keeps everything else, and never mutates the input.
const items = [{ id: 1, by: "a" }, { id: 2, by: "x" }, { id: 3, by: null }, { id: 4, by: "b" }];
const input = [...items];
assert.deepEqual(withoutBlockedAuthors(items, new Set(["a", "b"]), (i) => i.by).map((i) => i.id), [2, 3]);
assert.deepEqual(withoutBlockedAuthors(items, new Set(), (i) => i.by).map((i) => i.id), [1, 2, 3, 4]);
assert.deepEqual(items, input);

// Unavailable detection (migration not applied).
assert.equal(isBlocksUnavailable({ code: "42P01" }), true);
assert.equal(isBlocksUnavailable({ code: "PGRST205", message: "Could not find the table 'public.user_blocks' in the schema cache" }), true);
assert.equal(isBlocksUnavailable({ code: "42501", message: "permission denied" }), false);
assert.equal(isBlocksUnavailable(null), false);

// Ordering and de-duplication.
assert.deepEqual(sortBlocked([{ id: "a", name: "A", blockedAt: "2026-11-01T00:00:00Z" }, { id: "b", name: "B", blockedAt: "2026-11-03T00:00:00Z" }, { id: "a", name: "A", blockedAt: "2026-11-02T00:00:00Z" }]).map((x) => x.id), ["b", "a"]);

// What the sheet promises matches what the migration does.
const sql = fs.readFileSync(new URL("../supabase/migrations/20261109100000_fresh_user_blocks.sql", import.meta.url), "utf8");
const code = sql.replace(/--.*$/gm, "");
assert.ok(/create table if not exists public\.user_blocks/.test(code) && /enable row level security/.test(code));
assert.ok(!/\bdrop\s+(table|column)\b|\btruncate\b/i.test(code), "no destructive schema changes");
assert.equal((code.match(/auth\.uid\(\)\) = blocker_id/g) ?? []).length, 3, "select, insert and delete are all owner-only");
assert.ok(/blocker_id <> blocked_id/.test(code), "cannot block yourself");
assert.ok(/before insert on public\.short_comments/.test(code) && /parent_id/.test(code), "blocked accounts cannot comment or reply");
assert.ok(/before insert on public\.follows/.test(code), "blocked accounts cannot follow");
assert.ok(/after insert on public\.user_blocks/.test(code) && /delete from public\.follows/.test(code), "blocking removes follows both ways");
assert.ok(/revoke all on function public\.has_blocked/.test(code), "the lookup helper is not callable by clients");
assert.ok(!/to anon/i.test(code), "anonymous users get nothing");
const effects = BLOCK_EFFECTS.join(" ").toLowerCase();
for (const promise of ["comments", "reply", "follow", "removed", "not told", "public"]) assert.ok(effects.includes(promise), `explanation covers: ${promise}`);

// Every place that shows other people's content applies the block.
const read = (p) => fs.readFileSync(new URL(p, import.meta.url), "utf8");
assert.ok(read("../src/features/fresh-flow/components/FreshFlowShortsStream.tsx").includes("loadBlockedIds"), "feed hides blocked accounts");
assert.ok(read("../src/features/comments/components/CommentPanel.tsx").includes("withoutBlockedAuthors"), "comments hide blocked accounts");
assert.ok(read("../src/features/fresh-flow/components/ShortsNotifications.tsx").includes("withoutBlockedAuthors"), "notifications hide blocked accounts");
assert.ok(read("../src/features/fresh-flow/components/ShortsCreatorProfile.tsx").includes("ShortsBlockedSheet"), "profiles can block");
const svc = read("../src/features/fresh-flow/core/userBlocksService.ts");
assert.ok(svc.includes('eq("blocker_id", userId)') && svc.includes('"unavailable"'), "service scopes to the viewer and reports an unapplied migration");
console.log("fresh-user-blocks: ok");

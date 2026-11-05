import assert from "node:assert/strict";
import fs from "node:fs";
import { COMMENT_REACTIONS, reactionDef, summarizeReactions, applyReactionChoice, breakdownChips, isUnappliedReactionError, emptySummary } from "../src/features/comments/core/commentReactions.ts";

const rows = [
  { comment_id: "c1", user_id: "me", reaction_type: "like" },
  { comment_id: "c1", user_id: "u2", reaction_type: "fire" },
  { comment_id: "c1", user_id: "u3", reaction_type: "fire" },
  { comment_id: "c1", user_id: "u4", reaction_type: "insightful" },
  { comment_id: "c2", user_id: "u2", reaction_type: "clap" },
];
const sum = summarizeReactions(rows, "me");
assert.equal(sum.c1.mine, "like");
assert.equal(sum.c1.counts.fire, 2);
assert.equal(sum.c2.mine, null);
assert.deepEqual(breakdownChips(sum.c1).map((c) => [c.type, c.count]), [["fire", 2], ["insightful", 1]], "chips skip like and sort by count");

// choosing: switch, add, remove
let s = applyReactionChoice(sum.c1, "fire");
assert.equal(s.mine, "fire"); assert.equal(s.counts.fire, 3); assert.equal(s.counts.like, undefined, "switching drops the old reaction");
s = applyReactionChoice(s, "fire");
assert.equal(s.mine, null); assert.equal(s.counts.fire, 2, "choosing the same reaction removes it");
s = applyReactionChoice(emptySummary(), "respect");
assert.deepEqual(s, { counts: { respect: 1 }, mine: "respect" });

// every spec reaction is offered; flagged ones match the migration
const spec = ["curious", "inspire", "insightful", "agree", "disagree", "helpful", "question", "respect"];
for (const t of spec) assert.ok(reactionDef(t), `${t} offered`);
const migration = fs.readFileSync(new URL("../supabase/migrations/20261105100000_widen_short_comment_reactions.sql", import.meta.url), "utf8");
for (const r of COMMENT_REACTIONS) assert.ok(migration.includes(`'${r.type}'`), `${r.type} allowed by the migration`);
for (const t of ["like", "dislike", "love", "laugh", "wow", "sad", "angry", "fire", "clap", "support"]) assert.ok(migration.includes(`'${t}'`), `previous type ${t} still allowed`);
assert.ok(!/\bdelete\s+from\b|\bdrop\s+table\b|\btruncate\b/i.test(migration), "migration changes no data");
const original = fs.readFileSync(new URL("../supabase/migrations/20260824000000_shorts_interaction_depth.sql", import.meta.url), "utf8");
assert.equal(COMMENT_REACTIONS.filter((r) => r.needsMigration).every((r) => !original.includes(`'${r.type}'`)), true, "flagged types are exactly the ones the original constraint lacked");
assert.equal(COMMENT_REACTIONS.filter((r) => !r.needsMigration).every((r) => original.includes(`'${r.type}'`)), true);

assert.equal(isUnappliedReactionError({ code: "23514" }), true);
assert.equal(isUnappliedReactionError({ message: 'new row violates check constraint "short_comment_reactions_reaction_type_check"' }), true);
assert.equal(isUnappliedReactionError({ code: "42501", message: "permission denied" }), false);
assert.equal(isUnappliedReactionError(null), false);
console.log("Fresh Shorts comment reaction tests passed.");

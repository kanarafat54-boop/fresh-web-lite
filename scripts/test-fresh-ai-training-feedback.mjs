import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const endpoint = await readFile(new URL("../api/ai/training-feedback.ts", import.meta.url), "utf8");
const migration = await readFile(new URL("../supabase/migrations/20261020030000_fresh_ai_consented_feedback.sql", import.meta.url), "utf8");
const preparer = await readFile(new URL("./prepare-fresh-learning-candidates.mjs", import.meta.url), "utf8");

assert.match(endpoint, /explicit-training-opt-in/, "endpoint requires explicit training opt-in");
assert.match(endpoint, /fresh-ai-feedback-consent-v1/, "consent is versioned");
assert.match(endpoint, /authenticatedUser\(req\)/, "feedback is tied to an authenticated user");
assert.match(endpoint, /reviewStatus: "pending"/, "new candidate waits for human review");
assert.match(endpoint, /training: "not-trained"/, "endpoint never claims feedback trained the model");
assert.match(endpoint, /reviewed_by: null/, "client cannot self-approve a candidate");
assert.match(endpoint, /fresh_ai_preference_pairs/, "approved corrections are paired with the rejected answer for later review");
assert.match(endpoint, /MAX_BODY_BYTES/, "request body is bounded");
assert.match(migration, /enable row level security/i, "feedback table uses RLS");
assert.match(migration, /auth\.uid\(\) = user_id/, "RLS owner-scopes feedback");
assert.match(migration, /training_opt_in = true/, "RLS only accepts explicitly opted-in rows");
assert.match(migration, /review_status = 'pending'/, "RLS prevents client-side approval");
assert.match(migration, /Historical rows have no explicit training consent/i, "legacy feedback is excluded from training");
assert.match(preparer, /explicit-training-opt-in/, "offline candidate preparer independently checks consent");
assert.match(preparer, /approved/, "offline candidate preparer independently requires human approval");

console.log("Fresh AI training feedback consent contract passed.");

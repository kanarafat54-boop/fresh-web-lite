import assert from "node:assert/strict";
import fs from "node:fs";

const migration = fs.readFileSync(new URL("../supabase/migrations/20261124160000_fresh_shorts_comment_editing.sql", import.meta.url), "utf8");
const component = fs.readFileSync(new URL("../src/features/comments/components/CommentPanel.tsx", import.meta.url), "utf8");
const styles = fs.readFileSync(new URL("../src/features/comments/components/CommentPanel.css", import.meta.url), "utf8");
const workflow = fs.readFileSync(new URL("../.github/workflows/fresh-shorts-gate.yml", import.meta.url), "utf8");

assert.match(migration, /add column if not exists updated_at timestamptz/i);
assert.match(migration, /set updated_at = coalesce\(created_at, now\(\)\) where updated_at is null/i, "existing comments keep their original creation time");
assert.match(migration, /alter column updated_at set default now\(\)[\s\S]*alter column updated_at set not null/i);
assert.match(migration, /security invoker/i, "timestamp trigger must not bypass RLS");
assert.match(migration, /if new\.content is distinct from old\.content then[\s\S]*new\.updated_at := now\(\)[\s\S]*new\.updated_at := old\.updated_at/i, "only text changes update the edited timestamp");
assert.match(migration, /before update on public\.short_comments/i);
assert.match(migration, /revoke update on table public\.short_comments from public, anon, authenticated/i);
assert.match(migration, /grant update \(content, updated_at\) on table public\.short_comments to authenticated/i);
assert.match(migration, /for update\s+to authenticated\s+using \(\(select auth\.uid\(\)\) = author_id\)\s+with check \(\(select auth\.uid\(\)\) = author_id\)/i);
assert.doesNotMatch(migration, /security definer|\bdelete\s+from\b|\bdrop\s+table\b|\btruncate\b/i);

assert.match(component, /async function saveCommentEdit\(/);
assert.match(component, /\.eq\("author_id", user\.id\)/, "client update also scopes the row to the current author");
assert.match(component, /targetType === "short"/, "edit UI is limited to the supported Shorts table");
assert.match(component, /Edit comment/);
assert.match(component, /Save changes/);
assert.match(component, /updated_at/);
assert.match(styles, /\.fresh-comments \.comment-edit-form/);
assert.match(workflow, /test:fresh-shorts-comment-editing/);
console.log("Fresh Shorts comment editing contract tests passed.");

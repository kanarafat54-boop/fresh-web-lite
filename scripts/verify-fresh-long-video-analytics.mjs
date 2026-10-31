import fs from "node:fs";
import assert from "node:assert/strict";

const migration = fs.readFileSync("supabase/migrations/20261031093350_fresh_long_video_creator_analytics.sql", "utf8");
const completionMigration = fs.readFileSync("supabase/migrations/20261031093437_fresh_long_video_analytics_completion_guard.sql", "utf8");
const component = fs.readFileSync("src/features/fresh-flow/components/FreshFlowLongVideos.tsx", "utf8");
const css = fs.readFileSync("src/features/fresh-flow/components/FreshFlowLongVideos.css", "utf8");

assert.match(migration, /create schema if not exists private/i);
assert.match(migration, /private\.fresh_long_video_analytics_sessions/i);
assert.match(migration, /alter table private\.fresh_long_video_analytics_sessions enable row level security/i);
assert.match(migration, /revoke all on private\.fresh_long_video_analytics_sessions from public, anon, authenticated/i);
assert.match(migration, /primary key \(post_id, viewer_id, session_id\)/i);
assert.match(migration, /security definer\s+set search_path = pg_catalog/i);
assert.match(migration, /auth\.uid\(\)/i);
assert.match(migration, /v_creator_id = v_viewer_id/i);
assert.match(migration, /p_watch_seconds > 30/i);
assert.match(migration, /last_seen_at <= now\(\) - interval '5 seconds'/i);
assert.match(migration, /watched_seconds >= 2/i);
assert.match(migration, /count\(distinct viewer_id\)/i);
assert.match(migration, /revoke all on function public\.record_fresh_long_video_watch/i);
assert.match(migration, /grant execute on function public\.get_fresh_long_video_analytics\(integer\) to authenticated/i);

assert.match(component, /get_fresh_long_video_analytics/);
assert.match(component, /record_fresh_long_video_watch/);
assert.match(component, /Qualified views/);
assert.match(component, /Unique signed-in viewers/);
assert.match(component, /Watch hours/);
assert.match(component, /Completion rate/);
assert.match(component, /not fraud-proof/i);
assert.match(component, /onPause=/);
assert.match(component, /completedRequested/);
assert.match(css, /fresh-long-analytics-videos/);

console.log("Fresh Flow Long Videos analytics contract: PASS");

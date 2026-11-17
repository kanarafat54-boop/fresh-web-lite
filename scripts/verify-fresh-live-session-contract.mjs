/**
 * Static contract checks for Fresh Live Phase 1 control plane.
 * Does not require a live database or media provider.
 * Run: node scripts/verify-fresh-live-session-contract.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const migrationPath = path.join(root, "supabase/migrations/20261117120000_fresh_live_session_core.sql");
const apiPath = path.join(root, "api/live/sessions.ts");
const docPath = path.join(root, "docs/FRESH_LIVE_PHASE1_CONTROL_PLANE.md");

let failures = 0;

function ok(cond, msg) {
  if (cond) {
    console.log(`  ✓ ${msg}`);
  } else {
    console.error(`  ✗ ${msg}`);
    failures += 1;
  }
}

console.log("Fresh Live Phase 1 — control-plane contract\n");

// Migration presence and shape
ok(fs.existsSync(migrationPath), "migration file exists");
const migration = fs.existsSync(migrationPath) ? fs.readFileSync(migrationPath, "utf8") : "";
ok(migration.includes("create table if not exists public.live_sessions"), "defines live_sessions");
ok(migration.includes("create table if not exists public.live_participants"), "defines live_participants");
ok(migration.includes("enable row level security"), "enables RLS");
ok(migration.includes("'draft', 'scheduled', 'ready', 'live'"), "status machine includes core states");
ok(migration.includes("creator_id = (select auth.uid())"), "owner-scoped policies");
ok(!migration.includes("stream_key") && !migration.includes("rtmp"), "no media secrets in migration");

// API presence and safety rails
ok(fs.existsSync(apiPath), "api/live/sessions.ts exists");
const api = fs.existsSync(apiPath) ? fs.readFileSync(apiPath, "utf8") : "";
ok(api.includes('action === "create"') || api.includes('case "create"'), "supports create");
ok(api.includes('case "prepare"'), "supports prepare");
ok(api.includes("LIVE_MEDIA_NOT_CONFIGURED") || api.includes("Media plane not connected"), "start is blocked without media plane");
ok(api.includes("Authentication required"), "requires authentication");
ok(!/status:\s*["']live["']/.test(api) || api.includes("Media plane not connected"), "does not freely set status=live");

// Doc
ok(fs.existsSync(docPath), "phase-1 doc exists");

if (failures > 0) {
  console.error(`\n${failures} contract check(s) failed`);
  process.exit(1);
}
console.log("\nAll Fresh Live Phase 1 contract checks passed.");

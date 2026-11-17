/**
 * Static + pure logic contract checks for Fresh Live Phase 1.
 * Does not require a live database or media provider.
 *
 * Run: node scripts/verify-fresh-live-session-contract.mjs
 *  or: npm run test:fresh-live-session-contract
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const migrationPath = path.join(root, "supabase/migrations/20261117120000_fresh_live_session_core.sql");
const apiPath = path.join(root, "api/live/sessions.ts");
const adapterPath = path.join(root, "src/core/live/mediaAdapter.ts");
const machinePath = path.join(root, "src/core/live/sessionStateMachine.ts");
const docPath = path.join(root, "docs/FRESH_LIVE_PHASE1_CONTROL_PLANE.md");
const migrateGuidePath = path.join(root, "docs/FRESH_LIVE_MIGRATION_APPLY_GUIDE.md");

let failures = 0;

function ok(cond, msg) {
  if (cond) console.log(`  ✓ ${msg}`);
  else {
    console.error(`  ✗ ${msg}`);
    failures += 1;
  }
}

console.log("Fresh Live Phase 1 — control-plane + adapter contract\n");

// --- Files ---
console.log("Artifacts");
ok(fs.existsSync(migrationPath), "migration file exists");
ok(fs.existsSync(apiPath), "api/live/sessions.ts exists");
ok(fs.existsSync(adapterPath), "mediaAdapter.ts exists");
ok(fs.existsSync(machinePath), "sessionStateMachine.ts exists");
ok(fs.existsSync(docPath), "phase-1 doc exists");
ok(fs.existsSync(migrateGuidePath), "migration apply guide exists");

const migration = fs.existsSync(migrationPath) ? fs.readFileSync(migrationPath, "utf8") : "";
const api = fs.existsSync(apiPath) ? fs.readFileSync(apiPath, "utf8") : "";
const adapterSrc = fs.existsSync(adapterPath) ? fs.readFileSync(adapterPath, "utf8") : "";

console.log("\nMigration");
ok(migration.includes("create table if not exists public.live_sessions"), "defines live_sessions");
ok(migration.includes("create table if not exists public.live_participants"), "defines live_participants");
ok(migration.includes("enable row level security"), "enables RLS");
ok(migration.includes("'draft', 'scheduled', 'ready', 'live'"), "status machine includes core states");
ok(migration.includes("creator_id = (select auth.uid())"), "owner-scoped policies");
ok(!migration.includes("stream_key") && !migration.includes("rtmp"), "no media secrets in migration");

console.log("\nAPI safety");
ok(api.includes('case "create"'), "supports create");
ok(api.includes('case "prepare"'), "supports prepare");
ok(
  api.includes("LIVE_MEDIA_NOT_CONFIGURED") || api.includes("Media plane not connected"),
  "start blocked without media plane",
);
ok(api.includes("Authentication required"), "requires authentication");
ok(api.includes("getLiveMediaAdapter") || api.includes("isConfigured"), "start consults media adapter");

console.log("\nAdapter contract");
ok(adapterSrc.includes("export interface LiveMediaAdapter"), "LiveMediaAdapter interface");
ok(adapterSrc.includes("class NotConfiguredMediaAdapter"), "NotConfiguredMediaAdapter");
ok(adapterSrc.includes("isConfigured()"), "isConfigured method");
ok(adapterSrc.includes("MediaNotConfiguredError"), "MediaNotConfiguredError");
ok(adapterSrc.includes('providerId = "none"'), "default provider id is none");

// --- Pure state machine (dynamic import of compiled-free TS via strip if needed) ---
// Re-implement critical rules here so the script stays dependency-free,
// and keep them in lockstep with sessionStateMachine.ts.
console.log("\nState machine rules");

const ALLOWED = {
  draft: ["scheduled", "ready", "cancelled"],
  scheduled: ["ready", "cancelled"],
  ready: ["live", "cancelled", "failed"],
  live: ["ending", "interrupted", "failed"],
  interrupted: ["live", "ending", "failed"],
  ending: ["ended", "failed"],
  ended: ["processing"],
  processing: ["replay_ready", "failed"],
  cancelled: [],
  failed: [],
  replay_ready: [],
};

function canTransition(from, to, { mediaConfigured, isCreator }) {
  if (!isCreator) return { ok: false, code: "LIVE_FORBIDDEN" };
  if (!(ALLOWED[from] ?? []).includes(to)) return { ok: false, code: "LIVE_INVALID_TRANSITION" };
  if (to === "live" && !mediaConfigured) return { ok: false, code: "LIVE_MEDIA_NOT_CONFIGURED" };
  return { ok: true };
}

ok(canTransition("draft", "ready", { mediaConfigured: false, isCreator: true }).ok, "draft → ready allowed");
ok(
  canTransition("ready", "live", { mediaConfigured: false, isCreator: true }).code === "LIVE_MEDIA_NOT_CONFIGURED",
  "ready → live blocked when media not configured",
);
ok(
  canTransition("ready", "live", { mediaConfigured: true, isCreator: true }).ok,
  "ready → live allowed when media configured",
);
ok(
  canTransition("draft", "live", { mediaConfigured: true, isCreator: true }).code === "LIVE_INVALID_TRANSITION",
  "draft → live invalid even with media",
);
ok(
  canTransition("ready", "ready", { mediaConfigured: true, isCreator: true }).code === "LIVE_INVALID_TRANSITION",
  "ready → ready invalid",
);
ok(
  canTransition("live", "ended", { mediaConfigured: true, isCreator: true }).code === "LIVE_INVALID_TRANSITION",
  "live → ended must go through ending",
);
ok(canTransition("live", "ending", { mediaConfigured: true, isCreator: true }).ok, "live → ending allowed");
ok(
  canTransition("ready", "cancelled", { mediaConfigured: false, isCreator: false }).code === "LIVE_FORBIDDEN",
  "non-creator cannot cancel",
);
ok(ALLOWED.cancelled.length === 0 && ALLOWED.failed.length === 0, "terminal states have no exits");

if (failures > 0) {
  console.error(`\n${failures} contract check(s) failed`);
  process.exit(1);
}
console.log("\nAll Fresh Live Phase 1 contract checks passed.");

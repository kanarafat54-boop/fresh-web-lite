import assert from "node:assert/strict";
import fs from "node:fs";
import { MAX_DETAILS, REPORT_CATEGORIES, REPORT_TARGETS, buildReportRow, categoriesFor, cleanDetails, isMissingReportColumn, validateReport } from "../src/features/fresh-flow/core/shortsReporting.ts";

const ID = "11111111-1111-4111-8111-111111111111";
const ok = (draft) => validateReport({ details: "", ...draft });

// Spec 10.3 categories are all present.
assert.deepEqual(REPORT_CATEGORIES.map((c) => c.id), ["spam", "harassment", "dangerous", "sexual", "unauthorized_media", "copyright", "impersonation", "other"]);

// Every target offers only categories that exist, and always offers "other".
for (const [type, def] of Object.entries(REPORT_TARGETS)) {
  assert.ok(def.categories.every((id) => REPORT_CATEGORIES.some((c) => c.id === id)), type);
  assert.ok(def.categories.includes("other"), `${type} has an escape hatch`);
}
assert.ok(!categoriesFor("profile").some((c) => c.id === "copyright"), "profiles are not copyright-reportable");
assert.ok(categoriesFor("short").some((c) => c.id === "copyright") && categoriesFor("sound").some((c) => c.id === "copyright"));
assert.ok(categoriesFor("profile").some((c) => c.id === "impersonation"));

// Validation
assert.equal(ok({ targetType: "short", targetId: ID, category: "spam" }).ok, true);
assert.equal(ok({ targetType: "short_comment", targetId: ID, category: "harassment" }).ok, true);
assert.equal(ok({ targetType: "short", targetId: ID, category: null }).ok, false, "a category is required");
assert.equal(ok({ targetType: "profile", targetId: ID, category: "copyright" }).ok, false, "category must fit the target");
assert.equal(ok({ targetType: "short", targetId: "nope", category: "spam" }).ok, false, "target must be a real id");
assert.equal(ok({ targetType: "video", targetId: ID, category: "spam" }).ok, false, "unknown target type");
assert.equal(ok({ targetType: "sound", targetId: ID, category: "copyright" }).ok, false, "a sound report needs the sound name");
assert.equal(ok({ targetType: "sound", targetId: ID, category: "copyright", soundName: "Afro beat 1" }).ok, true);

// Row building: optional explanation, cleaned and capped; sound name carried in details.
assert.deepEqual(buildReportRow({ targetType: "short", targetId: ID, category: "spam", details: "" }, "u1"), { target_type: "short", target_id: ID, reporter_id: "u1", reason: "spam" });
const row = buildReportRow({ targetType: "short", targetId: ID, category: "spam", details: "  copies   my video \n" }, "u1");
assert.equal(row.details, "copies my video");
assert.equal(buildReportRow({ targetType: "short", targetId: ID, category: "spam", details: "x".repeat(2000) }, "u1").details.length, MAX_DETAILS);
const soundRow = buildReportRow({ targetType: "sound", targetId: ID, category: "copyright", details: "my song", soundName: "Afro beat 1" }, "u1");
assert.equal(soundRow.details, "[sound: Afro beat 1] my song");
assert.equal(buildReportRow({ targetType: "sound", targetId: ID, category: "copyright", details: "", soundName: "Afro beat 1" }, "u1").details, "[sound: Afro beat 1]");
assert.equal(cleanDetails(null), "");
assert.equal(cleanDetails(5), "");
// A reporter id is never taken from the draft.
assert.equal(buildReportRow({ targetType: "short", targetId: ID, category: "spam", details: "", reporter_id: "evil" }, "real").reporter_id, "real");
// No status field is ever sent by the client.
assert.ok(!("status" in soundRow));

// Missing-column detection for databases without the migration.
assert.equal(isMissingReportColumn({ code: "42703" }), true);
assert.equal(isMissingReportColumn({ code: "PGRST204", message: "Could not find the 'details' column of 'reports' in the schema cache" }), true);
assert.equal(isMissingReportColumn({ code: "42501", message: "permission denied" }), false);
assert.equal(isMissingReportColumn(null), false);

// Migration is additive, caps match, and the reporter cannot set status.
const sql = fs.readFileSync(new URL("../supabase/migrations/20261108120000_fresh_shorts_reporting.sql", import.meta.url), "utf8");
const svc0 = fs.readFileSync(new URL("../src/features/fresh-flow/core/shortsReportingService.ts", import.meta.url), "utf8");
const code = sql.replace(/--.*$/gm, "");
assert.ok(/add column if not exists details/.test(code) && /add column if not exists status/.test(code));
assert.ok(!/\bdrop\s+(table|column)\b|\bdelete\s+from\b|\btruncate\b/i.test(code), "migration only adds");
for (const type of Object.keys(REPORT_TARGETS)) assert.ok(code.includes(`'${type}'`), `database accepts target type ${type}`);
assert.ok(code.includes("'post_comment'") && /drop constraint if exists reports_target_type_check/.test(code), "the existing two-value type check is widened");
assert.ok(/create table if not exists public\.reports/.test(code), "history stays replayable where the table has no creating migration");
assert.ok(svc0.includes("23514"), "a rejected type is reported as unavailable, not as a generic failure");
assert.ok(code.includes("<= 500") && code.includes("'open', 'reviewing', 'actioned', 'dismissed'"));
assert.ok(/new\.status := 'open'/.test(code) && /before insert on public\.reports/.test(code), "client inserts are forced to open");

// The service and sheet behave honestly.
const svc = fs.readFileSync(new URL("../src/features/fresh-flow/core/shortsReportingService.ts", import.meta.url), "utf8");
assert.ok(svc.includes("duplicate") && svc.includes("explanationSaved") && svc.includes("isMissingReportColumn"), "duplicates and missing columns are handled and reported");
assert.ok(!/status\s*:/.test(svc.replace(/status: "(sent|duplicate)"/g, "")), "service never sends a status");
const sheet = fs.readFileSync(new URL("../src/features/fresh-flow/components/ShortsReportSheet.tsx", import.meta.url), "utf8");
assert.ok(sheet.includes("REPORT_NOTE") && sheet.includes("COPYRIGHT_NOTE") && sheet.includes("Sign in to report"));
// Every report entry point uses the shared sheet.
for (const file of ["FreshFlowShortsStream.tsx", "ShortsCreatorProfile.tsx", "ShortsTopicPage.tsx"]) {
  assert.ok(fs.readFileSync(new URL(`../src/features/fresh-flow/components/${file}`, import.meta.url), "utf8").includes("ShortsReportSheet"), `${file} reports through the shared sheet`);
}
assert.ok(fs.readFileSync(new URL("../src/features/comments/components/CommentPanel.tsx", import.meta.url), "utf8").includes('targetType="short_comment"'));
console.log("fresh-shorts-reporting: ok");

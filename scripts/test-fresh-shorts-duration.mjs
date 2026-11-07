import assert from "node:assert/strict";
import fs from "node:fs";
import { normalizeDuration, matchesDurationBucket, normalizeDurationBucket, normalizeLanguage, languagesPresent, isMissingColumnError } from "../src/features/fresh-flow/core/shortsDuration.ts";

// durations: only finite, positive, sane values are stored
assert.equal(normalizeDuration(12.346), 12.35);
assert.equal(normalizeDuration("20"), 20);
for (const bad of [0, -1, Infinity, NaN, null, undefined, "abc", 40_000]) assert.equal(normalizeDuration(bad), null, `${String(bad)} is not a usable duration`);

// bucket edges
assert.equal(matchesDurationBucket(14.99, "under15"), true);
assert.equal(matchesDurationBucket(15, "under15"), false);
assert.equal(matchesDurationBucket(15, "15to30"), true);
assert.equal(matchesDurationBucket(30, "30to60"), true);
assert.equal(matchesDurationBucket(60, "over60"), true);
assert.equal(matchesDurationBucket(null, "under15"), false, "unknown duration never matches a length filter");
assert.equal(matchesDurationBucket(null, "any"), true);
assert.equal(normalizeDurationBucket("nonsense"), "any");

// languages
assert.equal(normalizeLanguage("en-US"), "en");
assert.equal(normalizeLanguage("SW_ke"), "sw");
assert.equal(normalizeLanguage("lug"), "lug");
for (const bad of ["", "x", "english", "12", null, 5]) assert.equal(normalizeLanguage(bad), null);
assert.deepEqual(languagesPresent([{ language: "en" }, { language: "sw" }, { language: "en-GB" }, { language: null }, {}]), [{ code: "en", count: 2 }, { code: "sw", count: 1 }]);

// publish and load must survive a database without the new columns
assert.equal(isMissingColumnError({ code: "42703" }), true);
assert.equal(isMissingColumnError({ code: "PGRST204", message: "Could not find the 'duration_seconds' column of 'shorts' in the schema cache" }), true);
assert.equal(isMissingColumnError({ message: 'column "language" of relation "shorts" does not exist' }), true);
assert.equal(isMissingColumnError({ code: "42501", message: "permission denied" }), false);
assert.equal(isMissingColumnError(null), false);

// migration is additive and matches the app's limits
const sql = fs.readFileSync(new URL("../supabase/migrations/20261106100000_fresh_shorts_duration_language.sql", import.meta.url), "utf8");
assert.ok(/add column if not exists duration_seconds/.test(sql) && /add column if not exists language/.test(sql));
assert.ok(!/\bdrop\s+(table|column)\b|\bdelete\s+from\b|\btruncate\b|\bupdate\s+public/i.test(sql), "migration only adds columns");
assert.ok(sql.includes("36000") && sql.includes("^[a-z]{2,3}$"), "database limits match the app");

// the feed and publish paths keep their fallbacks
const loader = fs.readFileSync(new URL("../src/features/fresh-flow/core/loadFreshFlowShorts.ts", import.meta.url), "utf8");
assert.ok(loader.includes("isMissingColumnError") && loader.includes("BASE_SHORT_COLUMNS"), "loader falls back when columns are missing");
assert.ok(loader.includes("remix_of_short_id") && loader.includes("duet_of_short_id"), "loader reads remix links so the Remixes filter can match");
const publish = fs.readFileSync(new URL("../src/features/creator/core/publishFreshShort.ts", import.meta.url), "utf8");
assert.ok(publish.includes("isMissingColumnError") && publish.includes("hasMetadata"), "publish retries without the new columns");
console.log("Fresh Shorts duration and language tests passed.");

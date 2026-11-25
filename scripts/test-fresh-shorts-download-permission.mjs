import assert from "node:assert/strict";
import fs from "node:fs";
import { extractShortVideoObjectPath, shortDownloadFilename } from "../src/server/shortDownload.ts";

const root = new URL("../", import.meta.url);
const read = (path) => fs.readFileSync(new URL(path, root), "utf8");
const migration = read("supabase/migrations/20261125103000_fresh_shorts_creator_download_permission.sql");
const loader = read("src/features/fresh-flow/core/loadFreshFlowShorts.ts");
const type = read("src/features/shorts/types/short.ts");
const service = read("src/features/fresh-flow/core/shortsDownloadService.ts");
const stream = read("src/features/fresh-flow/components/FreshFlowShortsStream.tsx");
const api = read("api/ai/ask.ts");
const handler = read("src/server/shortDownload.ts");

const supabaseUrl = "https://project.supabase.co";
const creator = "11111111-1111-4111-8111-111111111111";
const shortId = "22222222-2222-4222-8222-222222222222";
const url = `${supabaseUrl}/storage/v1/object/public/post-videos/${creator}/short-${shortId}.mp4`;

assert.equal(extractShortVideoObjectPath(url, supabaseUrl, creator), `${creator}/short-${shortId}.mp4`);
assert.equal(extractShortVideoObjectPath(url, supabaseUrl, "33333333-3333-4333-8333-333333333333"), null, "object folder must match the creator");
assert.equal(extractShortVideoObjectPath(url.replace("project.supabase.co", "attacker.example"), supabaseUrl, creator), null, "reject foreign storage hosts");
assert.equal(extractShortVideoObjectPath(url.replace("/object/public/post-videos/", "/object/public/other-bucket/"), supabaseUrl, creator), null, "reject other buckets");
assert.equal(extractShortVideoObjectPath(`${supabaseUrl}/storage/v1/object/public/post-videos/${creator}/%2E%2E/secret.mp4`, supabaseUrl, creator), null, "reject traversal segments");
assert.equal(shortDownloadFilename(shortId), `fresh-short-${shortId}.mp4`);

assert.match(migration, /allow_download boolean not null default false/);
assert.match(migration, /revoke update on table public\.shorts from public, anon, authenticated/i);
assert.match(migration, /grant update \(allow_download\) on public\.shorts to authenticated/i);
assert.match(migration, /for update\s+to authenticated\s+using \(\(select auth\.uid\(\)\) = author_id\)\s+with check \(\(select auth\.uid\(\)\) = author_id\)/i);

assert.match(type, /allowDownload\?: boolean/);
assert.match(loader, /allow_download/);
assert.match(loader, /allowDownload: row\.allow_download === true/);
assert.match(service, /\.eq\("author_id", userId\)/);
assert.match(service, /\.update\(\{ allow_download: allowDownload \}\)/);
assert.match(service, /\/api\/ai\/ask\?__fresh_short_download=1/);
assert.match(stream, /short\.allowDownload \? \(/);
assert.match(stream, /Allow downloads: \{short\.allowDownload \? "On" : "Off"\}/);
assert.match(handler, /authClient\.auth\.getUser\(token\)/);
assert.match(handler, /short\.allow_download !== true/);
assert.match(handler, /extractShortVideoObjectPath/);
assert.match(handler, /createSignedUrl\(objectPath, 60, \{ download:/);
assert.match(handler, /cannot stop a viewer from saving a publicly accessible media URL/);
assert.match(api, /__fresh_short_download/);

console.log("fresh-shorts-download-permission: ok");

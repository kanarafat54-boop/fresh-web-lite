#!/usr/bin/env node
/**
 * Isolated Supabase Storage integration test for the Long Video TUS contract.
 * Run after `supabase start` and `supabase db reset --local --no-seed`.
 */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";

const status = execFileSync("supabase", ["status", "-o", "env"], { encoding: "utf8" });
const values = Object.fromEntries(status.split(/\r?\n/).flatMap((line) => {
  const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
  return match ? [[match[1], match[2].replace(/^"(.*)"$/, "$1")]] : [];
}));
const apiUrl = values.API_URL;
const anonKey = values.ANON_KEY;
assert.ok(apiUrl && anonKey, "supabase status must provide API_URL and ANON_KEY");

async function json(response, label) {
  const text = await response.text();
  let body = {};
  try { body = text ? JSON.parse(text) : {}; } catch { /* include raw response below */ }
  if (!response.ok) throw new Error(`${label} failed (${response.status}): ${text.slice(0, 400)}`);
  return body;
}
const email = `fresh-tus-${randomUUID()}@example.test`;
const password = `TUS-${randomUUID()}-Secure!`;
const signup = await json(await fetch(`${apiUrl}/auth/v1/signup`, {
  method: "POST",
  headers: { apikey: anonKey, "Content-Type": "application/json" },
  body: JSON.stringify({ email, password }),
}), "Create isolated TUS test user");
let session = signup.session ?? signup;
if (!session.access_token) {
  session = await json(await fetch(`${apiUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: anonKey, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  }), "Sign in isolated TUS test user");
}
const user = signup.user ?? signup;
assert.ok(session.access_token && user.id, "test user must have an authenticated session");

const endpoint = new URL("/storage/v1/upload/resumable", apiUrl).toString();
const accessToken = session.access_token;
const encode = (value) => Buffer.from(value).toString("base64");
const metadata = (path) => [
  `bucketName ${encode("post-videos")}`,
  `objectName ${encode(path)}`,
  `contentType ${encode("video/mp4")}`,
  `cacheControl ${encode("3600")}`,
].join(",");
async function create(path, size) {
  return fetch(endpoint, {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`, apikey: anonKey,
      "Tus-Resumable": "1.0.0", "Upload-Length": String(size),
      "Upload-Metadata": metadata(path), "x-upsert": "false",
    },
  });
}
async function offset(url) {
  const response = await fetch(url, { method: "HEAD", headers: {
    authorization: `Bearer ${accessToken}`, apikey: anonKey, "Tus-Resumable": "1.0.0",
  } });
  assert.equal(response.status, 200, "TUS HEAD must return 200");
  return Number(response.headers.get("Upload-Offset"));
}
async function patch(url, start, chunk) {
  return fetch(url, { method: "PATCH", headers: {
    authorization: `Bearer ${accessToken}`, apikey: anonKey,
    "Tus-Resumable": "1.0.0", "Upload-Offset": String(start),
    "Content-Type": "application/offset+octet-stream",
  }, body: chunk });
}

const path = `${user.id}/long-video-tus-${randomUUID()}.mp4`;
const bytes = Buffer.alloc(6 * 1024 * 1024 + 37, 0x5a);
const chunkSize = 6 * 1024 * 1024;
const created = await create(path, bytes.length);
if (created.status !== 201) {
  const detail = await created.text();
  throw new Error(`TUS session creation must return 201; received ${created.status}: ${detail.slice(0, 500)}`);
}
const location = created.headers.get("Location");
assert.ok(location, "TUS session must return a Location header");
const uploadUrl = new URL(location, endpoint).toString();
assert.equal(await offset(uploadUrl), 0, "new TUS upload starts at offset zero");

const first = await patch(uploadUrl, 0, bytes.subarray(0, chunkSize));
assert.equal(first.status, 204, "first 6 MiB TUS chunk must upload");
assert.equal(await offset(uploadUrl), chunkSize, "HEAD must expose the confirmed resume offset");
const second = await patch(uploadUrl, chunkSize, bytes.subarray(chunkSize));
assert.equal(second.status, 204, "final TUS chunk must upload");
assert.equal(Number(second.headers.get("Upload-Offset")), bytes.length, "final TUS offset must equal file size");

const publicUrl = new URL(`/storage/v1/object/public/post-videos/${path}`, apiUrl);
const stored = await fetch(publicUrl);
assert.equal(stored.status, 200, "completed public video object must be readable");
const storedBytes = Buffer.from(await stored.arrayBuffer());
assert.equal(Buffer.compare(storedBytes, bytes), 0, "stored object bytes must match uploaded bytes");

const foreignPath = `${randomUUID()}/not-owned.mp4`;
const deniedCreate = await create(foreignPath, 1);
if (deniedCreate.ok) {
  const deniedLocation = deniedCreate.headers.get("Location");
  assert.ok(deniedLocation, "foreign upload session must return a location before finalization");
  const deniedUrl = new URL(deniedLocation, endpoint).toString();
  const deniedPatch = await patch(deniedUrl, 0, Buffer.from([0x01]));
  if (deniedPatch.ok) {
    const foreignObject = await fetch(new URL(`/storage/v1/object/public/post-videos/${foreignPath}`, apiUrl));
    assert.notEqual(foreignObject.status, 200, "foreign-folder upload must not create a readable object");
  }
} else {
  assert.ok([400, 401, 403].includes(deniedCreate.status), "foreign-folder upload must be rejected");
}
console.log("Long Video TUS integration: PASS (6 MiB chunks, HEAD resume offset, byte integrity, owner-folder RLS)");

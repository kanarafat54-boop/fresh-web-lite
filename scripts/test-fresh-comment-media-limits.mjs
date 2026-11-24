import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const client = read("src/core/interactions/attachmentValidation.ts");
const migrations = fs.readdirSync(new URL("../supabase/migrations/", import.meta.url)).filter((name) => name.includes("comment_media_server_limits"));
assert.equal(migrations.length, 1, "exactly one comment-media server-limits migration");
const sql = read(`supabase/migrations/${migrations[0]}`);

// The bucket limit must equal the largest client limit, so it can never reject a legitimate upload.
const clientMaxMiB = Math.max(...[...client.matchAll(/maxBytes:\s*(\d+)\s*\*\s*1024\s*\*\s*1024/g)].map((match) => Number(match[1])));
const sqlLimit = Number(sql.match(/file_size_limit\s*=\s*(\d+)/)?.[1]);
assert.equal(sqlLimit, clientMaxMiB * 1024 * 1024, `bucket limit must equal the largest client limit (${clientMaxMiB} MiB)`);

// Every explicit type the client accepts must be allowed by the bucket.
const allowed = new Set([...sql.matchAll(/'([a-z]+\/[a-z0-9.+-]+)'/g)].map((match) => match[1]));
for (const [, family, list] of client.matchAll(/\^(image|video|audio)\\\/\(([^)]+)\)\$/g)) {
  for (const subtype of list.split("|")) assert.ok(allowed.has(`${family}/${subtype}`), `bucket must allow ${family}/${subtype}`);
}
// Recorder output (audio/webm, video/webm) and the picker's documents must work.
for (const mime of ["audio/webm", "video/webm", "application/pdf", "text/plain", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]) assert.ok(allowed.has(mime), `bucket must allow ${mime}`);

// Safety: no wildcard types, scoped to this bucket only, rollback documented, never touches RLS or objects.
assert.doesNotMatch(sql, /'[a-z]+\/\*'/, "no wildcard MIME types");
assert.match(sql, /where id = 'comment-media'/);
assert.match(sql, /Rollback/);
assert.doesNotMatch(sql, /\b(drop|delete|alter policy|create policy)\b/i, "does not touch policies or objects");
console.log("Comment media server limits mirror the client rules: PASS");

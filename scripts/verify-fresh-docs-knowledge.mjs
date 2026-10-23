// Regression gate for the docs -> Fresh AI knowledge pipeline. Pure Node, no database, no network.
import fs from "node:fs";
import {
  ALLOWLIST,
  DENYLIST,
  MAX_CHUNK_CHARS,
  buildChunks,
  buildSql,
  collect,
  assertSafe,
} from "./generate-fresh-knowledge-from-docs.mjs";

const fail = (m) => {
  throw new Error(m);
};
const MIGRATION = "supabase/migrations/20261021200000_fresh_ai_platform_docs_knowledge.sql";

// 1) Allowlist is explicit and never overlaps the denylist; every allowlisted doc exists.
for (const f of ALLOWLIST) {
  if (DENYLIST.includes(f)) fail(`${f} is on both ALLOWLIST and DENYLIST`);
  if (!fs.existsSync(`docs/${f}`)) fail(`Allowlisted doc is missing: docs/${f}`);
}
for (const f of ["FRESH_MAIL_BACKEND_SETUP.md", "PHASE_0_ENGINEERING_RUNBOOK.md", "FRESH_IDENTITY_MAIL_PHASE_0_AUDIT.md"])
  if (!DENYLIST.includes(f)) fail(`${f} must stay on the DENYLIST`);

// 2) Real docs produce real, bounded, unique, secret-free chunks.
const chunks = collect();
if (chunks.length < 100) fail(`Expected at least 100 knowledge sections, got ${chunks.length}`);
for (const c of chunks) {
  if (!c.source.startsWith("docs/")) fail(`Chunk without a docs/ source: ${c.title}`);
  if (c.content.length > MAX_CHUNK_CHARS + 400) fail(`Chunk too large: ${c.title}`);
  if (denied(c.source)) fail(`Denied doc leaked into knowledge: ${c.source}`);
}
function denied(source) {
  return DENYLIST.some((d) => source.endsWith(d));
}

// 3) Secret handling: config lines are dropped, secret-shaped values hard-fail.
const probe = buildChunks(
  "PROBE.md",
  "# Probe\n\n## Config\nSet FRESH_AI_IMAGE_ENGINE_URL and FRESH_AI_IMAGE_ENGINE_TOKEN in Vercel.\n" +
    "Fresh AI answers questions about the platform and explains what is live, in progress or planned honestly.\n" +
    "Fresh AI also remembers context that only the signed-in user can read and says so when it does not know.\n",
);
if (!probe.length) fail("Probe doc produced no chunk");
if (/FRESH_AI_IMAGE_ENGINE_(URL|TOKEN)/.test(probe.map((c) => c.content).join("\n"))) fail("Deployment config line was not dropped");
let blocked = false;
try {
  assertSafe([{ title: "t", content: "key sk-abcdefghijklmnopqrstuvwxyz123456", source: "docs/x.md", hash: "h" }]);
} catch {
  blocked = true;
}
if (!blocked) fail("A secret-shaped value did not fail generation");

// 4) The committed migration is exactly what the generator produces now (no stale or hand-edited SQL).
if (!fs.existsSync(MIGRATION)) fail(`Missing migration ${MIGRATION}; run: node scripts/generate-fresh-knowledge-from-docs.mjs ${MIGRATION}`);
const committed = fs.readFileSync(MIGRATION, "utf8");
if (committed !== buildSql(chunks)) fail("Migration is stale. Regenerate: node scripts/generate-fresh-knowledge-from-docs.mjs " + MIGRATION);

// 5) Additive only: the migration never deletes or restructures anything.
const code = committed.replace(/^--.*$/gm, "");
for (const bad of [/\bdelete\s+from\b/i, /\bdrop\s+(table|column|index|function|policy)\b/i, /\btruncate\b/i, /\balter\s+table\b/i, /\bgrant\b/i, /\brevoke\b/i])
  if (bad.test(stripValues(code))) fail(`Migration contains a non-additive statement: ${bad}`);
function stripValues(sql) {
  // Remove the quoted VALUES payload so doc prose cannot trigger a false positive.
  return sql.replace(/'(?:[^']|'')*'/g, "''");
}
if (!/where not exists/i.test(code) || !/update public\.fresh_ai_knowledge/i.test(code)) fail("Migration lost its idempotent upsert shape");

// 6) Both answer endpoints use the shared ranked retrieval, not a private row scan.
for (const f of ["api/ai/ask.ts", "api/ai/stream.ts"])
  if (!fs.readFileSync(f, "utf8").includes("retrieveFreshPlatformKnowledge")) fail(`${f} does not use the shared ranked retrieval`);

console.log(`Fresh docs knowledge pipeline: PASS (${chunks.length} sections from ${ALLOWLIST.length} docs)`);

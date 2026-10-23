// Generates an idempotent SQL migration that teaches Fresh AI the product-facing docs in docs/.
// No outside AI involved. Re-run whenever the docs change; existing rows are UPDATED, never deleted.
//
//   node scripts/generate-fresh-knowledge-from-docs.mjs [out.sql]
//
// Safety model: knowledge rows (user_id null) can be shown to every user, so only the explicit
// ALLOWLIST below is ingested. Operational docs (mail backend setup, engineering runbooks, audits,
// threat models) are never ingested. Lines that look like secrets or deployment config are dropped,
// and generation FAILS if a secret-shaped value survives.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

export const KB_PROJECT = "fresh-web-lite-platform";
export const DATASET = "platform-docs-v1";
export const MAX_CHUNK_CHARS = 1100;
export const MIN_CHUNK_CHARS = 120;

// Product-facing docs only. Adding a doc here is an owner decision.
export const ALLOWLIST = [
  "FRESH_AI_CAPABILITY_PRODUCT_CONTRACT.md",
  "FRESH_AI_COMPLETION.md",
  "FRESH_AI_INDEPENDENCE_ROADMAP.md",
  "FRESH_AI_LEARNING_LOOP.md",
  "FRESH_AI_READINESS_AUDIT.md",
  "FRESH_AI_RUNTIME_ROADMAP.md",
  "FRESH_AI_SOVEREIGN_INTELLIGENCE.md",
  "FRESH_AI_SOVEREIGN_ROADMAP.md",
  "FRESH_AI_UNIVERSAL_POWER_FABRIC.md",
  "FRESH_BEYOND_SUPERINTELLIGENCE.md",
  "FRESH_COMMUNICATION_UNIFIED_ARCHITECTURE.md",
  "FRESH_DESIGN_SYSTEM_POINT_ZERO.md",
  "FRESH_FLOW_MEDIA_ARCHITECTURE.md",
  "FRESH_INTERNATIONAL_KNOWLEDGE_GRAPH_V1.md",
  "FRESH_PLATFORM_POWERS_AND_USER_FLOW.md",
  "FRESH_PLATFORM_RUNTIME_EXPANSION.md",
  "FRESH_POWERS_MISSIONS_MAP.md",
  "FRESH_RUNTIME_CAPABILITY_MATRIX.md",
  "FRESH_WEB_LITE_FINAL_MASTER_ROADMAP.md",
  "FRESH_WEB_LITE_FINAL_MASTER_SPEC.md",
  "FRESH_WEB_LITE_PLATFORM_ARCHITECTURE_GOVERNANCE.md",
  "FRESH_WEB_LITE_UNIVERSAL_PLATFORM_DOCTRINE.md",
  "SHORTS_FINAL_SPEC.md",
  "TRUEMODE.md",
];

// Explicitly never ingested, even if someone adds them to the allowlist by mistake.
export const DENYLIST = [
  "FRESH_MAIL_BACKEND_SETUP.md",
  "FRESH_IDENTITY_MAIL_PHASE_0_AUDIT.md",
  "PHASE_0_ENGINEERING_RUNBOOK.md",
  "ENGINEERING_OPERATIONS_EXECUTION_PLAN.md",
  "FRESH_AI_NATIVE_INFERENCE_RUNNER.md",
  "FRESH_WEB_LITE_PLATFORM_CONTROL_SAFETY_OPERATIONS.md",
  "FRESH_AI_E2EE_STRATEGY.md",
  "FRESH_RUNTIME_INFRASTRUCTURE.md",
];

// Lines naming deployment configuration are dropped (names of env vars, hosts, keys).
const CONFIG_LINE = /\b[A-Z][A-Z0-9_]{5,}_(URL|TOKEN|KEY|SECRET|PASSWORD)\b|service_role|\.supabase\.co|\.vercel\.app|bearer\s+\S+/i;
// A surviving value of this shape fails generation outright.
const SECRET_VALUE = [
  /eyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{10,}/, // JWT
  /\bsk-[A-Za-z0-9_-]{16,}/, // API key
  /\bgh[pousr]_[A-Za-z0-9]{20,}/, // GitHub token
  /\bAKIA[0-9A-Z]{16}\b/, // AWS key id
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /\b(?:postgres(?:ql)?|mysql|mongodb):\/\/[^\s]+:[^\s@]+@/i, // connection string with password
];

export const q = (v) => "'" + String(v ?? "").replace(/'/g, "''") + "'";

const stripMarkdown = (s) =>
  s
    .replace(/```[\s\S]*?```/g, " ") // code blocks are not knowledge
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, "$1")
    .replace(/^\s*>\s?/gm, "")
    .replace(/^\s*[-*]\s+/gm, "- ")
    .replace(/^\|?\s*[-:| ]{3,}\|?\s*$/gm, "") // table separator rows
    .replace(/\|/g, " · ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{2,}/g, "\n")
    .trim();

export function cleanSection(raw) {
  const kept = raw.split("\n").filter((line) => !CONFIG_LINE.test(line));
  return stripMarkdown(kept.join("\n"));
}

function splitSections(markdown) {
  const sections = [];
  let heading = "Overview";
  let buf = [];
  const flush = () => {
    if (buf.join("").trim()) sections.push({ heading, body: buf.join("\n") });
    buf = [];
  };
  let inFence = false;
  for (const line of markdown.split("\n")) {
    if (/^```/.test(line)) inFence = !inFence;
    const h = !inFence && line.match(/^(#{1,3})\s+(.*)$/);
    if (h) {
      flush();
      heading = h[2].replace(/[`*_]/g, "").trim() || "Overview";
    } else buf.push(line);
  }
  flush();
  return sections;
}

function packParagraphs(text) {
  const out = [];
  let cur = "";
  for (const para of text.split("\n")) {
    if (!para.trim()) continue;
    const pieces = para.length > MAX_CHUNK_CHARS ? para.match(new RegExp(`.{1,${MAX_CHUNK_CHARS}}(\\s|$)`, "g")) || [para] : [para];
    for (const piece of pieces) {
      if (cur && (cur + "\n" + piece).length > MAX_CHUNK_CHARS) {
        out.push(cur);
        cur = piece;
      } else cur = cur ? cur + "\n" + piece : piece;
    }
  }
  if (cur) out.push(cur);
  return out.map((c) => c.trim()).filter(Boolean);
}

/** Pure: markdown text + file name -> knowledge chunks. */
export function buildChunks(fileName, markdown) {
  const stem = fileName.replace(/\.md$/i, "");
  const docTitle = (markdown.match(/^#\s+(.+)$/m)?.[1] || stem).replace(/[`*_]/g, "").trim();
  const chunks = [];
  for (const section of splitSections(markdown)) {
    const text = cleanSection(section.body);
    if (text.length < MIN_CHUNK_CHARS) continue;
    const parts = packParagraphs(text);
    parts.forEach((part, i) => {
      const suffix = parts.length > 1 ? ` (part ${i + 1}/${parts.length})` : "";
      const title = `Doc: ${stem} — ${section.heading}${suffix}`.slice(0, 200);
      const content = `Per docs/${fileName} (${docTitle}), section "${section.heading}": ${part}`;
      chunks.push({
        title,
        content,
        source: `docs/${fileName}`,
        hash: crypto.createHash("sha256").update(content).digest("hex").slice(0, 16),
      });
    });
  }
  return chunks;
}

export function assertSafe(chunks) {
  const titles = new Set();
  for (const c of chunks) {
    for (const re of SECRET_VALUE) if (re.test(c.title + "\n" + c.content)) throw new Error(`Secret-shaped value in ${c.source} :: ${c.title}`);
    if (titles.has(c.title)) throw new Error(`Duplicate knowledge title: ${c.title}`);
    titles.add(c.title);
    if (c.content.length > MAX_CHUNK_CHARS + 400) throw new Error(`Chunk too large in ${c.source} :: ${c.title}`);
  }
}

export function buildSql(chunks) {
  const rows = chunks
    .map((c) => ` (${q(c.title)},${q(c.content)},${q(c.source)},${q(c.hash)})`)
    .join(",\n");
  return `-- Generated by scripts/generate-fresh-knowledge-from-docs.mjs. Do not edit by hand; re-run the script.
-- Teaches Fresh AI the product-facing docs (${chunks.length} sections). No outside AI involved.
-- Idempotent: existing rows are UPDATED when the source text changed. Nothing is ever deleted.
-- Only allowlisted docs are included; see ALLOWLIST/DENYLIST in the generator.
with d(title, content, source, hash) as (values
${rows}
), upd as (
  update public.fresh_ai_knowledge k
  set content = d.content,
      source = d.source,
      metadata = coalesce(k.metadata, '{}'::jsonb) || jsonb_build_object('dataset', '${DATASET}', 'content_hash', d.hash),
      updated_at = now()
  from d
  where k.project_id = '${KB_PROJECT}' and k.user_id is null and k.title = d.title
    and coalesce(k.metadata->>'content_hash', '') <> d.hash
  returning 1
)
insert into public.fresh_ai_knowledge (user_id, project_id, title, content, modality, source, provenance, truth_state, confidence, metadata)
select null, '${KB_PROJECT}', d.title, d.content, 'text', d.source,
       jsonb_build_object('kind', 'first-party', 'generator', 'generate-fresh-knowledge-from-docs'),
       'PROBABLE', 0.75, jsonb_build_object('dataset', '${DATASET}', 'content_hash', d.hash)
from d
where not exists (
  select 1 from public.fresh_ai_knowledge k
  where k.project_id = '${KB_PROJECT}' and k.user_id is null and k.title = d.title
);

notify pgrst, 'reload schema';
`;
}

export function collect(docsDir = "docs") {
  const chunks = [];
  for (const file of ALLOWLIST) {
    if (DENYLIST.includes(file)) throw new Error(`${file} is on both ALLOWLIST and DENYLIST`);
    const p = path.join(docsDir, file);
    if (!fs.existsSync(p)) throw new Error(`Allowlisted doc is missing: ${p}`);
    chunks.push(...buildChunks(file, fs.readFileSync(p, "utf8")));
  }
  assertSafe(chunks);
  return chunks;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const outPath = process.argv[2];
  const chunks = collect();
  const sql = buildSql(chunks);
  if (outPath) {
    fs.writeFileSync(outPath, sql);
    console.log(`Wrote ${outPath}: ${chunks.length} sections from ${ALLOWLIST.length} docs`);
  } else process.stdout.write(sql);
}

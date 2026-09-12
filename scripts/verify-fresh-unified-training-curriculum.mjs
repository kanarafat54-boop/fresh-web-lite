import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";

const curriculum = readFileSync("src/core/fresh-ai/FreshUnifiedTrainingCurriculum.ts", "utf8");
const corpusPath = "data/fresh-training/synthetic-starter-v1.jsonl";
const rows = readFileSync(corpusPath, "utf8").trim().split(/\r?\n/).map((line) => JSON.parse(line));

if (!curriculum.includes('modelId: FRESH_UNIFIED_MODEL.id')) throw new Error("Curriculum model binding missing");
if (!curriculum.includes('status: "starter-curriculum"')) throw new Error("Curriculum status missing");
if (rows.length < 10) throw new Error(`Starter corpus too small: ${rows.length}`);

const domainSection = curriculum.match(/domains:\s*\[(.*?)\],\s*stages:/s)?.[1] ?? "";
const declaredDomains = new Set([...domainSection.matchAll(/id:\s*"([^"]+)"/g)].map((match) => match[1]));
if (declaredDomains.size < 10) throw new Error(`Curriculum domain declaration too small: ${declaredDomains.size}`);

const ids = new Set();
const domains = new Set();
for (const row of rows) {
  if (!row.id || ids.has(row.id)) throw new Error(`Invalid or duplicate example: ${row.id}`);
  if (!row.input?.trim() || !row.target?.trim()) throw new Error(`Empty training example: ${row.id}`);
  if (row.metadata?.sourceType !== "synthetic-starter") throw new Error(`Unexpected source type: ${row.id}`);
  if (!row.metadata?.domain) throw new Error(`Missing domain: ${row.id}`);
  ids.add(row.id);
  domains.add(row.metadata.domain);
}

const missingDomains = [...declaredDomains].filter((domain) => !domains.has(domain));
if (missingDomains.length) throw new Error(`Starter corpus is missing curriculum domains: ${missingDomains.join(", ")}`);
const undeclaredDomains = [...domains].filter((domain) => !declaredDomains.has(domain));
if (undeclaredDomains.length) throw new Error(`Starter corpus contains undeclared curriculum domains: ${undeclaredDomains.join(", ")}`);

const canonical = rows.map((row) => JSON.stringify(row)).join("\n");
const sha256 = createHash("sha256").update(canonical).digest("hex");
console.log(`Fresh curriculum: PASS (${domains.size} domains, ${rows.length} starter examples)`);
console.log(`Starter corpus sha256: ${sha256}`);
console.log("Training status: NOT TRAINED — corpus is synthetic starter data only.");

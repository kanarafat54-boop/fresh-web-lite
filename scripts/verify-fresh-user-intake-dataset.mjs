import fs from "node:fs";

const path = "data/fresh-training/user-intake-curated-v1.jsonl";
const lines = fs.readFileSync(path, "utf8").split(/\r?\n/).filter((line) => line.trim());
const seen = new Set();
const domains = new Set();
const forbidden = [
  [/thought_process|thought_chain|chainOfThought/i, "hidden reasoning trace field"],
  [/super-secret-key|JWT_SECRET\s*\|\|/i, "hardcoded/fallback secret pattern"],
  [/execute_terminal|system control|execution privileges/i, "unbounded tool privilege claim"],
  [/image_path|image_ref|<image>/i, "unresolved image placeholder"],
];
for (let i = 0; i < lines.length; i += 1) {
  let row;
  try { row = JSON.parse(lines[i]); } catch { throw new Error(`line ${i + 1}: invalid JSON`); }
  if (!row.id || !row.input?.trim() || !row.target?.trim() || !row.metadata) {
    throw new Error(`line ${i + 1}: id, input, target and metadata are required`);
  }
  if (seen.has(row.id)) throw new Error(`duplicate id: ${row.id}`);
  seen.add(row.id);
  const m = row.metadata;
  for (const key of ["domain", "sourceType", "license", "authorizationId"]) {
    if (!m[key]) throw new Error(`line ${i + 1}: missing metadata.${key}`);
  }
  if (m.sourceType !== "internal-synthetic" || m.license !== "internal-synthetic" ||
      m.authorizationId !== "fwl-internal-synthetic-v1") {
    throw new Error(`line ${i + 1}: unapproved provenance marker`);
  }
  if (m.reviewStatus !== "curated-v1") throw new Error(`line ${i + 1}: missing curation status`);
  for (const [pattern, label] of forbidden) {
    if (pattern.test(JSON.stringify(row))) throw new Error(`line ${i + 1}: contains ${label}`);
  }
  domains.add(m.domain);
}
if (lines.length < 30) throw new Error(`expected at least 30 examples, got ${lines.length}`);
for (const domain of ["software-engineering", "agentic-tool-use", "system-architecture", "ui-ux-accessibility", "privacy-governance", "model-training", "knowledge-research"]) {
  if (!domains.has(domain)) throw new Error(`missing required domain: ${domain}`);
}
console.log(`Fresh AI curated user-intake dataset: PASS (${lines.length} examples, ${domains.size} domains)`);
console.log("Provenance, uniqueness, schema, and unsafe-pattern checks: PASS");
console.log("Training weights created: no");

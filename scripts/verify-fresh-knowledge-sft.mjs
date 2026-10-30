import fs from "node:fs";
import { build, TRAIN_TEMPLATES, EVAL_TEMPLATES, TRAIN_OUT, EVAL_OUT, AUTH_ID } from "./generate-fresh-knowledge-sft.mjs";

const fail = (m) => { throw new Error(m); };
const a = build(), b = build();
if (JSON.stringify(a) !== JSON.stringify(b)) fail("generation is not deterministic");
const { train, evalSet } = a;
if (train.length < 600 || evalSet.length < 200) fail(`too few rows: train=${train.length} eval=${evalSet.length}`);
if (TRAIN_TEMPLATES.some((t) => EVAL_TEMPLATES.includes(t))) fail("train and eval templates overlap");
const trainInputs = new Set(train.map((r) => r.input));
if (evalSet.some((r) => trainInputs.has(r.input))) fail("an eval question also appears in training");
for (const rows of [train, evalSet]) if (new Set(rows.map((r) => r.id)).size !== rows.length) fail("duplicate ids");
for (const r of train) {
  if (r.metadata.authorizationId !== AUTH_ID) fail("wrong authorization id");
  if (!r.target.startsWith("Per docs/")) fail("answer must keep its docs citation");
  if (/\b[A-Z][A-Z0-9_]{5,}_(URL|TOKEN|KEY|SECRET|PASSWORD)\b|eyJ[A-Za-z0-9_-]{15,}|\bsk-[A-Za-z0-9_-]{16,}/.test(r.target)) fail("secret-shaped text in training data");
}
for (const r of evalSet) if (r.keywords.length < 3 || r.keywords.length > 8) fail("bad keyword count");
const onDisk = (p) => (fs.existsSync(p) ? fs.readFileSync(p, "utf8") : fail(`${p} missing: run node scripts/generate-fresh-knowledge-sft.mjs`));
const expectTrain = train.map((r) => JSON.stringify(r)).join("\n") + "\n";
const expectEval = evalSet.map((r) => JSON.stringify(r)).join("\n") + "\n";
if (onDisk(TRAIN_OUT) !== expectTrain || onDisk(EVAL_OUT) !== expectEval) fail("committed data is stale: re-run node scripts/generate-fresh-knowledge-sft.mjs");
console.log(`Fresh knowledge SFT data: PASS (${train.length} train rows, ${evalSet.length} held-out recall questions, deterministic, disjoint phrasings)`);

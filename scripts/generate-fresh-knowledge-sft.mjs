// Builds Fresh-knowledge fine-tune data and a held-out recall evaluation set from the allowlisted
// product docs. No outside AI is used: questions come from fixed templates and answers are the
// docs' own text (with its "Per docs/<file>" citation), so provenance is Fresh's own documents.
//
//   node scripts/generate-fresh-knowledge-sft.mjs
//
// Train phrasings and eval phrasings are disjoint, so the eval measures whether the model absorbed the
// FACT, not whether it memorised one question wording. Scoring is keyword recall (see training/fresh_eval.py).
import fs from "node:fs";
import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { collect } from "./generate-fresh-knowledge-from-docs.mjs";

export const AUTH_ID = "fwl-internal-docs-qa-v1";
export const SYSTEM = "You are Fresh AI. Be accurate, safe, and explicit about uncertainty.";
export const TRAIN_OUT = "data/fresh-training/fresh-docs-qa-v1.jsonl";
export const EVAL_OUT = "data/fresh-eval/fresh-knowledge-recall-v1.jsonl";

// {h} = section heading, {d} = doc title, {p} = part note. Train and eval lists must never overlap.
export const TRAIN_TEMPLATES = [
  "According to {d}, what does the section \"{h}\"{p} say?",
  "Tell me about \"{h}\"{p} in Fresh ({d}).",
  "What does Fresh say about \"{h}\"{p}?",
  "Summarize \"{h}\"{p} from the Fresh documentation ({d}).",
  "Explain the \"{h}\"{p} section of {d}.",
  "I'm reading {d}. What is \"{h}\"{p} about?",
];
export const EVAL_TEMPLATES = [
  "In the Fresh docs, what is stated under \"{h}\"{p} of {d}?",
  "Give me the key points of \"{h}\"{p} for Fresh Web Lite ({d}).",
];

const STOP = new Set("about after again against because before being between could doing during each every first fresh from have having into more most other should since still such than that their them then there these they this those through under until very were what when where which while with would your docs section".split(" "));

const sha = (s, n = 16) => crypto.createHash("sha256").update(s).digest("hex").slice(0, n);
const fill = (t, v) => t.replace("{h}", v.h).replace("{d}", v.d).replace("{p}", v.p);

function parseTitle(title) {
  // "Doc: STEM — Heading (part i/n)"
  const m = title.match(/^Doc: (.+?) — (.*?)(?: \(part (\d+)\/(\d+)\))?$/);
  return { stem: m[1], heading: m[2], part: m[3] ? `${m[3]}/${m[4]}` : "" };
}
function docTitleOf(content) {
  return content.match(/^Per docs\/\S+ \((.+?)\), section "/)?.[1] ?? "";
}
function answerBody(content) {
  return content.replace(/^Per docs\/\S+ \(.+?\), section ".*?": /s, "");
}
export function keywordsFor(body, idf) {
  const tf = new Map();
  for (const w of body.toLowerCase().match(/[a-z][a-z-]{5,}/g) || []) if (!STOP.has(w)) tf.set(w, (tf.get(w) || 0) + 1);
  return [...tf.entries()].map(([w, c]) => [w, c * (idf.get(w) || 1)]).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)).slice(0, 8).map(([w]) => w);
}

export function build(chunks = collect()) {
  const items = chunks.map((c) => {
    const t = parseTitle(c.title);
    return { c, h: t.heading, part: t.part, d: docTitleOf(c.content) || t.stem, body: answerBody(c.content) };
  });
  const df = new Map();
  for (const it of items) for (const w of new Set(it.body.toLowerCase().match(/[a-z][a-z-]{5,}/g) || [])) df.set(w, (df.get(w) || 0) + 1);
  const idf = new Map([...df].map(([w, n]) => [w, Math.log(1 + items.length / n)]));
  const train = [], evalSet = [];
  for (const it of items) {
    const vars = { h: it.h, d: it.d, p: it.part ? ` (part ${it.part})` : "" };
    for (const [i, tpl] of TRAIN_TEMPLATES.entries()) {
      const input = fill(tpl, vars);
      train.push({
        id: `fresh-docs-qa-${sha(input + it.c.hash)}`, input, target: it.c.content,
        metadata: { authorizationId: AUTH_ID, sourceType: "internal-synthetic", license: "internal-synthetic", system: SYSTEM, source: it.c.source, template: i, kind: "fresh-docs-qa" },
      });
    }
    const keywords = keywordsFor(it.body, idf);
    if (keywords.length < 3) continue;
    EVAL_TEMPLATES.forEach((tpl, i) => {
      const input = fill(tpl, vars);
      evalSet.push({ id: `fresh-recall-${sha(input + it.c.hash)}`, input, reference: it.c.content, keywords, source: it.c.source, template: i });
    });
  }
  return { train, evalSet };
}

const toJsonl = (rows) => rows.map((r) => JSON.stringify(r)).join("\n") + "\n";

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { train, evalSet } = build();
  fs.mkdirSync(path.dirname(EVAL_OUT), { recursive: true });
  fs.writeFileSync(TRAIN_OUT, toJsonl(train));
  fs.writeFileSync(EVAL_OUT, toJsonl(evalSet));
  console.log(`Wrote ${TRAIN_OUT}: ${train.length} training rows`);
  console.log(`Wrote ${EVAL_OUT}: ${evalSet.length} held-out recall questions`);
}

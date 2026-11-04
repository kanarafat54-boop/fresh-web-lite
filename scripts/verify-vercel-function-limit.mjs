#!/usr/bin/env node
/**
 * Vercel Hobby allows at most 12 serverless functions per deployment. Every file under
 * /api (outside _-prefixed helpers and .d.ts) becomes one. Exceeding the cap makes the
 * whole deployment fail at the "patchBuild" step even though the build itself succeeds.
 */
import fs from "node:fs";
import path from "node:path";

const LIMIT = 12;
const files = [];
(function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.name.startsWith("_")) continue;
    if (entry.isDirectory()) walk(full);
    else if (/\.(ts|tsx|js|mjs|cjs)$/.test(entry.name) && !entry.name.endsWith(".d.ts") && !/\.(test|spec)\./.test(entry.name)) files.push(full);
  }
})("api");
if (files.length > LIMIT) {
  console.error(`Vercel function limit exceeded: ${files.length} functions under /api (max ${LIMIT}):\n${files.map((f) => `  ${f}`).join("\n")}\nServe new endpoints through an existing function (see vercel.json routes) or move helpers out of /api.`);
  process.exit(1);
}
console.log(`Vercel function limit OK: ${files.length}/${LIMIT} functions.`);

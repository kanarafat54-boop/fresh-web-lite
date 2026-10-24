// Test-only ESM resolver hook: lets Node's native TypeScript stripping load repo sources that import
// "./x.js" (the repo's tsc/Vite convention) when only "./x.ts" exists. No dependencies.
import { register } from "node:module";
register("data:text/javascript," + encodeURIComponent(`
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
export async function resolve(specifier, context, next) {
  if (/^\\.{1,2}\\//.test(specifier) && specifier.endsWith(".js") && context.parentURL) {
    const ts = new URL(specifier.replace(/\\.js$/, ".ts"), context.parentURL);
    if (ts.protocol === "file:" && existsSync(fileURLToPath(ts))) return next(ts.href, context);
  }
  return next(specifier, context);
}`), import.meta.url);

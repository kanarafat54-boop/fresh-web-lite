// Crawl a list of permitted URLs with the polite crawler and write them to the live Fresh web index.
// Usage (needs the new migrations applied and server credentials in the environment):
//   SUPABASE_URL=... SUPABASE_SECRET_KEY=... node --import ./scripts/register-ts-js-resolver.mjs \
//     scripts/seed-fresh-web-index.mjs data/fresh-web-seed-urls.txt [--dry-run]
// Only list URLs you are permitted to crawl: robots.txt is honoured and a descriptive User-Agent is sent,
// but source terms and copyright remain the operator's responsibility.
import { readFileSync } from "node:fs";
import { PoliteCrawler } from "../src/server/search/crawler.ts";
import { HtmlContentParser } from "../src/server/search/parser.ts";
import { ingestUrl } from "../src/server/search/pipeline.ts";
import { SupabaseIndexWriter } from "../src/server/search/supabaseAdapters.ts";

const [file, ...flags] = process.argv.slice(2);
if (!file) { console.error("Usage: seed-fresh-web-index.mjs <urls.txt> [--dry-run]"); process.exit(64); }
const dryRun = flags.includes("--dry-run");
const urls = readFileSync(file, "utf8").split(/\r?\n/).map((l) => l.replace(/#.*/, "").trim()).filter(Boolean);
const key = process.env.SUPABASE_SECRET_KEY_FRESHWEBLITE || process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!dryRun && (!process.env.SUPABASE_URL || !key)) { console.error("Missing SUPABASE_URL and a server secret key (never commit these)."); process.exit(78); }

const writer = dryRun
  ? { upsert: async (doc) => ({ documentId: "dry-run", version: 0, canonicalUrl: doc.canonicalUrl, contentHash: doc.contentHash, fetchedAt: "", status: "indexed" }), markRemoved: async () => false }
  : new SupabaseIndexWriter((await import("@supabase/supabase-js")).createClient(process.env.SUPABASE_URL, key, { auth: { persistSession: false, autoRefreshToken: false } }));
const crawler = new PoliteCrawler({ userAgent: process.env.FRESH_CRAWLER_UA || "FreshWebLiteBot/0.1 (+https://fresh-web-lite.vercel.app)", minDelayMs: 1500 });
const parser = new HtmlContentParser();
const tally = {};
for (const url of urls) {
  const r = await ingestUrl(url, { crawler, parser, writer });
  tally[r.outcome] = (tally[r.outcome] ?? 0) + 1;
  console.log(`${r.outcome.padEnd(26)} ${url}${r.error ? `  (${r.error.message})` : ""}`);
}
console.log(JSON.stringify({ dryRun, total: urls.length, ...tally }));
process.exit(tally.indexed || tally.unchanged ? 0 : 1);

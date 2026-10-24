// Real-browser test of the Fresh Web Search screen (Chromium via Playwright).
// The page bundles the real FreshWebSearchView + client; the backend is the real request handler
// (handleSearchRequest) over an index built by the real crawler from a local fixture. Auth and the
// evidence store are test doubles. Needs: playwright (with Chromium) and esbuild resolvable;
// set FRESH_TEST_NODE_PATHS (colon-separated) to extra node_modules dirs if they are not installed locally.
import assert from "node:assert/strict";
import http from "node:http";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const extra = (process.env.FRESH_TEST_NODE_PATHS ?? "/opt/npm-tools/node_modules").split(":").filter(Boolean);
const req = createRequire(import.meta.url);
const load = (name) => { for (const p of [undefined, ...extra]) { try { return req(p ? path.join(p, name) : name); } catch { /* try next */ } } throw new Error(`Cannot resolve ${name}; set FRESH_TEST_NODE_PATHS`); };
const esbuild = load("esbuild");
const { chromium } = load("playwright");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const { PoliteCrawler } = await import("../src/server/search/crawler.ts");
const { HtmlContentParser } = await import("../src/server/search/parser.ts");
const { InMemorySearchIndex } = await import("../src/server/search/memoryIndex.ts");
const { ingestUrl } = await import("../src/server/search/pipeline.ts");
const { handleSearchRequest } = await import("../src/server/search/service.ts");

// ---- fixture site, crawled by the real crawler
const pages = {
  "/robots.txt": ["text/plain", ""],
  "/reef": ["text/html", `<!doctype html><html lang="en"><head><title>Reef bleaching survey</title><meta property="article:published_time" content="2024-05-01T00:00:00Z"></head><body><p>Coral bleaching is driven by rising ocean temperatures across surveyed reef sites worldwide.</p></body></html>`],
  "/tides": ["text/html", `<!doctype html><html lang="en"><head><title>Tides explained</title></head><body><p>Ocean tides are caused by the gravitational pull of the moon on seawater.</p></body></html>`],
};
const fixture = http.createServer((q, s) => { const p = pages[q.url]; if (!p) { s.writeHead(404); return s.end(); } s.writeHead(200, { "content-type": p[0] }); s.end(p[1]); });
await new Promise((r) => fixture.listen(0, "127.0.0.1", r));
const fixtureBase = `http://127.0.0.1:${fixture.address().port}`;
const index = new InMemorySearchIndex();
const crawler = new PoliteCrawler({ userAgent: "FreshBot-test/1.0", minDelayMs: 0, allowPrivateHosts: true });
for (const p of ["/reef", "/tides"]) assert.equal((await ingestUrl(fixtureBase + p, { crawler, parser: new HtmlContentParser(), writer: index })).outcome, "indexed");

// ---- page bundle
const harness = `
import { createRoot } from "react-dom/client";
import FreshWebSearchView from "${root}/src/features/web-search/FreshWebSearchView.tsx";
import { searchFreshWeb } from "${root}/src/features/web-search/webSearchClient.ts";
const signedIn = new URLSearchParams(location.search).get("signedin") === "1";
const search = (q, signal) => searchFreshWeb(q, { signal, getToken: async () => "good" });
createRoot(document.getElementById("root")).render(<FreshWebSearchView signedIn={signedIn} search={search} />);`;
const bundle = await esbuild.build({
  stdin: { contents: harness, resolveDir: root, loader: "tsx", sourcefile: "harness.tsx" },
  bundle: true, write: false, format: "iife", jsx: "automatic", nodePaths: extra, loader: { ".css": "css" }, outdir: "out", logLevel: "silent",
});
const js = bundle.outputFiles.find((f) => f.path.endsWith(".js")).text;
const css = bundle.outputFiles.find((f) => f.path.endsWith(".css"))?.text ?? "";
assert.ok(css.includes(".fws"), "component CSS is bundled");

// ---- app server: real handler + switchable failure modes
let mode = "ok"; let persisted = [];
const store = { persist: async (_u, b) => { if (mode === "persist-fail") throw new Error("db down"); persisted.push(...b.items); return { sources: new Set(b.items.map((i) => i.sourceUrl)).size, evidence: b.items.length }; } };
const app = http.createServer(async (rq, rs) => {
  const url = new URL(rq.url, "http://x");
  if (url.pathname === "/") { rs.writeHead(200, { "content-type": "text/html" }); return rs.end(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>body{margin:0;background:#0d0d14;font-family:system-ui}${css}</style></head><body><div id="root"></div><script>${js}</script></body></html>`); }
  if (url.pathname === "/mode") { mode = url.searchParams.get("m"); persisted = []; rs.writeHead(204); return rs.end(); }
  if (url.pathname === "/persisted") { rs.writeHead(200, { "content-type": "application/json" }); return rs.end(JSON.stringify(persisted.length)); }
  if (url.pathname === "/api/search/query") {
    if (mode === "malformed") { rs.writeHead(200, { "content-type": "application/json" }); return rs.end(JSON.stringify({ hello: "world" })); }
    if (mode === "not-json") { rs.writeHead(200, { "content-type": "text/html" }); return rs.end("<html>oops</html>"); }
    const chunks = []; for await (const c of rq) chunks.push(c);
    const request = new Request("http://x/api/search/query", { method: rq.method, headers: rq.headers, body: Buffer.concat(chunks) });
    const provider = mode === "down" ? { id: "down", search: async () => { throw new Error("backend down"); } } : index;
    const response = await handleSearchRequest(request, { authenticate: async (r) => (r.headers.get("authorization") === "Bearer good" ? { id: "u1" } : null), provider, store });
    rs.writeHead(response.status, Object.fromEntries(response.headers)); return rs.end(await response.text());
  }
  rs.writeHead(404); rs.end();
});
await new Promise((r) => app.listen(0, "127.0.0.1", r));
const appBase = `http://127.0.0.1:${app.address().port}`;

const browser = await chromium.launch();
let checks = 0; const ok = (c, m) => { assert.ok(c, m); checks++; };
const setMode = (m) => fetch(`${appBase}/mode?m=${m}`);
async function search(page, q) { await page.fill("#fws-query", q); await page.click("button[type=submit]"); }
try {
  const ctx = await browser.newContext({ viewport: { width: 1024, height: 800 } });
  const page = await ctx.newPage();
  const errors = []; page.on("pageerror", (e) => errors.push(e.message)); page.on("console", (m) => m.type() === "error" && !/Failed to load resource/.test(m.text()) && errors.push(m.text())); // deliberate 4xx/5xx scenarios log resource errors

  // signed out
  await page.goto(appBase + "/?signedin=0");
  ok(await page.getByText("Sign in to search the Fresh index.").first().isVisible() && (await page.locator("#fws-query").count()) === 0, "signed-out users see a sign-in prompt and no search box");

  // success
  await page.goto(appBase + "/?signedin=1");
  ok((await page.getByLabel("Search the Fresh index").count()) === 1, "search input has an accessible label");
  await search(page, "coral bleaching ocean temperatures");
  await page.waitForSelector("[data-testid=fws-results]");
  const first = page.locator(".fws-item").first();
  ok((await first.locator("h2 a").innerText()) === "Reef bleaching survey", "top result is the relevant crawled page");
  ok((await first.locator("h2 a").getAttribute("href")) === `${fixtureBase}/reef` && (await first.locator("h2 a").getAttribute("rel")) === "noopener noreferrer", "result links to the real source safely");
  ok((await first.innerText()).includes("Published 2024-05-01") && (await first.innerText()).includes("Retrieved "), "publication and retrieval dates shown");
  ok((await first.locator("blockquote").first().innerText()).includes("Coral bleaching is driven by rising ocean temperatures"), "exact source passage shown");
  ok((await page.getByTestId("fws-persistence").innerText()).includes("Saved") && (await (await fetch(`${appBase}/persisted`)).json()) >= 1, "evidence persistence reported and performed");
  ok((await page.getByTestId("fws-persistence").innerText()).includes("not verified facts"), "retrieved text is not presented as verified");

  // empty
  await search(page, "quantum chromodynamics lattice");
  await page.waitForFunction(() => document.querySelector(".fws-summary")?.textContent?.includes("No results"));
  ok((await page.locator(".fws-item").count()) === 0 && (await page.locator(".fws-warnings").innerText()).includes("No indexed source matched"), "empty results are explained, not hidden");

  // source failure
  await setMode("down"); await search(page, "coral bleaching");
  await page.waitForSelector("[role=alert]");
  const alert = await page.locator("[role=alert]").innerText();
  ok(alert.includes("provider_failed") && !alert.includes("backend down"), "source failure shown as an alert without internals");

  // malformed responses
  await setMode("malformed"); await search(page, "coral bleaching");
  await page.waitForFunction(() => document.querySelector("[role=alert]")?.textContent?.includes("malformed_response"));
  ok(true, "malformed JSON payload rejected"); checks++;
  await setMode("not-json"); await search(page, "coral bleaching ocean");
  await page.waitForFunction(() => document.querySelector("[role=alert]")?.textContent?.includes("unreadable"));
  ok((await page.locator(".fws-item").count()) === 0, "non-JSON response rejected, nothing rendered");

  // persistence failure
  await setMode("persist-fail"); await search(page, "coral bleaching ocean temperatures");
  await page.waitForSelector("[data-testid=fws-results]");
  ok((await page.locator(".fws-item").count()) >= 1 && (await page.getByTestId("fws-persistence").innerText()).includes("could not be saved") && (await page.locator(".fws-warnings").innerText()).includes("could not be saved"), "persistence failure: results kept, failure disclosed");

  // unauthorized (server rejects token)
  await setMode("ok");
  const unauth = await page.evaluate(async (b) => (await fetch(b + "/api/search/query", { method: "POST", headers: { authorization: "Bearer forged", "content-type": "application/json" }, body: JSON.stringify({ query: "coral" }) })).status, appBase);
  ok(unauth === 401, "forged token rejected by the real handler");

  // mobile layout
  const mobile = await browser.newContext({ viewport: { width: 375, height: 700 } });
  const mp = await mobile.newPage();
  await mp.goto(appBase + "/?signedin=1"); await setMode("ok"); await search(mp, "coral bleaching ocean temperatures");
  await mp.waitForSelector("[data-testid=fws-results]");
  ok(await mp.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), "no horizontal scroll at 375px");
  const small = await mp.evaluate(() => [...document.querySelectorAll("button,input,a")].filter((e) => { const r = e.getBoundingClientRect(); return r.height > 0 && r.height < 24; }).length);
  ok(small === 0, "interactive controls are at least 24px tall");
  ok(errors.length === 0, `no console/page errors (${errors.join("; ")})`);
} finally { await browser.close(); app.close(); fixture.close(); }
console.log(`Fresh web search browser test: PASS (${checks} checks)`);

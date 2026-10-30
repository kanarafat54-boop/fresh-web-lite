#!/usr/bin/env node
/**
 * Browser test for the Fresh Flow two-navigation layout.
 *
 *   node scripts/browser-test-fresh-flow-navigation.mjs <dist-dir>
 *
 * Serves a built copy of the SPA (any bundler output with an index.html), blocks
 * every non-local network request, and drives Chromium as a signed-out visitor at
 * the phone widths the product targets. It checks layout and navigation
 * behavior only; it does not claim anything about live data or the backend.
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { createRequire } from "node:module";

const dist = process.argv[2];
if (!dist || !fs.existsSync(path.join(dist, "index.html"))) {
  console.error("usage: browser-test-fresh-flow-navigation.mjs <dist-dir containing index.html>");
  process.exit(2);
}

async function loadPlaywright() {
  try { return await import("playwright"); } catch { /* fall through to a global install */ }
  const globalRoot = execSync("npm root -g", { encoding: "utf8" }).trim();
  return createRequire(path.join(globalRoot, "x.js"))("playwright");
}
const { chromium } = await loadPlaywright();

const types = { ".js": "text/javascript", ".css": "text/css", ".html": "text/html", ".svg": "image/svg+xml", ".json": "application/json", ".png": "image/png", ".webp": "image/webp" };
const server = http.createServer((req, res) => {
  const requested = path.join(dist, decodeURIComponent(new URL(req.url, "http://x").pathname));
  const file = requested.startsWith(path.resolve(dist)) && fs.existsSync(requested) && fs.statSync(requested).isFile() ? requested : path.join(dist, "index.html");
  res.writeHead(200, { "content-type": types[path.extname(file)] ?? "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
}).listen(0);
const origin = `http://localhost:${server.address().port}`;

const failures = [];
let checks = 0;
const check = (ok, label) => { checks += 1; if (!ok) failures.push(label); };

// Diagnostics: if a page never reaches the expected UI, say what it did show (readable via the checks API).
const diagnostics = [];
async function diagnose(page, label) {
  try {
    const text = (await page.evaluate(() => document.body?.innerText ?? "")).replace(/\s+/g, " ").slice(0, 400);
    diagnostics.push(`${label}: url=${page.url()} body="${text}"`);
  } catch (error) { diagnostics.push(`${label}: could not read page (${error.message})`); }
}

const browser = await chromium.launch();
const WIDTHS = [320, 360, 390, 430];
const TOP_TABS = ["Discover", "Videos", "News / Posts", "Live", "VR / AR", "Podcasts", "Music", "Others"];

for (const width of WIDTHS) {
  const context = await browser.newContext({ viewport: { width, height: 800 }, hasTouch: true, isMobile: true, colorScheme: "light" });
  const page = await context.newPage();
  const tag0 = `@${width}px`;
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.route((url) => !url.href.startsWith(origin), (route) => route.abort());
  await page.goto(`${origin}/fresh-flow`);
  page.on("console", (message) => { if (message.type() === "error") diagnostics.push(`console.error ${tag0}: ${message.text().slice(0, 200)}`); });
  try {
    await page.waitForSelector('nav[aria-label="Fresh Flow media"]', { timeout: 15000 });
  } catch (error) {
    await diagnose(page, `@${width}px never showed the top navigation`);
    for (const line of diagnostics.slice(0, 12)) console.log(`::error title=navigation diagnostics::${line.replace(/[\r\n%]+/g, " ")}`);
    console.error(diagnostics.join("\n"));
    throw error;
  }
  const tag = `@${width}px`;

  // Exactly two navigations: the top media bar and the bottom bar.
  check((await page.locator('nav[aria-label="Fresh Flow media"]').count()) === 1, `${tag} exactly one top media navigation`);
  check((await page.locator("nav.fresh-flow-bottom-nav:visible").count()) === 1, `${tag} exactly one visible Flow bottom navigation`);
  for (const forbidden of [".fresh-flow-section-bar", ".fresh-flow-back-button", ".fresh-flow-flow-switch-trigger", ".fresh-flow-avatar-action", ".fresh-flow-avatar-camera"]) {
    check((await page.locator(forbidden).count()) === 0, `${tag} no ${forbidden} (third nav strip / stacked avatar buttons)`);
  }

  // Top tabs exist, in order, and exactly one is current.
  const tabs = await page.locator('nav[aria-label="Fresh Flow media"] button').allInnerTexts();
  check(JSON.stringify(tabs.map((t) => t.trim())) === JSON.stringify(TOP_TABS), `${tag} top tabs are ${TOP_TABS.join(" · ")} (got ${tabs.join(" · ")})`);
  check((await page.locator('nav[aria-label="Fresh Flow media"] button[aria-current="page"]').count()) === 1, `${tag} one current top tab`);

  // Bottom bar destinations.
  const bottom = (await page.locator("nav.fresh-flow-bottom-nav .fresh-nav-label").allInnerTexts()).map((t) => t.trim());
  check(JSON.stringify(bottom) === JSON.stringify(["Home", "Shorts", "Creator Studio", "Messages", "Fresh Mail"]), `${tag} bottom bar is Home · Shorts · Creator Studio · Messages · Fresh Mail (got ${bottom.join(" · ")})`);

  // No horizontal page overflow; controls are reachable and not covered.
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check(overflow <= 1, `${tag} no horizontal page overflow (${overflow}px)`);
  for (const selector of ['[aria-label="Search Fresh Flow"]', '[aria-label="All media worlds and Flow profile photo"]', '[aria-label="Open your main Fresh ID profile"]']) {
    const target = page.locator(`header ${selector}`).first();
    const box = await target.boundingBox();
    check(Boolean(box) && box.x >= 0 && box.x + box.width <= width + 0.5, `${tag} ${selector} is inside the viewport`);
    check(Boolean(box) && box.width >= 36 && box.height >= 36, `${tag} ${selector} tap target is at least 36px`);
    const covered = await target.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      const hit = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
      return !(hit && (hit === element || element.contains(hit)));
    });
    check(!covered, `${tag} ${selector} is not covered by another element`);
  }
  for (const label of tabs) {
    const box = await page.locator('nav[aria-label="Fresh Flow media"] button', { hasText: label }).first().boundingBox();
    check(Boolean(box) && box.height >= 44, `${tag} top tab "${label.trim()}" is at least 44px tall`);
  }
  const bottomBoxes = await page.locator("nav.fresh-flow-bottom-nav button").evaluateAll((els) => els.map((el) => el.getBoundingClientRect().height));
  check(bottomBoxes.length === 5 && bottomBoxes.every((h) => h >= 44), `${tag} bottom items are at least 44px tall`);

  // Each top tab navigates and becomes the single current tab.
  for (const label of ["Videos", "News / Posts", "Podcasts", "Others", "Discover"]) {
    await page.locator('nav[aria-label="Fresh Flow media"] button', { hasText: new RegExp(`^${label.replace(/[/ ]/g, "\\s*$&\\s*").replace(/\\s\*\s\\s\*/g, "\\s*")}$`) }).first().click().catch(async () => {
      await page.getByRole("button", { name: label, exact: true }).first().click();
    });
    await page.waitForTimeout(150);
    const current = await page.locator('nav[aria-label="Fresh Flow media"] button[aria-current="page"]').allInnerTexts();
    check(current.length === 1 && current[0].trim() === label, `${tag} clicking ${label} makes it the only current tab (got ${current.join(",")})`);
    check((await page.locator('nav[aria-label="Fresh Flow media"]').count()) === 1, `${tag} still exactly one top navigation after opening ${label}`);
  }

  // Bottom Shorts is current on the Shorts route and the top bar then has no current tab.
  await page.locator("nav.fresh-flow-bottom-nav button", { hasText: "Shorts" }).click();
  await page.waitForTimeout(300);
  check((await page.locator("nav.fresh-flow-bottom-nav button.active .fresh-nav-label").allInnerTexts()).map((t) => t.trim()).join() === "Shorts", `${tag} Shorts is the active bottom item on the Shorts route`);

  // All-worlds sheet exposes the relocated Fresh Flow photo controls.
  await page.locator('header [aria-label="All media worlds and Flow profile photo"]').click();
  const dialog = page.getByRole("dialog", { name: "Fresh Flow media worlds" });
  check(await dialog.isVisible(), `${tag} all-worlds sheet opens`);
  check(await dialog.getByRole("button", { name: "Upload" }).isVisible() && await dialog.getByRole("button", { name: "Camera" }).isVisible(), `${tag} Flow photo Upload/Camera controls live in the sheet`);
  await dialog.getByRole("button", { name: "Close Flow Switch" }).click();
  check(!(await dialog.isVisible().catch(() => false)), `${tag} all-worlds sheet closes`);

  check(pageErrors.length === 0, `${tag} no uncaught page errors (${pageErrors[0] ?? ""})`);
  await context.close();
}

await browser.close();
server.close();
if (failures.length) {
  console.error(`Fresh Flow navigation browser test FAILED (${failures.length}/${checks}):`);
  for (const failure of failures) console.error(`  - ${failure}`);
  // GitHub Actions annotations make failures readable from the checks API as well as the log.
  if (process.env.GITHUB_ACTIONS) for (const failure of failures.slice(0, 10)) console.log(`::error title=%s::%s`.replace("%s", "navigation browser test").replace("%s", failure.replace(/[\r\n]+/g, " ")));
  process.exit(1);
}
console.log(`Fresh Flow navigation browser test: PASS (${checks} checks across ${WIDTHS.join(", ")}px)`);

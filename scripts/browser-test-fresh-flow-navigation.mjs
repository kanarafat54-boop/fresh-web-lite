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
const distRoot = path.resolve(dist);
const server = http.createServer((req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, "http://x").pathname);
  const requested = path.resolve(distRoot, `.${pathname}`);
  const insideDist = requested === distRoot || requested.startsWith(distRoot + path.sep);
  const file = insideDist && fs.existsSync(requested) && fs.statSync(requested).isFile() ? requested : path.join(distRoot, "index.html");
  res.writeHead(200, { "content-type": types[path.extname(file)] ?? "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
}).listen(0);
const origin = `http://localhost:${server.address().port}`;

const failures = [];
let checks = 0;
const check = (ok, label) => { checks += 1; if (!ok) failures.push(label); };

const browser = await chromium.launch();
const WIDTHS = [320, 360, 390, 430];
const fixtureAuthorId = "00000000-0000-4000-9000-000000000001";
const longVideoFixtures = [
  { id: "00000000-0000-4000-8000-000000000001", author_id: fixtureAuthorId, content: "The Long Journey — Chapter One", image_url: null, video_url: "https://example.invalid/long-video-one.mp4", like_count: 12, comment_count: 3, created_at: "2026-10-29T10:00:00Z" },
  { id: "00000000-0000-4000-8000-000000000002", author_id: fixtureAuthorId, content: "Learning the World: A Documentary", image_url: null, video_url: "https://example.invalid/long-video-two.mp4", like_count: 8, comment_count: 1, created_at: "2026-10-28T10:00:00Z" },
];

const TOP_TABS = ["Discover", "Videos", "News / Posts", "Live", "VR / AR", "Podcasts", "Music", "Others"];

for (const width of WIDTHS) {
  const context = await browser.newContext({ viewport: { width, height: 800 }, hasTouch: true, isMobile: true, colorScheme: "light" });
  const page = await context.newPage();
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "share", { configurable: true, value: async (payload) => { window.__lastSharePayload = payload; } });
  });
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.route((url) => !url.href.startsWith(origin), (route) => {
    const requestUrl = new URL(route.request().url());
    if (requestUrl.host === "example.invalid" && requestUrl.pathname === "/rest/v1/posts") {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(longVideoFixtures) });
    }
    if (requestUrl.host === "example.invalid" && requestUrl.pathname === "/rest/v1/user_public_profiles") {
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([{ id: fixtureAuthorId, full_name: "Fresh Cinema Creator", username: "cinemacreator" }]) });
    }
    if (requestUrl.host === "example.invalid") return route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
    return route.abort();
  });
  // Fresh Flow is available to authenticated and guest users, not anonymous
  // signed-out sessions. Establish the real guest state through Fresh ID first.
  await page.goto(`${origin}/auth/sign-in`);
  try {
    await page.waitForSelector(".fresh-id-gateway", { timeout: 15000 });
  } catch {
    throw new Error(`Fresh ID gateway did not render. URL: ${page.url()}. Page text: ${(await page.locator("body").innerText()).slice(0, 1200)}. Page errors: ${pageErrors.join(" | ")}`);
  }
  const guestButton = page.locator(".auth-footer-links .guest-btn");
  if (await guestButton.count() !== 1) {
    throw new Error(`Fresh ID guest entry was not rendered. Page text: ${(await page.locator("body").innerText()).slice(0, 1200)}`);
  }
  await guestButton.click({ timeout: 15000 });
  await page.evaluate(() => {
    window.history.replaceState({ freshRoute: "fresh-flow" }, "", "/fresh-flow");
    window.dispatchEvent(new PopStateEvent("popstate"));
  });
  await page.waitForSelector('nav[aria-label="Fresh Flow media"]', { timeout: 15000 });
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

  // Long Videos product surfaces: discovery, details, cinema, library and settings.
  await page.locator('nav[aria-label="Fresh Flow media"] button', { hasText: "Videos" }).click();
  await page.waitForSelector(".fresh-long", { timeout: 10000 });
  check(await page.getByRole("heading", { name: "Long Videos" }).isVisible(), `${tag} Long Videos discovery opens`);
  check(await page.getByText("The Long Journey — Chapter One").first().isVisible(), `${tag} real published-video contract renders featured content`);
  check(await page.locator(".fresh-long-feature-copy button[aria-pressed]").first().isVisible(), `${tag} video reactions are available`);
  await page.locator(".fresh-long-feature-copy button", { hasText: "Share" }).click();
  const sharedUrl = await page.evaluate(() => window.__lastSharePayload?.url ?? "");
  check(sharedUrl.includes("videoId=00000000-0000-4000-8000-000000000001"), `${tag} share creates a video-specific Fresh Flow deep link`);
  await page.getByRole("button", { name: "Explore" }).click();
  check(await page.getByRole("heading", { name: "Explore Long Videos" }).isVisible(), `${tag} Explore screen opens`);
  check(await page.locator(".fresh-long-explore-grid button").count() === 6, `${tag} Explore exposes all six browsing categories`);
  await page.locator(".fresh-long-explore-grid button", { hasText: "For You" }).click();
  await page.getByLabel("Search long videos").fill("Documentary");
  check(await page.getByText("Learning the World: A Documentary").first().isVisible(), `${tag} search filters long-form video results`);
  await page.locator(".fresh-long-search button").click();
  await page.locator(".fresh-long-feature-copy button", { hasText: "Details" }).click();
  const videoDetails = page.getByRole("dialog", { name: /Details for The Long Journey/ });
  check(await videoDetails.isVisible(), `${tag} video details screen opens`);
  await videoDetails.getByRole("button", { name: "Watch later" }).click();
  check(await videoDetails.getByRole("button", { name: "Saved" }).isVisible(), `${tag} watch-later action updates state`);
  await videoDetails.getByRole("button", { name: "Watch now" }).click();
  check(await page.locator(".fresh-long-player").isVisible(), `${tag} cinema player opens from details`);
  await page.locator(".fresh-long-player-bar button[aria-label='Close cinema player']").click();
  await page.locator(".fresh-long-feature-copy .fresh-long-author-link").click();
  check(await page.getByRole("heading", { name: "Fresh Cinema Creator" }).isVisible(), `${tag} dedicated creator channel opens`);
  check(await page.getByText("Videos from @cinemacreator").isVisible(), `${tag} creator channel lists its videos`);
  await page.getByRole("button", { name: "Back to Discover" }).click();
  await page.getByRole("button", { name: "Your Library" }).click();
  check(await page.getByRole("heading", { name: "Your Library" }).isVisible(), `${tag} library screen opens`);
  check(await page.getByText("The Long Journey — Chapter One").first().isVisible(), `${tag} saved video appears in library`);
  await page.getByRole("button", { name: "Back to Discover" }).click();
  await page.getByRole("button", { name: "Settings" }).click();
  check(await page.getByRole("heading", { name: "Playback Settings" }).isVisible(), `${tag} playback settings screen opens`);
  await page.locator(".fresh-long-settings select").selectOption("1.5");
  check(await page.locator(".fresh-long-settings select").inputValue() === "1.5", `${tag} preferred playback speed is selectable`);
  await page.locator(".fresh-long-settings label").filter({ hasText: "Data saver" }).locator("input").check();
  check(await page.locator(".fresh-long-settings label").filter({ hasText: "Data saver" }).locator("input").isChecked(), `${tag} data saver preference toggles`);
  await page.getByRole("button", { name: "Back to Discover" }).click();

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
  process.exit(1);
}
console.log(`Fresh Flow navigation browser test: PASS (${checks} checks across ${WIDTHS.join(", ")}px)`);

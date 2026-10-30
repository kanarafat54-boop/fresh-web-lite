#!/usr/bin/env node
/**
 * Browser test for the Fresh Shorts pager (TikTok-style behavior).
 *
 *   node scripts/browser-test-fresh-shorts.mjs <dist-dir>
 *
 * Serves a built copy of the SPA, blocks every non-local request, and answers the
 * Supabase REST reads for `shorts` with three generated fixture clips. The clips
 * are synthetic test media; nothing here claims anything about live data.
 */
import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execSync } from "node:child_process";
import { createRequire } from "node:module";

const dist = process.argv[2];
if (!dist || !fs.existsSync(path.join(dist, "index.html"))) { console.error("usage: browser-test-fresh-shorts.mjs <dist-dir>"); process.exit(2); }

async function loadPlaywright() {
  try { return await import("playwright"); } catch { /* use global install */ }
  const globalRoot = execSync("npm root -g", { encoding: "utf8" }).trim();
  return createRequire(path.join(globalRoot, "x.js"))("playwright");
}
const { chromium } = await loadPlaywright();

const work = fs.mkdtempSync(path.join(os.tmpdir(), "fresh-shorts-"));
const clip = path.join(work, "clip.webm");
execSync(`ffmpeg -loglevel error -y -f lavfi -i testsrc=size=270x480:rate=15 -t 8 -c:v libvpx -b:v 200k ${clip}`);

const types = { ".js": "text/javascript", ".css": "text/css", ".html": "text/html", ".svg": "image/svg+xml", ".json": "application/json", ".png": "image/png", ".webp": "image/webp" };
const distRoot = path.resolve(dist);
const server = http.createServer((req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (pathname === "/test-clip.webm") {
    const data = fs.readFileSync(clip);
    const range = req.headers.range?.match(/bytes=(\d+)-(\d*)/);
    if (range) {
      const start = Number(range[1]); const end = range[2] ? Number(range[2]) : data.length - 1;
      res.writeHead(206, { "content-type": "video/webm", "accept-ranges": "bytes", "content-range": `bytes ${start}-${end}/${data.length}`, "content-length": end - start + 1 });
      return res.end(data.subarray(start, end + 1));
    }
    res.writeHead(200, { "content-type": "video/webm", "accept-ranges": "bytes", "content-length": data.length });
    return res.end(data);
  }
  const requested = path.resolve(distRoot, `.${pathname}`);
  const insideDist = requested === distRoot || requested.startsWith(distRoot + path.sep);
  const file = insideDist && fs.existsSync(requested) && fs.statSync(requested).isFile() ? requested : path.join(distRoot, "index.html");
  res.writeHead(200, { "content-type": types[path.extname(file)] ?? "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
}).listen(0);
const origin = `http://localhost:${server.address().port}`;

const rows = [1, 2, 3].map((n) => ({
  id: `00000000-0000-4000-8000-00000000000${n}`, author_id: `00000000-0000-4000-9000-00000000000${n}`,
  caption: `Fixture clip ${n}`, sound_name: null, chapters: [], video_url: `${origin}/test-clip.webm`,
  like_count: n, comment_count: n, view_count: 0, repost_count: 0, created_at: `2026-10-0${n}T00:00:00Z`,
}));

const failures = []; let checks = 0;
const check = (ok, label) => { checks += 1; if (!ok) failures.push(label); };

const browser = await chromium.launch({ args: ["--autoplay-policy=no-user-gesture-required"] });
const WIDTHS = [320, 390, 430];
for (const width of WIDTHS) {
  const context = await browser.newContext({ viewport: { width, height: 760 }, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  const tag = `@${width}px`;
  const pageErrors = [];
  page.on("pageerror", (e) => pageErrors.push(e.message));
  await page.route((url) => !url.href.startsWith(origin), (route) => {
    const url = new URL(route.request().url());
    if (url.host === "example.invalid" && url.pathname === "/rest/v1/shorts") return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(rows) });
    if (url.host === "example.invalid") return route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
    return route.abort();
  });
  // Fresh Flow requires an authenticated or guest Fresh ID session.
  await page.goto(`${origin}/auth/sign-in`);
  await page.waitForSelector(".fresh-id-gateway", { timeout: 15000 });
  await page.locator(".auth-footer-links .guest-btn").click({ timeout: 15000 });
  await page.evaluate(() => {
    window.history.replaceState({ freshRoute: "fresh-flow" }, "", "/fresh-flow");
    window.dispatchEvent(new PopStateEvent("popstate"));
  });
  await page.waitForSelector("nav.fresh-flow-bottom-nav", { timeout: 15000 });
  await page.locator("nav.fresh-flow-bottom-nav button", { hasText: "Shorts" }).click();
  await page.waitForSelector(".fresh-flow-item", { timeout: 15000 });
  await page.waitForTimeout(800);

  check((await page.locator(".fresh-flow-item").count()) === 3, `${tag} three fixture Shorts render`);
  check((await page.locator(".fresh-flow-picks").count()) === 0 && (await page.getByText("Gaming Live").count()) === 0, `${tag} no fabricated "Picks" rail`);

  // Layout: single scroller, full-bleed items, both navigations visible.
  const geo = await page.evaluate(() => {
    const vp = document.querySelector(".fresh-flow-viewport");
    const stream = document.querySelector(".fresh-flow-stream");
    const item = document.querySelector(".fresh-flow-item");
    const cs = getComputedStyle(item);
    return { vpH: vp.clientHeight, vpScroll: vp.scrollHeight, streamOverflow: stream.scrollHeight - stream.clientHeight, itemH: item.getBoundingClientRect().height, radius: cs.borderTopLeftRadius, border: cs.borderTopWidth, snap: getComputedStyle(vp).scrollSnapType, itemW: item.getBoundingClientRect().width, vw: window.innerWidth };
  });
  check(geo.vpScroll >= geo.vpH * 3 - 2, `${tag} viewport holds three full-height pages (${geo.vpScroll}/${geo.vpH})`);
  check(geo.streamOverflow <= 1, `${tag} outer stream does not scroll (single scroll container)`);
  check(Math.abs(geo.itemH - geo.vpH) <= 1, `${tag} each Short fills the viewport height (${geo.itemH} vs ${geo.vpH})`);
  check(Math.abs(geo.itemW - geo.vw) <= 1, `${tag} each Short is full width`);
  check(geo.radius === "0px" && geo.border === "0px", `${tag} Shorts are full-bleed (no card border/radius)`);
  check(/y\s+mandatory/.test(geo.snap), `${tag} vertical mandatory snap`);
  check(await page.locator('nav[aria-label="Fresh Flow media"]').isVisible(), `${tag} top navigation visible on Shorts`);
  const shortsTabs = (await page.locator('nav[aria-label="Fresh Flow media"] button').allInnerTexts()).map((t) => t.trim());
  check(JSON.stringify(shortsTabs) === JSON.stringify(["Live", "VR / AR", "Podcasts", "Music", "Others"]), `${tag} Shorts top navigation is Live · VR / AR · Podcasts · Music · Others (got ${shortsTabs.join(" · ")})`);
  check((await page.locator("header .fresh-shorts-brand").textContent()).includes("Fresh Shorts"), `${tag} Shorts world header is branded Fresh Shorts`);
  for (const label of ["Search Fresh Flow", "Add or create a Short", "Open camera to record a Short", "Open your main Fresh ID profile"]) {
    const box = await page.locator(`header [aria-label="${label}"]`).first().boundingBox();
    check(Boolean(box) && box.x >= 0 && box.x + box.width <= width + 0.5 && box.width >= 36 && box.height >= 36, `${tag} header control "${label}" is on-screen and tappable`);
  }
  check(await page.locator("nav.fresh-flow-bottom-nav").isVisible(), `${tag} bottom navigation visible on Shorts when idle`);

  // Exactly one video playing.
  const playing = () => page.evaluate(() => [...document.querySelectorAll("video[data-short-id]")].map((v) => !v.paused && !v.ended));
  let state = await playing();
  check(state.filter(Boolean).length === 1 && state[0], `${tag} only the first Short plays on entry (${state.join(",")})`);

  // Actions are reachable and clear the bottom nav.
  const navTop = await page.locator("nav.fresh-flow-bottom-nav").evaluate((el) => el.getBoundingClientRect().top);
  const actionsBottom = await page.locator(".fresh-flow-item").first().locator(".fresh-flow-actions").evaluate((el) => el.getBoundingClientRect().bottom);
  check(actionsBottom <= navTop + 1, `${tag} action column clears the bottom navigation (${Math.round(actionsBottom)} <= ${Math.round(navTop)})`);
  for (const label of ["Comments", "Save", "Share", "Send gift", "More"]) {
    const box = await page.locator(".fresh-flow-item").first().locator(`.fresh-flow-actions [aria-label="${label}"]`).boundingBox();
    check(Boolean(box) && box.x >= 0 && box.x + box.width <= width + 0.5 && box.width >= 44 && box.height >= 44, `${tag} "${label}" is on-screen and at least 44px`);
  }

  // Tap pauses, tap resumes.
  const first = page.locator(".fresh-flow-item").first().locator(".fresh-flow-tap-layer");
  await first.click({ position: { x: width / 2, y: 300 } });
  await page.waitForTimeout(450);
  state = await playing();
  check(!state[0], `${tag} single tap pauses`);
  await first.click({ position: { x: width / 2, y: 300 } });
  await page.waitForTimeout(450);
  state = await playing();
  check(state[0], `${tag} tap again resumes`);

  // Double tap shows the like burst without pausing.
  await first.dblclick({ position: { x: width / 2, y: 300 }, delay: 40 });
  await page.waitForTimeout(150);
  check((await page.locator(".fresh-flow-heart-burst").count()) >= 1, `${tag} double tap shows the heart burst`);
  await page.waitForTimeout(600);
  state = await playing();
  check(state[0], `${tag} double tap does not leave the video paused`);

  // Progress bar advances while playing.
  await page.waitForTimeout(1200);
  const fill = await page.locator(".fresh-flow-item").first().locator(".fresh-flow-progress-fill").evaluate((el) => parseFloat(el.style.width || "0"));
  check(fill > 0, `${tag} progress bar advances (${fill.toFixed(1)}%)`);

  // More panel.
  await page.locator(".fresh-flow-item").first().locator('[aria-label="More"]').click();
  const more = page.locator(".fresh-flow-advanced").first();
  check(await more.isVisible(), `${tag} More panel opens`);
  const moreText = await more.innerText();
  for (const label of ["Repost", "Ask Fresh AI", "Not interested", "Remix"]) check(moreText.includes(label), `${tag} More panel has ${label}`);
  await page.locator(".fresh-flow-item").first().locator('[aria-label="More"]').click();

  // Paging by scroll: the next Short becomes the only one playing.
  await page.evaluate(() => document.querySelector(".fresh-flow-viewport").scrollTo({ top: document.querySelector(".fresh-flow-viewport").clientHeight, behavior: "instant" }));
  await page.waitForTimeout(1200);
  state = await playing();
  check(state.filter(Boolean).length === 1 && state[1], `${tag} after scrolling, only Short 2 plays (${state.join(",")})`);
  // Top stays fixed; the bottom bar hides while scrolling and returns once scrolling stops.
  await page.evaluate(() => document.querySelector(".fresh-flow-viewport").scrollTo({ top: 0, behavior: "instant" }));
  await page.waitForTimeout(150);
  check(await page.locator("nav.fresh-flow-bottom-nav.flow-navigation-hidden").count() === 1, `${tag} bottom navigation hides while scrolling`);
  check(await page.locator('nav[aria-label="Fresh Flow media"]').isVisible(), `${tag} top navigation stays fixed while scrolling`);
  await page.waitForTimeout(1100);
  check(await page.locator("nav.fresh-flow-bottom-nav").isVisible() && (await page.locator("nav.fresh-flow-bottom-nav.flow-navigation-hidden").count()) === 0, `${tag} bottom navigation returns when scrolling stops`);
  await page.evaluate(() => document.querySelector(".fresh-flow-viewport").scrollTo({ top: document.querySelector(".fresh-flow-viewport").clientHeight, behavior: "instant" }));
  await page.waitForTimeout(1200);

  // Keyboard paging.
  await page.keyboard.press("ArrowDown");
  await page.waitForTimeout(1500);
  state = await playing();
  check(state.filter(Boolean).length === 1 && state[2], `${tag} ArrowDown pages to Short 3 (${state.join(",")})`);
  await page.keyboard.press("ArrowUp");
  await page.waitForTimeout(1500);
  state = await playing();
  check(state.filter(Boolean).length === 1 && state[1], `${tag} ArrowUp pages back to Short 2 (${state.join(",")})`);

  // Not interested removes the Short from the pager.
  await page.locator(".fresh-flow-item").nth(1).locator('[aria-label="More"]').click();
  await page.locator(".fresh-flow-advanced").getByRole("button", { name: /Not interested/ }).click();
  await page.waitForTimeout(400);
  check((await page.locator(".fresh-flow-item").count()) === 2, `${tag} Not interested removes the Short`);

  check(pageErrors.length === 0, `${tag} no uncaught page errors (${pageErrors[0] ?? ""})`);
  await context.close();
}
await browser.close(); server.close(); fs.rmSync(work, { recursive: true, force: true });
if (failures.length) {
  console.error(`Fresh Shorts browser test FAILED (${failures.length}/${checks}):`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log(`Fresh Shorts browser test: PASS (${checks} checks across ${WIDTHS.join(", ")}px)`);

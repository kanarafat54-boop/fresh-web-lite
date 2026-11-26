// Shared Fresh Shorts UI pieces: first-frame thumbnails, the bottom sheet and the info strip.
import assert from "node:assert/strict";
import fs from "node:fs";
import { firstFrameSrc, formatShortDuration } from "../src/features/fresh-flow/core/shortsThumbnail.ts";
import { buildSavedItems } from "../src/features/fresh-flow/core/shortsSaved.ts";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const comp = (name) => read(`src/features/fresh-flow/components/${name}`);

// Duration label
assert.equal(formatShortDuration(47), "0:47");
assert.equal(formatShortDuration(65), "1:05");
assert.equal(formatShortDuration(754.4), "12:34");
for (const bad of [0, -3, NaN, Infinity, null, undefined]) assert.equal(formatShortDuration(bad), null, `no label for ${bad}`);

// First-frame URL: always one #t fragment, and the file URL itself is untouched
assert.equal(firstFrameSrc("https://cdn.example/a.mp4"), "https://cdn.example/a.mp4#t=0.1");
assert.equal(firstFrameSrc("https://cdn.example/a.mp4#t=5"), "https://cdn.example/a.mp4#t=0.1");
assert.equal(firstFrameSrc("https://cdn.example/a.mp4?token=1"), "https://cdn.example/a.mp4?token=1#t=0.1");

// Saved items carry the video URL for thumbnails, and stay null when a Short is gone
const items = buildSavedItems(
  [{ short_id: "a", created_at: "2026-11-02T10:00:00Z" }, { short_id: "gone", created_at: "2026-11-01T10:00:00Z" }],
  new Map([["a", { id: "a", author_id: "u1", caption: "x", video_url: "https://cdn.example/a.mp4" }]]),
  new Map([["u1", "@amina"]]),
);
assert.equal(items[0].videoUrl, "https://cdn.example/a.mp4");
assert.equal(items[1].videoUrl, null);

// Thumbnail: lazy, metadata only, silent, with a fallback and no poster column needed
const thumb = comp("ShortThumbnail.tsx");
assert.match(thumb, /IntersectionObserver/, "tiles load only when near the screen");
assert.match(thumb, /preload="metadata"/, "only metadata is fetched");
assert.match(thumb, /\bmuted\b/);
assert.match(thumb, /onError=\{\(\) => setFailed\(true\)\}/, "an unreadable video falls back to a plain tile");
assert.match(thumb, /short-thumb-fallback/);
assert.doesNotMatch(thumb, /autoPlay/, "thumbnails never autoplay");

// History and Saved use thumbnails fed by real video URLs
assert.match(read("src/features/fresh-flow/core/shortsHistoryService.ts"), /select\("id, author_id, caption, video_url"\)/);
assert.match(read("src/features/fresh-flow/core/shortsSavedService.ts"), /select\("id, author_id, caption, video_url"\)/);
for (const name of ["ShortsHistorySheet.tsx", "ShortsSavedSheet.tsx"]) {
  const src = comp(name);
  assert.match(src, /<ShortThumbnail videoUrl=\{item\.videoUrl\}/, `${name} shows thumbnails`);
  assert.match(src, /<ShortsBottomSheet /, `${name} uses the shared sheet`);
  assert.doesNotMatch(src, /className="shorts-sheet-backdrop"/, `${name} no longer hand-builds its own backdrop`);
}

// Shared bottom sheet
const sheet = comp("ShortsBottomSheet.tsx");
assert.match(sheet, /role="dialog" aria-modal="true" aria-label=\{title\}/);
assert.match(sheet, /event\.key === "Escape"/, "Escape closes");
assert.match(sheet, /setPointerCapture/, "the handle drags");
assert.match(sheet, /previous\.focus\(\)/, "focus returns to what opened the sheet");
assert.match(sheet, /event\.key !== "Tab"/, "Tab stays inside the sheet");
assert.match(sheet, /className="shorts-sheet-handle"/);
assert.match(sheet, /aria-label="Close"/);

// Info strip: one component for the player strip and sheet notes
const strip = comp("ShortsInfoStrip.tsx");
assert.match(strip, /onClick\s*\?\s*<button type="button"/, "a clickable strip is a real button");
assert.match(strip, /role="status"/, "a plain strip is announced as status");
const stream = comp("FreshFlowShortsStream.tsx");
assert.match(stream, /<ShortsInfoStrip kind="download" placement="overlay"/);
assert.match(stream, /<ShortsInfoStrip kind="context" placement="overlay"/);
assert.match(stream, /Download is available because this creator enabled it\./);

console.log("fresh-shorts-shared-ui: ok");

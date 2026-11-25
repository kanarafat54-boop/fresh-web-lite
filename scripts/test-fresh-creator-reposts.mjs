import assert from "node:assert/strict";
import fs from "node:fs";
import { stripTypeScriptTypes } from "node:module";

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const loader = read("src/features/fresh-flow/core/creatorReposts.ts");
const profile = read("src/features/fresh-flow/components/ShortsCreatorProfile.tsx");

// Run the real merge function from source (types stripped), not a copy.
const start = loader.indexOf("export function mergeReposts");
const end = loader.indexOf("\n}\n", start) + 3;
assert.ok(start > 0 && end > start, "mergeReposts must exist");
const code = stripTypeScriptTypes(loader.slice(start, end)).replace("export function", "function");
const mergeReposts = new Function(`${code}; return mergeReposts;`)();

const shorts = [
  { id: "a", author_id: "u1", caption: "A", video_url: "a.mp4", view_count: 10 },
  { id: "b", author_id: "u2", caption: null, video_url: "b.mp4", view_count: null },
  { id: "c", author_id: "u3", caption: "C", video_url: "c.mp4", view_count: 3 },
];
const reposts = [
  { short_id: "a", created_at: "2026-11-01T00:00:00Z" },
  { short_id: "b", created_at: "2026-11-03T00:00:00Z" },
  { short_id: "gone", created_at: "2026-11-05T00:00:00Z" },
  { short_id: "a", created_at: "2026-10-01T00:00:00Z" },
  { short_id: "c", created_at: null },
];
const merged = mergeReposts(reposts, shorts);
assert.deepEqual(merged.map((item) => item.id), ["b", "a", "c"], "newest repost first, missing Short dropped, duplicates removed, undated last");
assert.equal(merged[0].caption, "", "null caption becomes an empty string");
assert.equal(merged[0].viewCount, 0, "null view count becomes 0");
assert.deepEqual(mergeReposts([], shorts), []);
assert.deepEqual(mergeReposts(reposts, []), [], "no visible Shorts means no tiles, not empty tiles");

// Privacy and failure behaviour.
assert.match(loader, /keepVisibleAuthors\(/, "original authors are filtered for blocks and hidden accounts");
assert.match(loader, /throw new Error\(error\.message\)/, "a read error is thrown, not swallowed as an empty list");

// Preservation: every existing tab remains and Reposts is added, with loading, error and empty states.
assert.match(profile, /\["shorts", "reposts", "playlists", "about"\] as Tab\[\]/, "all four tabs, existing ones preserved");
for (const label of ['"Shorts"', '"Playlists"', '"About"', '"Reposts"']) assert.ok(profile.includes(label), `${label} label present`);
assert.match(profile, /Loading reposts/);
assert.match(profile, /role="alert">\{repostError\}/);
assert.match(profile, /No reposts to show/);
assert.match(profile, /loadCreatorReposts\(authorId\)/);
// The four profile tabs must fit on one row (a fixed 3-column grid would wrap the fourth tab).
const profileCss = read("src/features/fresh-flow/components/ShortsCreatorProfile.css");
const tabsRule = profileCss.match(/\.shorts-profile-tabs\{[^}]*\}/)?.[0] ?? "";
assert.ok(tabsRule && !/repeat\(3,/.test(tabsRule), "profile tab bar must not be fixed at three columns");

// My Collections: the Saved sheet gains Liked and Reposted tabs and keeps the Saved behaviour intact.
const sheet = read("src/features/fresh-flow/components/ShortsSavedSheet.tsx");
assert.match(sheet, /saved: "Saved", liked: "Liked", reposted: "Reposted"/, "Saved, Liked and Reposted tabs");
assert.match(sheet, /role="tablist"/);
assert.match(sheet, /role="tab"[^>]*aria-selected=\{tab === id\}/, "tabs expose their selected state");
assert.match(sheet, /loadLikedShorts\(userId\)/, "Liked uses the viewer's own id");
assert.match(sheet, /loadCreatorReposts\(userId\)/, "Reposted uses the viewer's own id");
assert.match(sheet, /loadSavedShorts\(userId\)/, "Saved list is still loaded");
assert.match(sheet, /removeShortInteraction\(userId, shortId, "save"\)/, "unsave is preserved");
assert.match(sheet, /Nothing saved yet/, "saved empty state is preserved");
assert.match(sheet, /could not load your \$\{TAB_LABELS\[tab\]\.toLowerCase\(\)\} Shorts/, "Liked/Reposted show a real error");
assert.match(loader, /export function loadLikedShorts\(viewerId: string/, "likes loader exists");
assert.match(loader, /"short_reposts" \| "short_likes"/, "likes and reposts share one reader");
assert.match(read("src/features/fresh-flow/components/shortsContextPanel.css"), /\.shorts-sheet-tabs button\[aria-selected="true"\]/, "selected sheet tab is styled");
console.log("Creator profile Reposts tab: PASS");

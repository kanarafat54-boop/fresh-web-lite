import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { shortDeepLink, parseShortDeepLink, shortWatchPath, parseShortWatchPath, isShortsPath, parseRequestedShort } from "../src/features/fresh-flow/core/shortsLinks.ts";
const id = "123e4567-e89b-42d3-a456-426614174000";
assert.equal(shortDeepLink(id, "https://x.app/"), `https://x.app/fresh-flow-shorts?short=${id}`);
assert.equal(parseShortDeepLink(`?short=${id}`), id);
assert.equal(parseShortDeepLink("?short=../../evil"), null);
assert.equal(shortWatchPath(id), `/flow/shorts/watch/${id}`);
assert.equal(parseShortWatchPath(`/flow/shorts/watch/${id}`), id);
assert.equal(parseShortWatchPath(`/flow/shorts/watch/${id}/`), id);
assert.equal(parseShortWatchPath("/flow/shorts/watch/../../evil"), null);
assert.equal(parseShortWatchPath("/flow/shorts/watch/not-a-uuid"), null);
assert.equal(isShortsPath("/flow/shorts"), true);
assert.equal(isShortsPath("/flow/shorts/"), true);
assert.equal(isShortsPath(`/flow/shorts/watch/${id}`), true);
assert.equal(isShortsPath("/flow/shortsx"), false);
assert.equal(isShortsPath("/flow/shorts/other"), false);
assert.equal(parseRequestedShort("", `/flow/shorts/watch/${id}`), id);
assert.equal(parseRequestedShort(`?short=${id}`, "/fresh-flow-shorts"), id);
assert.equal(parseRequestedShort("", "/fresh-flow-shorts"), null);
assert.equal(parseShortDeepLink(""), null);
const src = readFileSync("src/features/fresh-flow/core/shortsSafety.ts", "utf8");
assert.match(src, /target_type: "short"/);
assert.match(src, /muted_creators/);
console.log("fresh-shorts-safety: ok");

// Address bar follows the playing Short, only inside the Shorts environment.
{
  const { addressForPlayingShort } = await import("../src/features/fresh-flow/core/shortsLinks.ts");
  const other = "22222222-2222-4222-8222-222222222222";
  assert.equal(addressForPlayingShort("/flow/shorts", id), `/flow/shorts/watch/${id}`);
  assert.equal(addressForPlayingShort("/fresh-flow-shorts", id), `/flow/shorts/watch/${id}`);
  assert.equal(addressForPlayingShort(`/flow/shorts/watch/${id}`, other), `/flow/shorts/watch/${other}`);
  assert.equal(addressForPlayingShort(`/flow/shorts/watch/${id}`, id), null, "no churn when already correct");
  assert.equal(addressForPlayingShort("/fresh-flow-long-videos", id), null, "never rewrites another section");
  assert.equal(addressForPlayingShort("/", id), null);
  assert.equal(addressForPlayingShort("/flow/shorts", "not-a-uuid"), null);
}

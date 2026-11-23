import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  decodeFreshFlowCursor,
  encodeFreshFlowCursor,
  fetchFreshFlowPage,
  FRESH_FLOW_PAGE_SIZE,
  nextFreshFlowCursor,
} from "../src/features/fresh-flow/core/freshFlowPagination.ts";

assert.equal(FRESH_FLOW_PAGE_SIZE, 24);
assert.equal(encodeFreshFlowCursor({ offset: -4 }), "0");
assert.deepEqual(decodeFreshFlowCursor("24"), { offset: 24 });
assert.deepEqual(decodeFreshFlowCursor("not-a-cursor"), { offset: 0 });
assert.equal(nextFreshFlowCursor(null, 24, 24), "24");
assert.equal(nextFreshFlowCursor("24", 23, 24), null);

const calls = [];
const first = await fetchFreshFlowPage({
  range: async (start, end) => {
    calls.push([start, end]);
    return { data: Array.from({ length: 24 }, (_, index) => index), error: null };
  },
}, null, 24);
assert.deepEqual(calls[0], [0, 23]);
assert.equal(first.data.length, 24);
assert.equal(first.cursor, "24");
assert.equal(first.hasMore, true);

const second = await fetchFreshFlowPage({
  range: async (start, end) => {
    calls.push([start, end]);
    return { data: [24, 25], error: null };
  },
}, first.cursor, 24);
assert.deepEqual(calls[1], [24, 47]);
assert.deepEqual(second.data, [24, 25]);
assert.equal(second.cursor, null);
assert.equal(second.hasMore, false);

const failed = await fetchFreshFlowPage({
  range: async () => ({ data: null, error: new Error("temporary failure") }),
}, "48", 24);
assert.equal(failed.cursor, "48");
assert.equal(failed.hasMore, false);
assert.equal(failed.error.message, "temporary failure");

const feed = readFileSync("src/features/feed/components/FeedModule.tsx", "utf8");
for (const token of [
  "fetchFreshFlowPage",
  "FRESH_FLOW_PAGE_SIZE",
  'order("created_at", { ascending: false })',
  'order("id", { ascending: false })',
  "requestGenerationRef",
  "appendLockRef",
  "prefetchBlockedCursorRef",
  "manual: true",
  "isCurrentRequest()",
  "shouldPrefetch",
  "Load more posts",
]) {
  assert.ok(feed.includes(token), `News / Posts pagination contract missing: ${token}`);
}

console.log("Fresh Flow News / Posts bounded pagination contract: PASS");

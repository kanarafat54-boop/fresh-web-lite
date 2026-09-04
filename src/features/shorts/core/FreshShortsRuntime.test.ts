import {
  FRESH_SHORTS_PREFETCH_RADIUS,
  getActiveIndex,
  getMediaWindow,
  shouldFetchNextPage,
} from "./FreshShortsRuntime";

describe("FreshShortsRuntime", () => {
  it("keeps a small media window around the active item", () => {
    expect([...getMediaWindow(5, 20)]).toEqual([3, 4, 5, 6, 7]);
    expect(FRESH_SHORTS_PREFETCH_RADIUS).toBe(2);
  });

  it("requests the next batch before the user reaches the end", () => {
    expect(shouldFetchNextPage(7, 12, true)).toBe(false);
    expect(shouldFetchNextPage(8, 12, true)).toBe(true);
    expect(shouldFetchNextPage(11, 12, false)).toBe(false);
  });

  it("selects the most visible item", () => {
    expect(getActiveIndex([
      { index: 1, ratio: 0.32 },
      { index: 2, ratio: 0.91 },
      { index: 3, ratio: 0.51 },
    ])).toBe(2);
  });
});

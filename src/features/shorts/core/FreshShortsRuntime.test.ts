import {
  FRESH_SHORTS_PREFETCH_RADIUS,
  getActiveIndex,
  getMediaWindow,
  getPreloadMode,
  isWithinMediaWindow,
  retryVideo,
  shouldFetchNextPage,
} from "./FreshShortsRuntime";

describe("FreshShortsRuntime", () => {
  it("keeps a small media window around the active item", () => {
    expect([...getMediaWindow(5, 20)]).toEqual([3, 4, 5, 6, 7]);
    expect(FRESH_SHORTS_PREFETCH_RADIUS).toBe(2);
    expect(isWithinMediaWindow(7, 5, 20)).toBe(true);
    expect(isWithinMediaWindow(8, 5, 20)).toBe(false);
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
    expect(getActiveIndex([{ index: -1, ratio: 1 }, { index: 4, ratio: 0.2 }])).toBe(4);
    expect(getActiveIndex([])).toBe(-1);
  });

  it("adapts preload to connection quality", () => {
    expect(getPreloadMode(4, 4, "fast")).toBe("auto");
    expect(getPreloadMode(5, 4, "fast")).toBe("auto");
    expect(getPreloadMode(5, 4, "slow")).toBe("metadata");
    expect(getPreloadMode(6, 4, "fast")).toBe("none");
  });

  it("bounds video retries", () => {
    const video = document.createElement("video");
    video.setAttribute("src", "/short.mp4");
    expect(retryVideo(video, 0, 2)).toBe(true);
    expect(retryVideo(video, 2, 2)).toBe(false);
    video.removeAttribute("src");
    expect(retryVideo(video, 0, 2)).toBe(false);
  });
});

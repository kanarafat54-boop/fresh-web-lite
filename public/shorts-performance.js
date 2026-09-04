/* Fresh Shorts performance layer
 * Keeps the current short ready and warms the next two without downloading the whole feed.
 * Uses only native media APIs so it works with the existing Shorts component.
 */
(function () {
  const ROOT_SELECTOR = ".shorts-scroll-container";
  const ITEM_SELECTOR = ".short-item";
  const VIDEO_SELECTOR = "video.short-video[data-short-id]";
  const NEARBY = 2;
  const FAR_PRELOAD = "metadata";
  const NEAR_PRELOAD = "auto";

  function connectionAllowsWarmup() {
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (!connection) return true;
    if (connection.saveData) return false;
    return !["slow-2g", "2g"].includes(connection.effectiveType);
  }

  function optimize(root) {
    const items = Array.from(root.querySelectorAll(ITEM_SELECTOR));
    if (!items.length) return;

    let activeIndex = 0;
    let best = -1;
    let bestRatio = 0;
    items.forEach((item, index) => {
      const video = item.querySelector(VIDEO_SELECTOR);
      if (!video) return;
      const rect = item.getBoundingClientRect();
      const viewport = Math.max(1, window.innerHeight);
      const visible = Math.max(0, Math.min(rect.bottom, viewport) - Math.max(rect.top, 0));
      const ratio = visible / Math.max(1, rect.height);
      if (ratio > bestRatio) {
        bestRatio = ratio;
        best = index;
      }
    });
    if (best >= 0) activeIndex = best;

    const canWarm = connectionAllowsWarmup();
    items.forEach((item, index) => {
      const video = item.querySelector(VIDEO_SELECTOR);
      if (!video) return;
      const distance = Math.abs(index - activeIndex);
      const shouldWarm = distance <= NEARBY && canWarm;
      const desired = shouldWarm ? NEAR_PRELOAD : FAR_PRELOAD;

      if (video.preload !== desired) {
        video.preload = desired;
        if (shouldWarm && video.readyState < HTMLMediaElement.HAVE_FUTURE_DATA) {
          try { video.load(); } catch (_) {}
        }
      }
    });
  }

  function attach(root) {
    let ticking = false;
    const schedule = function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        ticking = false;
        optimize(root);
      });
    };

    root.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });
    optimize(root);

    new MutationObserver(schedule).observe(root, { childList: true, subtree: true });
  }

  function scan() {
    document.querySelectorAll(ROOT_SELECTOR).forEach(function (root) {
      if (root.dataset.freshPerformanceAttached === "1") return;
      root.dataset.freshPerformanceAttached = "1";
      attach(root);
    });
  }

  scan();
  new MutationObserver(scan).observe(document.documentElement, { childList: true, subtree: true });
})();

/**
 * Production navigation runtime for the existing Shorts feed.
 * It enhances the existing DOM instead of replacing ShortsModule behavior.
 */
export type ShortsFeedNavigationOptions = {
  onActiveChange?: (index: number, shortId: string | null) => void;
};

export class ShortsFeedNavigationRuntime {
  private container: HTMLElement;
  private observer?: IntersectionObserver;
  private mutationObserver?: MutationObserver;
  private cleanupFns: Array<() => void> = [];
  private activeIndex = 0;
  private wheelLockUntil = 0;

  constructor(container: HTMLElement, options: ShortsFeedNavigationOptions = {}) {
    this.container = container;
    this.configureContainer();
    this.configureItems();
    this.installKeyboardNavigation();
    this.installWheelNavigation();
    this.installIntersectionTracking(options.onActiveChange);
    this.installMutationTracking();
  }

  private configureContainer() {
    this.container.style.scrollSnapType = "y mandatory";
    this.container.style.scrollBehavior = "smooth";
    this.container.style.overscrollBehaviorY = "contain";
    (this.container.style as CSSStyleDeclaration & { webkitOverflowScrolling?: string }).webkitOverflowScrolling = "touch";
    this.container.setAttribute("aria-label", "Fresh Shorts feed");
    this.container.setAttribute("role", "region");
  }

  private getItems(): HTMLElement[] {
    return Array.from(this.container.querySelectorAll<HTMLElement>(".short-item"));
  }

  private configureItems() {
    this.getItems().forEach((item, index) => {
      item.style.scrollSnapAlign = "start";
      item.style.scrollSnapStop = "always";
      item.setAttribute("role", "group");
      item.setAttribute("aria-label", `Short ${index + 1}`);
      item.dataset.feedIndex = String(index);
    });
  }

  private scrollToIndex(index: number) {
    const items = this.getItems();
    if (!items.length) return;
    const next = Math.max(0, Math.min(index, items.length - 1));
    this.activeIndex = next;
    items[next].scrollIntoView({ behavior: "smooth", block: "start" });
  }

  next() {
    this.scrollToIndex(this.activeIndex + 1);
  }

  previous() {
    this.scrollToIndex(this.activeIndex - 1);
  }

  private installKeyboardNavigation() {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.matches("input, textarea, select, [contenteditable='true']")) return;

      if (event.key === "ArrowDown" || event.key === "PageDown") {
        event.preventDefault();
        this.next();
      } else if (event.key === "ArrowUp" || event.key === "PageUp") {
        event.preventDefault();
        this.previous();
      } else if (event.key === "Home") {
        event.preventDefault();
        this.scrollToIndex(0);
      } else if (event.key === "End") {
        event.preventDefault();
        this.scrollToIndex(this.getItems().length - 1);
      }
    };

    window.addEventListener("keydown", handler, { passive: false });
    this.cleanupFns.push(() => window.removeEventListener("keydown", handler));
  }

  private installWheelNavigation() {
    const handler = (event: WheelEvent) => {
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
      const now = Date.now();
      if (now < this.wheelLockUntil) {
        event.preventDefault();
        return;
      }

      if (Math.abs(event.deltaY) < 18) return;
      event.preventDefault();
      this.wheelLockUntil = now + 650;
      if (event.deltaY > 0) this.next();
      else this.previous();
    };

    this.container.addEventListener("wheel", handler, { passive: false });
    this.cleanupFns.push(() => this.container.removeEventListener("wheel", handler));
  }

  private installIntersectionTracking(onActiveChange?: (index: number, shortId: string | null) => void) {
    const items = this.getItems();
    if (!items.length || typeof IntersectionObserver === "undefined") return;

    this.observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!visible) return;

        const item = visible.target as HTMLElement;
        const index = Number(item.dataset.feedIndex ?? 0);
        if (index === this.activeIndex && visible.intersectionRatio < 0.6) return;

        this.activeIndex = index;
        const video = item.querySelector<HTMLVideoElement>("video[data-short-id]");
        onActiveChange?.(index, video?.dataset.shortId ?? null);
      },
      { root: this.container, threshold: [0.6, 0.9] }
    );

    items.forEach((item) => this.observer?.observe(item));
  }

  private installMutationTracking() {
    if (typeof MutationObserver === "undefined") return;
    this.mutationObserver = new MutationObserver(() => this.refresh());
    this.mutationObserver.observe(this.container, { childList: true });
    this.cleanupFns.push(() => this.mutationObserver?.disconnect());
  }

  refresh() {
    this.configureItems();
    const items = this.getItems();
    items.forEach((item) => this.observer?.observe(item));
  }

  destroy() {
    this.observer?.disconnect();
    this.mutationObserver?.disconnect();
    this.cleanupFns.splice(0).forEach((cleanup) => cleanup());
  }
}

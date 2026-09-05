import { useEffect, useState } from 'react';

// Observes children of a root container and returns the index of the most visible item.
export function useVisibleIndex(rootId: string) {
  const [visibleIndex, setVisibleIndex] = useState<number | null>(null);

  useEffect(() => {
    const root = document.getElementById(rootId);
    if (!root) return;

    const items: Element[] = Array.from(root.querySelectorAll('.short-item'));
    if (items.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Find the intersecting entry with the largest intersectionRatio
        const visibleEntries = entries.filter((e) => e.isIntersecting);
        if (visibleEntries.length === 0) return;
        visibleEntries.sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        const top = visibleEntries[0];
        const idx = items.indexOf(top.target);
        if (idx !== -1) setVisibleIndex(idx);
      },
      { root, threshold: [0.25, 0.5, 0.75, 1.0] }
    );

    items.forEach((it) => observer.observe(it));
    return () => observer.disconnect();
  }, [rootId]);

  return visibleIndex;
}

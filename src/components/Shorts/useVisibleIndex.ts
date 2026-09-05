import { useEffect, useState } from 'react';

// Observes children of a root container and returns the index of the most visible item.
export function useVisibleIndex(rootId: string, deps: unknown[] = []) {
  const [visibleIndex, setVisibleIndex] = useState<number | null>(null);

  useEffect(() => {
    const root = document.getElementById(rootId);
    if (!root) return;

    const items: Element[] = Array.from(root.querySelectorAll('.short-item'));
    if (items.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntries = entries.filter((e) => e.isIntersecting);
        if (visibleEntries.length === 0) return;
        visibleEntries.sort((a, b) => b.intersectionRatio - a.intersectionRatio);
        const top = visibleEntries[0];
        const idx = items.indexOf(top.target);
        if (idx >= 0) setVisibleIndex(idx);
      },
      { root, threshold: [0.25, 0.5, 0.75, 0.9] }
    );

    items.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rootId, ...deps]);

  return visibleIndex;
}

import React, { useEffect } from 'react';
import FeedContainer from './FeedContainer';
import ShortItem from './ShortItem';
import { useVisibleIndex } from './useVisibleIndex';
import { useVideoPool } from './useVideoPool';
import VideoPlayerSlot from './VideoPlayerSlot';

type ExampleShort = { id: string; title?: string; poster?: string; mediaUrl?: string };

const SAMPLE: ExampleShort[] = Array.from({ length: 8 }).map((_, i) => ({
  id: `short-${i}`,
  title: `Demo Short ${i + 1}`,
  poster: undefined,
  mediaUrl: undefined,
}));

export default function ShortsDemo({ items = SAMPLE }: { items?: ExampleShort[] }) {
  const visible = useVisibleIndex('fresh-shorts-feed');
  const { poolRef, assign, releaseIndex, getSlotForIndex } = useVideoPool(3);

  // simple windowing: keep visible, visible+1, visible-1 assigned
  useEffect(() => {
    if (visible == null) return;
    const indicesToKeep = new Set<number>([visible, visible - 1, visible + 1]);

    // assign pool slots naively: slot 0 -> visible, 1 -> prev, 2 -> next
    const mapping = [visible, visible - 1, visible + 1];
    mapping.forEach((idx, slotIdx) => {
      const item = items[idx];
      if (!item) return;
      if (item.mediaUrl) assign(slotIdx, item.mediaUrl, idx);
    });

    // release others
    poolRef.current.forEach((s) => {
      if (s.index == null) return;
      if (!indicesToKeep.has(s.index)) releaseIndex(s.index);
    });
  }, [visible, items, assign, releaseIndex, poolRef]);

  return (
    <FeedContainer>
      {items.map((it, i) => {
        const slot = poolRef.current.find((s) => s.index === i) ?? null;
        return (
          <div key={it.id} style={{ height: '100vh', width: '100vw' }}>
            <ShortItem index={i} title={it.title} poster={it.poster}>
              {/* If a pool slot is mounted for this index, render its video */}
              {slot ? <VideoPlayerSlot slot={slot} /> : <div style={{ padding: 16 }}>{it.title}</div>}
            </ShortItem>
          </div>
        );
      })}
    </FeedContainer>
  );
}

import React, { useEffect } from 'react';
import FeedContainer from './FeedContainer';
import ShortItem from './ShortItem';
import { useVisibleIndex } from './useVisibleIndex';

type ExampleShort = { id: string; title?: string; poster?: string; mediaUrl?: string };

const SAMPLE: ExampleShort[] = Array.from({ length: 8 }).map((_, i) => ({
  id: `short-${i}`,
  title: `Demo Short ${i + 1}`,
  poster: undefined,
  mediaUrl: undefined,
}));

export default function ShortsDemo({ items = SAMPLE }: { items?: ExampleShort[] }) {
  const visible = useVisibleIndex('fresh-shorts-feed');

  useEffect(() => {
    if (visible != null) console.log('visible', visible);
  }, [visible]);

  return (
    <FeedContainer>
      {items.map((it, i) => (
        <div key={it.id} style={{ height: '100vh', width: '100vw' }}>
          <ShortItem index={i} title={it.title} poster={it.poster}>
            <div style={{ padding: 16 }}>{it.title}</div>
          </ShortItem>
        </div>
      ))}
    </FeedContainer>
  );
}

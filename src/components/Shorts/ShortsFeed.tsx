import React from 'react';
import FeedContainer from './FeedContainer';
import ShortItem, { Short } from './ShortItem';
import { useVisibleIndex } from './useVisibleIndex';
import './index.css';

export default function ShortsFeed({ shorts }: { shorts: Short[] }) {
  const visibleIndex = useVisibleIndex('fresh-shorts-feed', [shorts.length]);

  return (
    <FeedContainer>
      {shorts.map((s, i) => (
        <ShortItem key={s.id} short={s} active={visibleIndex === i} />
      ))}
    </FeedContainer>
  );
}

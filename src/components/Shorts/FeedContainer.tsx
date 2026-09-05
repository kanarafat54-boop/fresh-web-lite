import React from 'react';

export default function FeedContainer({ children }: { children: React.ReactNode }) {
  return (
    <div
      id="fresh-shorts-feed"
      style={{
        height: '100vh',
        width: '100vw',
        overflowY: 'auto',
        scrollSnapType: 'y mandatory' as any,
        WebkitOverflowScrolling: 'touch',
      }}
    >
      {children}
    </div>
  );
}

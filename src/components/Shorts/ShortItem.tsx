import React from 'react';

type Props = {
  index: number;
  title?: string;
  poster?: string;
  children?: React.ReactNode;
};

export default function ShortItem({ index, title, poster, children }: Props) {
  return (
    <div
      className="short-item"
      data-short-index={index}
      style={{
        height: '100vh',
        width: '100vw',
        scrollSnapAlign: 'start' as any,
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#000',
        color: '#fff',
      }}
    >
      <div style={{ position: 'absolute', inset: 0 }}>
        {poster ? (
          <img
            src={poster}
            alt={title || `short-${index}`}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : null}
      </div>

      <div style={{ position: 'relative', zIndex: 2, textAlign: 'center' }}>
        {children ?? <h2>{title ?? `Short ${index + 1}`}</h2>}
      </div>
    </div>
  );
}

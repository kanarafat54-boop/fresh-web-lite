import React, { useEffect, useRef } from 'react';

export type Short = {
  id: string;
  src: string;
  poster?: string;
  title?: string;
  author?: string;
};

export default function ShortItem({
  short,
  active,
  muted = true,
}: {
  short: Short;
  active: boolean;
  muted?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (active) {
      v.play().catch(() => {
        /* autoplay blocked; ignore */
      });
    } else {
      v.pause();
      v.currentTime = 0;
    }
  }, [active]);

  return (
    <section
      className="short-item"
      data-id={short.id}
      style={{
        height: '100vh',
        width: '100%',
        scrollSnapAlign: 'start',
        position: 'relative',
        background: '#000',
      }}
    >
      <video
        ref={videoRef}
        src={short.src}
        poster={short.poster}
        muted={muted}
        loop
        playsInline
        preload="metadata"
        style={{ height: '100%', width: '100%', objectFit: 'cover' }}
      />
      <div className="short-overlay">
        <div className="short-title">{short.title}</div>
        {short.author && <div className="short-author">@{short.author}</div>}
      </div>
    </section>
  );
}

import React, { useEffect, useRef } from 'react';

export default function VideoPlayerSlot({ slot }: { slot: any | null }) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.innerHTML = '';
    if (slot && slot.el) {
      container.appendChild(slot.el);
    }
    return () => {
      if (slot && slot.el && container.contains(slot.el)) {
        container.removeChild(slot.el);
      }
    };
  }, [slot]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
}

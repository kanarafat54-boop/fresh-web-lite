import { useEffect, useRef } from 'react';

type PoolSlot = {
  el: HTMLVideoElement;
  index?: number;
  status: 'idle' | 'loading' | 'ready' | 'error';
};

export function useVideoPool(poolSize = 3) {
  const poolRef = useRef<PoolSlot[]>([]);

  useEffect(() => {
    poolRef.current = Array.from({ length: poolSize }).map(() => {
      const v = document.createElement('video');
      v.playsInline = true;
      v.muted = true;
      v.preload = 'metadata';
      v.style.width = '100%';
      v.style.height = '100%';
      v.style.objectFit = 'cover';
      return { el: v, status: 'idle' } as PoolSlot;
    });

    return () => {
      poolRef.current.forEach((s) => {
        try {
          s.el.pause();
          s.el.src = '';
          s.el.removeAttribute('src');
          s.el.load();
        } catch (e) {
          // ignore
        }
      });
      poolRef.current = [];
    };
  }, [poolSize]);

  const assign = (slotIndex: number, mediaUrl: string, index: number) => {
    const slot = poolRef.current[slotIndex];
    if (!slot) return;
    if (slot.index === index && slot.el.getAttribute('data-src') === mediaUrl) return;
    slot.status = 'loading';
    slot.el.setAttribute('data-src', mediaUrl);
    slot.el.src = mediaUrl;
    slot.el.load();
    const onCanPlay = () => {
      slot.status = 'ready';
      slot.el.removeEventListener('canplay', onCanPlay);
    };
    slot.el.addEventListener('canplay', onCanPlay);
    slot.index = index;
  };

  const releaseIndex = (index: number) => {
    const slot = poolRef.current.find((s) => s.index === index);
    if (!slot) return;
    try {
      slot.el.pause();
      slot.el.src = '';
      slot.el.removeAttribute('src');
      slot.el.load();
    } catch (e) {
      // ignore
    }
    slot.index = undefined;
    slot.status = 'idle';
  };

  const getSlotForIndex = (index: number) => poolRef.current.find((s) => s.index === index) ?? null;

  return { poolRef, assign, releaseIndex, getSlotForIndex };
}

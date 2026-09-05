[1mdiff --git a/src/components/Shorts/FeedContainer.tsx b/src/components/Shorts/FeedContainer.tsx[m
[1mnew file mode 100644[m
[1mindex 0000000..579da42[m
[1m--- /dev/null[m
[1m+++ b/src/components/Shorts/FeedContainer.tsx[m
[36m@@ -0,0 +1,18 @@[m
[32m+[m[32mimport React from 'react';[m
[32m+[m
[32m+[m[32mexport default function FeedContainer({ children }: { children: React.ReactNode }) {[m
[32m+[m[32m  return ([m
[32m+[m[32m    <div[m
[32m+[m[32m      id="fresh-shorts-feed"[m
[32m+[m[32m      style={{[m
[32m+[m[32m        height: '100vh',[m
[32m+[m[32m        width: '100vw',[m
[32m+[m[32m        overflowY: 'auto',[m
[32m+[m[32m        scrollSnapType: 'y mandatory' as any,[m
[32m+[m[32m        WebkitOverflowScrolling: 'touch',[m
[32m+[m[32m      }}[m
[32m+[m[32m    >[m
[32m+[m[32m      {children}[m
[32m+[m[32m    </div>[m
[32m+[m[32m  );[m
[32m+[m[32m}[m
[1mdiff --git a/src/components/Shorts/ShortItem.tsx b/src/components/Shorts/ShortItem.tsx[m
[1mnew file mode 100644[m
[1mindex 0000000..8f5b0c9[m
[1m--- /dev/null[m
[1m+++ b/src/components/Shorts/ShortItem.tsx[m
[36m@@ -0,0 +1,63 @@[m
[32m+[m[32mimport React, { useEffect, useRef } from 'react';[m
[32m+[m
[32m+[m[32mexport type Short = {[m
[32m+[m[32m  id: string;[m
[32m+[m[32m  src: string;[m
[32m+[m[32m  poster?: string;[m
[32m+[m[32m  title?: string;[m
[32m+[m[32m  author?: string;[m
[32m+[m[32m};[m
[32m+[m
[32m+[m[32mexport default function ShortItem({[m
[32m+[m[32m  short,[m
[32m+[m[32m  active,[m
[32m+[m[32m  muted = true,[m
[32m+[m[32m}: {[m
[32m+[m[32m  short: Short;[m
[32m+[m[32m  active: boolean;[m
[32m+[m[32m  muted?: boolean;[m
[32m+[m[32m}) {[m
[32m+[m[32m  const videoRef = useRef<HTMLVideoElement | null>(null);[m
[32m+[m
[32m+[m[32m  useEffect(() => {[m
[32m+[m[32m    const v = videoRef.current;[m
[32m+[m[32m    if (!v) return;[m
[32m+[m[32m    if (active) {[m
[32m+[m[32m      v.play().catch(() => {[m
[32m+[m[32m        /* autoplay blocked; ignore */[m
[32m+[m[32m      });[m
[32m+[m[32m    } else {[m
[32m+[m[32m      v.pause();[m
[32m+[m[32m      v.currentTime = 0;[m
[32m+[m[32m    }[m
[32m+[m[32m  }, [active]);[m
[32m+[m
[32m+[m[32m  return ([m
[32m+[m[32m    <section[m
[32m+[m[32m      className="short-item"[m
[32m+[m[32m      data-id={short.id}[m
[32m+[m[32m      style={{[m
[32m+[m[32m        height: '100vh',[m
[32m+[m[32m        width: '100%',[m
[32m+[m[32m        scrollSnapAlign: 'start',[m
[32m+[m[32m        position: 'relative',[m
[32m+[m[32m        background: '#000',[m
[32m+[m[32m      }}[m
[32m+[m[32m    >[m
[32m+[m[32m      <video[m
[32m+[m[32m        ref={videoRef}[m
[32m+[m[32m        src={short.src}[m
[32m+[m[32m        poster={short.poster}[m
[32m+[m[32m        muted={muted}[m
[32m+[m[32m        loop[m
[32m+[m[32m        playsInline[m
[32m+[m[32m        preload="metadata"[m
[32m+[m[32m        style={{ height: '100%', width: '100%', objectFit: 'cover' }}[m
[32m+[m[32m      />[m
[32m+[m[32m      <div className="short-overlay">[m
[32m+[m[32m        <div className="short-title">{short.title}</div>[m
[32m+[m[32m        {short.author && <div className="short-author">@{short.author}</div>}[m
[32m+[m[32m      </div>[m
[32m+[m[32m    </section>[m
[32m+[m[32m  );[m
[32m+[m[32m}[m
[1mdiff --git a/src/components/Shorts/ShortsDemo.tsx b/src/components/Shorts/ShortsDemo.tsx[m
[1mnew file mode 100644[m
[1mindex 0000000..c562fb4[m
[1m--- /dev/null[m
[1m+++ b/src/components/Shorts/ShortsDemo.tsx[m
[36m@@ -0,0 +1,33 @@[m
[32m+[m[32mimport React, { useEffect } from 'react';[m
[32m+[m[32mimport FeedContainer from './FeedContainer';[m
[32m+[m[32mimport ShortItem from './ShortItem';[m
[32m+[m[32mimport { useVisibleIndex } from './useVisibleIndex';[m
[32m+[m
[32m+[m[32mtype ExampleShort = { id: string; title?: string; poster?: string; mediaUrl?: string };[m
[32m+[m
[32m+[m[32mconst SAMPLE: ExampleShort[] = Array.from({ length: 8 }).map((_, i) => ({[m
[32m+[m[32m  id: `short-${i}`,[m
[32m+[m[32m  title: `Demo Short ${i + 1}`,[m
[32m+[m[32m  poster: undefined,[m
[32m+[m[32m  mediaUrl: undefined,[m
[32m+[m[32m}));[m
[32m+[m
[32m+[m[32mexport default function ShortsDemo({ items = SAMPLE }: { items?: ExampleShort[] }) {[m
[32m+[m[32m  const visible = useVisibleIndex('fresh-shorts-feed');[m
[32m+[m
[32m+[m[32m  useEffect(() => {[m
[32m+[m[32m    if (visible != null) console.log('visible', visible);[m
[32m+[m[32m  }, [visible]);[m
[32m+[m
[32m+[m[32m  return ([m
[32m+[m[32m    <FeedContainer>[m
[32m+[m[32m      {items.map((it, i) => ([m
[32m+[m[32m        <div key={it.id} style={{ height: '100vh', width: '100vw' }}>[m
[32m+[m[32m          <ShortItem index={i} title={it.title} poster={it.poster}>[m
[32m+[m[32m            <div style={{ padding: 16 }}>{it.title}</div>[m
[32m+[m[32m          </ShortItem>[m
[32m+[m[32m        </div>[m
[32m+[m[32m      ))}[m
[32m+[m[32m    </FeedContainer>[m
[32m+[m[32m  );[m
[32m+[m[32m}[m
[1mdiff --git a/src/components/Shorts/ShortsFeed.tsx b/src/components/Shorts/ShortsFeed.tsx[m
[1mnew file mode 100644[m
[1mindex 0000000..46170c0[m
[1m--- /dev/null[m
[1m+++ b/src/components/Shorts/ShortsFeed.tsx[m
[36m@@ -0,0 +1,17 @@[m
[32m+[m[32mimport React from 'react';[m
[32m+[m[32mimport FeedContainer from './FeedContainer';[m
[32m+[m[32mimport ShortItem, { Short } from './ShortItem';[m
[32m+[m[32mimport { useVisibleIndex } from './useVisibleIndex';[m
[32m+[m[32mimport './index.css';[m
[32m+[m
[32m+[m[32mexport default function ShortsFeed({ shorts }: { shorts: Short[] }) {[m
[32m+[m[32m  const visibleIndex = useVisibleIndex('fresh-shorts-feed', [shorts.length]);[m
[32m+[m
[32m+[m[32m  return ([m
[32m+[m[32m    <FeedContainer>[m
[32m+[m[32m      {shorts.map((s, i) => ([m
[32m+[m[32m        <ShortItem key={s.id} short={s} active={visibleIndex === i} />[m
[32m+[m[32m      ))}[m
[32m+[m[32m    </FeedContainer>[m
[32m+[m[32m  );[m
[32m+[m[32m}[m
[1mdiff --git a/src/components/Shorts/VideoPlayerSlot.tsx b/src/components/Shorts/VideoPlayerSlot.tsx[m
[1mnew file mode 100644[m
[1mindex 0000000..9a41af1[m
[1m--- /dev/null[m
[1m+++ b/src/components/Shorts/VideoPlayerSlot.tsx[m
[36m@@ -0,0 +1,21 @@[m
[32m+[m[32mimport React, { useEffect, useRef } from 'react';[m
[32m+[m
[32m+[m[32mexport default function VideoPlayerSlot({ slot }: { slot: any | null }) {[m
[32m+[m[32m  const containerRef = useRef<HTMLDivElement | null>(null);[m
[32m+[m
[32m+[m[32m  useEffect(() => {[m
[32m+[m[32m    const container = containerRef.current;[m
[32m+[m[32m    if (!container) return;[m
[32m+[m[32m    container.innerHTML = '';[m
[32m+[m[32m    if (slot && slot.el) {[m
[32m+[m[32m      container.appendChild(slot.el);[m
[32m+[m[32m    }[m
[32m+[m[32m    return () => {[m
[32m+[m[32m      if (slot && slot.el && container.contains(slot.el)) {[m
[32m+[m[32m        container.removeChild(slot.el);[m
[32m+[m[32m      }[m
[32m+[m[32m    };[m
[32m+[m[32m  }, [slot]);[m
[32m+[m
[32m+[m[32m  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;[m
[32m+[m[32m}[m
[1mdiff --git a/src/components/Shorts/index.css b/src/components/Shorts/index.css[m
[1mnew file mode 100644[m
[1mindex 0000000..8ad77e6[m
[1m--- /dev/null[m
[1m+++ b/src/components/Shorts/index.css[m
[36m@@ -0,0 +1,28 @@[m
[32m+[m[32m#fresh-shorts-feed {[m
[32m+[m[32m  scrollbar-width: none;[m
[32m+[m[32m}[m
[32m+[m
[32m+[m[32m#fresh-shorts-feed::-webkit-scrollbar {[m
[32m+[m[32m  display: none;[m
[32m+[m[32m}[m
[32m+[m
[32m+[m[32m.short-overlay {[m
[32m+[m[32m  position: absolute;[m
[32m+[m[32m  left: 16px;[m
[32m+[m[32m  bottom: 32px;[m
[32m+[m[32m  right: 16px;[m
[32m+[m[32m  color: #fff;[m
[32m+[m[32m  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.6);[m
[32m+[m[32m  pointer-events: none;[m
[32m+[m[32m}[m
[32m+[m
[32m+[m[32m.short-title {[m
[32m+[m[32m  font-size: 16px;[m
[32m+[m[32m  font-weight: 700;[m
[32m+[m[32m}[m
[32m+[m
[32m+[m[32m.short-author {[m
[32m+[m[32m  font-size: 13px;[m
[32m+[m[32m  opacity: 0.85;[m
[32m+[m[32m  margin-top: 4px;[m
[32m+[m[32m}[m
[1mdiff --git a/src/components/Shorts/useVideoPool.ts b/src/components/Shorts/useVideoPool.ts[m
[1mnew file mode 100644[m
[1mindex 0000000..02845a3[m
[1m--- /dev/null[m
[1m+++ b/src/components/Shorts/useVideoPool.ts[m
[36m@@ -0,0 +1,76 @@[m
[32m+[m[32mimport { useEffect, useRef } from 'react';[m
[32m+[m
[32m+[m[32mtype PoolSlot = {[m
[32m+[m[32m  el: HTMLVideoElement;[m
[32m+[m[32m  index?: number;[m
[32m+[m[32m  status: 'idle' | 'loading' | 'ready' | 'error';[m
[32m+[m[32m};[m
[32m+[m
[32m+[m[32mexport function useVideoPool(poolSize = 3) {[m
[32m+[m[32m  const poolRef = useRef<PoolSlot[]>([]);[m
[32m+[m
[32m+[m[32m  useEffect(() => {[m
[32m+[m[32m    poolRef.current = Array.from({ length: poolSize }).map(() => {[m
[32m+[m[32m      const v = document.createElement('video');[m
[32m+[m[32m      v.playsInline = true;[m
[32m+[m[32m      v.muted = true;[m
[32m+[m[32m      v.preload = 'metadata';[m
[32m+[m[32m      v.style.width = '100%';[m
[32m+[m[32m      v.style.height = '100%';[m
[32m+[m[32m      v.style.objectFit = 'cover';[m
[32m+[m[32m      return { el: v, status: 'idle' } as PoolSlot;[m
[32m+[m[32m    });[m
[32m+[m
[32m+[m[32m    return () => {[m
[32m+[m[32m      poolRef.current.forEach((s) => {[m
[32m+[m[32m        try {[m
[32m+[m[32m          s.el.pause();[m
[32m+[m[32m          s.el.src = '';[m
[32m+[m[32m          s.el.removeAttribute('src');[m
[32m+[m[32m          // eslint-disable-next-line @typescript-eslint/no-explicit-any[m
[32m+[m[32m          (s.el as any).load?.();[m
[32m+[m[32m        } catch (e) {[m
[32m+[m[32m          // ignore[m
[32m+[m[32m        }[m
[32m+[m[32m      });[m
[32m+[m[32m      poolRef.current = [];[m
[32m+[m[32m    };[m
[32m+[m[32m  }, [poolSize]);[m
[32m+[m
[32m+[m[32m  const assign = (slotIndex: number, mediaUrl: string, index: number) => {[m
[32m+[m[32m    const slot = poolRef.current[slotIndex];[m
[32m+[m[32m    if (!slot) return;[m
[32m+[m[32m    if (slot.index === index && slot.el.getAttribute('data-src') === mediaUrl) return;[m
[32m+[m[32m    slot.status = 'loading';[m
[32m+[m[32m    slot.el.setAttribute('data-src', mediaUrl);[m
[32m+[m[32m    slot.el.src = mediaUrl;[m
[32m+[m[32m    // eslint-disable-next-line @typescript-eslint/no-explicit-any[m
[32m+[m[32m    (slot.el as any).load?.();[m
[32m+[m[32m    const onCanPlay = () => {[m
[32m+[m[32m      slot.status = 'ready';[m
[32m+[m[32m      slot.el.removeEventListener('canplay', onCanPlay);[m
[32m+[m[32m    };[m
[32m+[m[32m    slot.el.addEventListener('canplay', onCanPlay);[m
[32m+[m[32m    slot.index = index;[m
[32m+[m[32m  };[m
[32m+[m
[32m+[m[32m  const releaseIndex = (index: number) => {[m
[32m+[m[32m    const slot = poolRef.current.find((s) => s.index === index);[m
[32m+[m[32m    if (!slot) return;[m
[32m+[m[32m    try {[m
[32m+[m[32m      slot.el.pause();[m
[32m+[m[32m      slot.el.src = '';[m
[32m+[m[32m      slot.el.removeAttribute('src');[m
[32m+[m[32m      // eslint-disable-next-line @typescript-eslint/no-explicit-any[m
[32m+[m[32m      (slot.el as any).load?.();[m
[32m+[m[32m    } catch (e) {[m
[32m+[m[32m      // ignore[m
[32m+[m[32m    }[m
[32m+[m[32m    slot.index = undefined;[m
[32m+[m[32m    slot.status = 'idle';[m
[32m+[m[32m  };[m
[32m+[m
[32m+[m[32m  const getSlotForIndex = (index: number) => poolRef.current.find((s) => s.index === index) ?? null;[m
[32m+[m
[32m+[m[32m  return { poolRef, assign, releaseIndex, getSlotForIndex };[m
[32m+[m[32m}[m
[1mdiff --git a/src/components/Shorts/useVisibleIndex.ts b/src/components/Shorts/useVisibleIndex.ts[m
[1mnew file mode 100644[m
[1mindex 0000000..4414553[m
[1m--- /dev/null[m
[1m+++ b/src/components/Shorts/useVisibleIndex.ts[m
[36m@@ -0,0 +1,32 @@[m
[32m+[m[32mimport { useEffect, useState } from 'react';[m
[32m+[m
[32m+[m[32m// Observes children of a root container and returns the index of the most visible item.[m
[32m+[m[32mexport function useVisibleIndex(rootId: string, deps: unknown[] = []) {[m
[32m+[m[32m  const [visibleIndex, setVisibleIndex] = useState<number | null>(null);[m
[32m+[m
[32m+[m[32m  useEffect(() => {[m
[32m+[m[32m    const root = document.getElementById(rootId);[m
[32m+[m[32m    if (!root) return;[m
[32m+[m
[32m+[m[32m    const items: Element[] = Array.from(root.querySelectorAll('.short-item'));[m
[32m+[m[32m    if (items.length === 0) return;[m
[32m+[m
[32m+[m[32m    const observer = new IntersectionObserver([m
[32m+[m[32m      (entries) => {[m
[32m+[m[32m        const visibleEntries = entries.filter((e) => e.isIntersecting);[m
[32m+[m[32m        if (visibleEntries.length === 0) return;[m
[32m+[m[32m        visibleEntries.sort((a, b) => b.intersectionRatio - a.intersectionRatio);[m
[32m+[m[32m        const top = visibleEntries[0];[m
[32m+[m[32m        const idx = items.indexOf(top.target);[m
[32m+[m[32m        if (idx >= 0) setVisibleIndex(idx);[m
[32m+[m[32m      },[m
[32m+[m[32m      { root, threshold: [0.25, 0.5, 0.75, 0.9] }[m
[32m+[m[32m    );[m
[32m+[m
[32m+[m[32m    items.forEach((el) => observer.observe(el));[m
[32m+[m[32m    return () => observer.disconnect();[m
[32m+[m[32m    // eslint-disable-next-line react-hooks/exhaustive-deps[m
[32m+[m[32m  }, [rootId, ...deps]);[m
[32m+[m
[32m+[m[32m  return visibleIndex;[m
[32m+[m[32m}[m

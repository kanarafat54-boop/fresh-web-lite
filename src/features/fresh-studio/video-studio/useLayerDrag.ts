import { useCallback, useRef, useState, type PointerEvent as RPointerEvent, type RefObject } from "react";
import * as T from "./timeline.ts";

export type LiveLayer = { id: string; x: number; y: number; width?: number; height?: number };
type Kind = "text" | "overlay" | "clip";
type Mode = "move" | "resize";
type Gesture = { id: string; kind: Kind; mode: Mode; startX: number; startY: number; orig: LiveLayer; rect: DOMRect; moved: boolean };

const SNAP = 0.02;
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
const snap = (v: number) => (Math.abs(v - 0.5) < SNAP ? 0.5 : v);

/**
 * Dragging layers in the preview. While the pointer is down the layer follows it from local state; one history
 * entry is made when it is released, so a drag is a single undo step. Layers snap to the centre lines.
 */
export function useLayerDrag(frame: RefObject<HTMLElement | null>, doc: T.TimelineDoc, edit: (fn: (d: T.TimelineDoc) => T.TimelineDoc) => boolean, select: (id: string) => void) {
  const [live, setLive] = useState<LiveLayer | null>(null);
  const [guides, setGuides] = useState<{ x: boolean; y: boolean }>({ x: false, y: false });
  const gesture = useRef<Gesture | null>(null);

  const begin = useCallback((e: RPointerEvent, id: string, kind: Kind, mode: Mode = "move") => {
    const el = frame.current;
    const layer = kind === "text" ? doc.texts?.find((t) => t.id === id) : kind === "clip" ? doc.clips.find((c) => c.id === id)?.layer : doc.overlays?.find((o) => o.id === id);
    if (!el || !layer) return;
    e.stopPropagation(); e.preventDefault();
    select(id);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const orig: LiveLayer = { id, x: layer.x, y: layer.y, ...("width" in layer ? { width: layer.width } : {}), ...("height" in layer ? { height: layer.height } : {}) };
    gesture.current = { id, kind, mode, startX: e.clientX, startY: e.clientY, orig, rect: el.getBoundingClientRect(), moved: false };
  }, [frame, doc, select]);

  const move = useCallback((e: RPointerEvent) => {
    const g = gesture.current; if (!g || g.rect.width === 0) return;
    const dx = (e.clientX - g.startX) / g.rect.width, dy = (e.clientY - g.startY) / g.rect.height;
    if (!g.moved && Math.hypot(e.clientX - g.startX, e.clientY - g.startY) < 3) return; // a tap is not a drag
    g.moved = true;
    let next: LiveLayer;
    if (g.mode === "move") {
      const x = snap(clamp(g.orig.x + dx, 0, 1)), y = snap(clamp(g.orig.y + dy, 0, 1));
      next = { ...g.orig, x, y };
      setGuides({ x: x === 0.5, y: y === 0.5 });
    } else {
      // The layer is centred, so dragging its corner by d changes the width by 2d.
      next = { ...g.orig, width: clamp((g.orig.width ?? 0.2) + dx * 2, g.kind === "clip" ? T.MIN_LAYER_WIDTH : 0.02, 1), ...(g.orig.height !== undefined ? { height: clamp(g.orig.height + dy * 2, 0.02, 1) } : {}) };
    }
    setLive(next);
  }, []);

  const end = useCallback(() => {
    const g = gesture.current; gesture.current = null;
    setGuides({ x: false, y: false });
    setLive((cur) => {
      if (g && g.moved && cur) {
        const r = (n: number) => Math.round(n * 1000) / 1000;
        const patch = { x: r(cur.x), y: r(cur.y), ...(cur.width !== undefined ? { width: r(cur.width) } : {}), ...(cur.height !== undefined ? { height: r(cur.height) } : {}) };
        queueMicrotask(() => edit((d) => (g.kind === "text" ? T.updateText(d, g.id, { x: patch.x, y: patch.y }) : g.kind === "clip" ? T.setClipLayer(d, g.id, { x: patch.x, y: patch.y, ...(patch.width !== undefined ? { width: Math.max(T.MIN_LAYER_WIDTH, patch.width) } : {}) }) : T.updateOverlay(d, g.id, patch))));
      }
      return null;
    });
  }, [edit]);

  return { live, guides, begin, move, end };
}

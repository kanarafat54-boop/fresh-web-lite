import { useRef, useState, type PointerEvent as RPointerEvent } from "react";
import * as T from "./timeline.ts";

type Props = {
  doc: T.TimelineDoc;
  selected: string | null;
  playhead: number;
  pxPerSec: number;
  onSelect: (id: string | null) => void;
  onSeek: (t: number) => void;
  edit: (fn: (d: T.TimelineDoc) => T.TimelineDoc) => boolean;
};
type Drag = { id: string; mode: "move" | "trimStart" | "trimEnd"; startX: number; origStart: number; origEnd: number; start: number; end: number };

const SNAP_PX = 8;
export const TRACK_H = 52;

export function formatClock(seconds: number): string {
  const s = Math.max(0, seconds);
  const m = Math.floor(s / 60);
  return `${m}:${(s - m * 60).toFixed(1).padStart(4, "0")}`;
}

export default function Timeline({ doc, selected, playhead, pxPerSec, onSelect, onSeek, edit }: Props) {
  const [drag, setDrag] = useState<Drag | null>(null);
  const dragRef = useRef<Drag | null>(null);
  const duration = Math.max(T.timelineDuration(doc), 10);
  const width = Math.ceil((duration + 5) * pxPerSec);
  const tracks = doc.tracks.filter((t) => T.SUPPORTED_TRACK_KINDS.includes(t.kind));

  const snap = (value: number, ignoreId: string) => {
    const points = [0, playhead, ...doc.clips.filter((c) => c.id !== ignoreId).flatMap((c) => [c.start, T.clipEnd(c)])];
    let best = value, bestDist = SNAP_PX / pxPerSec;
    for (const p of points) { const d = Math.abs(p - value); if (d < bestDist) { best = p; bestDist = d; } }
    return T.round3(best);
  };

  const begin = (e: RPointerEvent, clip: T.TimelineClip, mode: Drag["mode"]) => {
    const track = doc.tracks.find((t) => t.id === clip.trackId);
    e.stopPropagation();
    onSelect(clip.id);
    if (track?.locked) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const d: Drag = { id: clip.id, mode, startX: e.clientX, origStart: clip.start, origEnd: T.clipEnd(clip), start: clip.start, end: T.clipEnd(clip) };
    dragRef.current = d; setDrag(d);
  };
  const move = (e: RPointerEvent) => {
    const d = dragRef.current; if (!d) return;
    const dt = (e.clientX - d.startX) / pxPerSec;
    const next = { ...d };
    if (d.mode === "move") { next.start = Math.max(0, snap(d.origStart + dt, d.id)); next.end = T.round3(next.start + (d.origEnd - d.origStart)); }
    else if (d.mode === "trimStart") next.start = snap(Math.min(d.origEnd - T.MIN_CLIP_SECONDS, Math.max(0, d.origStart + dt)), d.id);
    else next.end = snap(Math.max(d.origStart + T.MIN_CLIP_SECONDS, d.origEnd + dt), d.id);
    dragRef.current = next; setDrag(next);
  };
  const finish = () => {
    const d = dragRef.current; dragRef.current = null; setDrag(null);
    if (!d) return;
    if (Math.abs(d.start - d.origStart) < 0.005 && Math.abs(d.end - d.origEnd) < 0.005) return;
    edit((doc0) => d.mode === "move" ? T.moveClip(doc0, d.id, d.start) : d.mode === "trimStart" ? T.trimClipStart(doc0, d.id, d.start) : T.trimClipEnd(doc0, d.id, d.end));
  };

  const seek = (e: RPointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    onSeek(Math.max(0, (e.clientX - rect.left) / pxPerSec));
  };

  const ticks: number[] = [];
  const step = pxPerSec >= 80 ? 1 : pxPerSec >= 30 ? 5 : 10;
  for (let t = 0; t <= duration + 5; t += step) ticks.push(t);

  return (
    <div className="fs-tl" role="group" aria-label="Timeline">
      <div className="fs-tl-labels" aria-hidden="false">
        <div className="fs-tl-ruler-label" />
        {tracks.map((t) => (
          <div key={t.id} className="fs-tl-label" style={{ height: TRACK_H }}>
            <span>{t.name}</span>
            <button type="button" className="fs-mini" aria-pressed={t.muted} aria-label={`${t.muted ? "Unmute" : "Mute"} ${t.name}`} onClick={() => edit((d) => T.setTrackFlags(d, t.id, { muted: !t.muted }))}>{t.muted ? "🔇" : "🔊"}</button>
            <button type="button" className="fs-mini" aria-pressed={t.locked} aria-label={`${t.locked ? "Unlock" : "Lock"} ${t.name}`} onClick={() => edit((d) => T.setTrackFlags(d, t.id, { locked: !t.locked }))}>{t.locked ? "🔒" : "🔓"}</button>
          </div>
        ))}
      </div>
      <div className="fs-tl-scroll">
        <div className="fs-tl-canvas" style={{ width }}>
          <div className="fs-tl-ruler" onPointerDown={seek} role="slider" aria-label="Playhead position" aria-valuemin={0} aria-valuemax={Math.round(duration)} aria-valuenow={Math.round(playhead * 10) / 10}>
            {ticks.map((t) => <span key={t} className="fs-tl-tick" style={{ left: t * pxPerSec }}>{formatClock(t)}</span>)}
          </div>
          {tracks.map((track) => (
            <div key={track.id} className={`fs-tl-track${track.locked ? " is-locked" : ""}${track.muted ? " is-muted" : ""}`} style={{ height: TRACK_H }} onPointerDown={(e) => { onSelect(null); seek(e); }}>
              {T.trackClips(doc, track.id).map((clip) => {
                const asset = doc.assets.find((a) => a.id === clip.assetId);
                const live = drag && drag.id === clip.id ? drag : null;
                const start = live ? live.start : clip.start;
                const end = live ? live.end : T.clipEnd(clip);
                return (
                  <div key={clip.id} className={`fs-clip kind-${track.kind}${selected === clip.id ? " is-selected" : ""}`} style={{ left: start * pxPerSec, width: Math.max(8, (end - start) * pxPerSec) }}
                    role="button" tabIndex={0} aria-label={`${asset?.name ?? "Clip"}, ${formatClock(start)} to ${formatClock(end)}${clip.speed !== 1 ? `, ${clip.speed}× speed` : ""}`} aria-pressed={selected === clip.id}
                    onPointerDown={(e) => begin(e, clip, "move")} onPointerMove={move} onPointerUp={finish} onPointerCancel={finish}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(clip.id); } }}>
                    <span className="fs-clip-handle is-start" onPointerDown={(e) => begin(e, clip, "trimStart")} onPointerMove={move} onPointerUp={finish} onPointerCancel={finish} aria-hidden="true" />
                    <span className="fs-clip-name">{asset?.name ?? "Missing file"}{clip.speed !== 1 ? ` · ${clip.speed}×` : ""}</span>
                    <span className="fs-clip-handle is-end" onPointerDown={(e) => begin(e, clip, "trimEnd")} onPointerMove={move} onPointerUp={finish} onPointerCancel={finish} aria-hidden="true" />
                  </div>
                );
              })}
            </div>
          ))}
          <div className="fs-tl-playhead" style={{ left: playhead * pxPerSec }} aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}

import { memo, useCallback, useEffect, useRef, useState, type PointerEvent as RPointerEvent } from "react";
import { Icon } from "./icons.tsx";
import { PEAKS_PER_SECOND, type Filmstrip } from "./mediaVisuals.ts";
import * as T from "./timeline.ts";

type Props = {
  doc: T.TimelineDoc;
  selected: string | null;
  playhead: number;
  pxPerSec: number;
  thumbs: Record<string, Filmstrip>;
  peaks: Record<string, Float32Array>;
  onSelect: (id: string | null) => void;
  onSeek: (t: number) => void;
  edit: (fn: (d: T.TimelineDoc) => T.TimelineDoc) => boolean;
  onImport: () => void;
};
type Drag = { id: string; mode: "move" | "trimStart" | "trimEnd"; startX: number; origStart: number; origEnd: number; start: number; end: number };

const SNAP_PX = 8;
export const TRACK_HEIGHT: Record<string, number> = { video: 68, music: 48 };
const trackHeight = (kind: string) => TRACK_HEIGHT[kind] ?? 48;

export function formatClock(seconds: number): string {
  const s = Math.max(0, seconds);
  const m = Math.floor(s / 60);
  return `${m}:${(s - m * 60).toFixed(1).padStart(4, "0")}`;
}

function Waveform({ peaks, from, to, width, height, color }: { peaks: Float32Array; from: number; to: number; width: number; height: number; color: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.max(1, Math.round(width)); canvas.width = w * dpr; canvas.height = height * dpr;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    ctx.scale(dpr, dpr); ctx.clearRect(0, 0, w, height); ctx.fillStyle = color;
    const firstBucket = from * PEAKS_PER_SECOND, buckets = (to - from) * PEAKS_PER_SECOND;
    for (let x = 0; x < w; x += 2) {
      const b0 = Math.floor(firstBucket + (x / w) * buckets), b1 = Math.max(b0 + 1, Math.floor(firstBucket + ((x + 2) / w) * buckets));
      let m = 0; for (let b = b0; b < b1 && b < peaks.length; b += 1) if (peaks[b] > m) m = peaks[b];
      const h = Math.max(1, Math.sqrt(m) * height);
      ctx.fillRect(x, (height - h) / 2, 1.4, h);
    }
  }, [peaks, from, to, width, height, color]);
  return <canvas ref={ref} className="fs-wave" style={{ width, height }} aria-hidden="true" />;
}

type ClipProps = {
  clip: T.TimelineClip; kind: string; name: string; selected: boolean; locked: boolean; pxPerSec: number;
  start: number; end: number; film: Filmstrip | undefined; peaks: Float32Array | undefined; duration: number;
  onDown: (e: RPointerEvent, clip: T.TimelineClip, mode: Drag["mode"]) => void;
  onMove: (e: RPointerEvent) => void; onUp: () => void; onSelect: (id: string) => void;
};

const Clip = memo(function Clip({ clip, kind, name, selected, locked, pxPerSec, start, end, film, peaks, duration, onDown, onMove, onUp, onSelect }: ClipProps) {
  const width = Math.max(10, (end - start) * pxPerSec);
  const h = trackHeight(kind) - 8;
  const srcFrom = clip.sourceIn, srcTo = clip.sourceOut;
  const tiles: number[] = [];
  let tileW = 0;
  if (kind === "video" && film) {
    tileW = Math.max(24, Math.round(h * film.aspect));
    for (let x = 0; x < width; x += tileW) {
      const t = srcFrom + ((x + tileW / 2) / width) * (end - start) * clip.speed;
      tiles.push(Math.min(film.urls.length - 1, Math.max(0, Math.floor((t / Math.max(duration, 0.1)) * film.urls.length))));
    }
  }
  return (
    <div className={`fs-clip kind-${kind}${selected ? " is-selected" : ""}${locked ? " is-locked" : ""}`} style={{ left: start * pxPerSec, width, top: 4, height: h }}
      role="button" tabIndex={0} aria-label={`${name}, ${formatClock(start)} to ${formatClock(end)}${clip.speed !== 1 ? `, ${clip.speed}× speed` : ""}`} aria-pressed={selected}
      onPointerDown={(e) => onDown(e, clip, "move")} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(clip.id); } }}>
      {tiles.length > 0 && <div className="fs-film" aria-hidden="true">{tiles.map((idx, i) => <span key={i} style={{ width: tileW, backgroundImage: `url(${film!.urls[idx]})` }} />)}</div>}
      {peaks && peaks.length > 0 && <Waveform peaks={peaks} from={srcFrom} to={srcTo} width={width} height={kind === "video" ? 16 : h - 16} color={kind === "video" ? "rgba(255,255,255,.75)" : "rgba(134,239,172,.9)"} />}
      <span className="fs-clip-label"><Icon name={kind === "video" ? "video" : "music"} size={12} />{name}{clip.speed !== 1 ? ` · ${clip.speed}×` : ""}</span>
      <span className="fs-clip-handle is-start" onPointerDown={(e) => onDown(e, clip, "trimStart")} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} aria-hidden="true" />
      <span className="fs-clip-handle is-end" onPointerDown={(e) => onDown(e, clip, "trimEnd")} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} aria-hidden="true" />
    </div>
  );
});

export default function Timeline({ doc, selected, playhead, pxPerSec, thumbs, peaks, onSelect, onSeek, edit, onImport }: Props) {
  const [drag, setDrag] = useState<Drag | null>(null);
  const dragRef = useRef<Drag | null>(null);
  const docRef = useRef(doc); docRef.current = doc;
  const ppsRef = useRef(pxPerSec); ppsRef.current = pxPerSec;
  const phRef = useRef(playhead); phRef.current = playhead;
  const duration = Math.max(T.timelineDuration(doc), 10);
  const width = Math.ceil((duration + 6) * pxPerSec);
  const tracks = doc.tracks.filter((t) => T.SUPPORTED_TRACK_KINDS.includes(t.kind));
  const scroller = useRef<HTMLDivElement>(null);

  // Keep the playhead in view while playing or stepping.
  useEffect(() => {
    const el = scroller.current; if (!el) return;
    const x = playhead * pxPerSec;
    if (x < el.scrollLeft + 8) el.scrollLeft = Math.max(0, x - 40);
    else if (x > el.scrollLeft + el.clientWidth - 24) el.scrollLeft = x - el.clientWidth + 120;
  }, [playhead, pxPerSec]);

  const snap = (value: number, ignoreId: string) => {
    const d = docRef.current, pps = ppsRef.current;
    const points = [0, phRef.current, ...d.clips.filter((c) => c.id !== ignoreId).flatMap((c) => [c.start, T.clipEnd(c)])];
    let best = value, bestDist = SNAP_PX / pps;
    for (const p of points) { const dist = Math.abs(p - value); if (dist < bestDist) { best = p; bestDist = dist; } }
    return T.round3(best);
  };

  const begin = (e: RPointerEvent, clip: T.TimelineClip, mode: Drag["mode"]) => {
    const track = docRef.current.tracks.find((t) => t.id === clip.trackId);
    e.stopPropagation();
    onSelect(clip.id);
    if (track?.locked) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const d: Drag = { id: clip.id, mode, startX: e.clientX, origStart: clip.start, origEnd: T.clipEnd(clip), start: clip.start, end: T.clipEnd(clip) };
    dragRef.current = d; setDrag(d);
  };
  const move = (e: RPointerEvent) => {
    const d = dragRef.current; if (!d) return;
    const dt = (e.clientX - d.startX) / ppsRef.current;
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

  // Stable wrappers so memoised clips do not re-render on every playhead tick.
  const latest = useRef({ begin, move, finish }); latest.current = { begin, move, finish };
  const onDown = useCallback((e: RPointerEvent, c: T.TimelineClip, m: Drag["mode"]) => latest.current.begin(e, c, m), []);
  const onMove = useCallback((e: RPointerEvent) => latest.current.move(e), []);
  const onUp = useCallback(() => latest.current.finish(), []);

  // Ruler: press and drag to scrub.
  const scrubbing = useRef(false);
  const seekFrom = (e: RPointerEvent<HTMLElement>) => { const r = e.currentTarget.getBoundingClientRect(); onSeek(Math.max(0, (e.clientX - r.left) / ppsRef.current)); };
  const rulerDown = (e: RPointerEvent<HTMLDivElement>) => { scrubbing.current = true; e.currentTarget.setPointerCapture(e.pointerId); seekFrom(e); };
  const rulerMove = (e: RPointerEvent<HTMLDivElement>) => { if (scrubbing.current) seekFrom(e); };
  const rulerUp = () => { scrubbing.current = false; };

  const ticks: number[] = [];
  const step = pxPerSec >= 120 ? 1 : pxPerSec >= 60 ? 2 : pxPerSec >= 30 ? 5 : 10;
  for (let t = 0; t <= duration + 6; t += step) ticks.push(t);
  const empty = doc.clips.length === 0;

  return (
    <div className="fs-tl" role="group" aria-label="Timeline">
      <div className="fs-tl-labels">
        <div className="fs-tl-corner" />
        {tracks.map((t) => (
          <div key={t.id} className="fs-tl-label" style={{ height: trackHeight(t.kind) }}>
            <button type="button" className="fs-iconbtn" aria-pressed={t.muted} aria-label={`${t.muted ? "Unmute" : "Mute"} ${t.name}`} onClick={() => edit((d) => T.setTrackFlags(d, t.id, { muted: !t.muted }))}><Icon name={t.muted ? "mute" : "volume"} size={16} /></button>
            <button type="button" className="fs-iconbtn" aria-pressed={t.locked} aria-label={`${t.locked ? "Unlock" : "Lock"} ${t.name}`} onClick={() => edit((d) => T.setTrackFlags(d, t.id, { locked: !t.locked }))}><Icon name={t.locked ? "lock" : "unlock"} size={16} /></button>
          </div>
        ))}
      </div>
      <div className="fs-tl-scroll" ref={scroller}>
        <div className="fs-tl-canvas" style={{ width }}>
          <div className="fs-tl-ruler" onPointerDown={rulerDown} onPointerMove={rulerMove} onPointerUp={rulerUp} onPointerCancel={rulerUp} role="slider" aria-label="Playhead position" aria-valuemin={0} aria-valuemax={Math.round(duration)} aria-valuenow={Math.round(playhead * 10) / 10}>
            {ticks.map((t) => <span key={t} className="fs-tl-tick" style={{ left: t * pxPerSec }}>{formatClock(t)}</span>)}
          </div>
          {tracks.map((track) => (
            <div key={track.id} className={`fs-tl-track kind-${track.kind}${track.locked ? " is-locked" : ""}${track.muted ? " is-muted" : ""}`} style={{ height: trackHeight(track.kind) }} onPointerDown={(e) => { onSelect(null); seekFrom(e); }}>
              {T.trackClips(doc, track.id).map((clip) => {
                const asset = doc.assets.find((a) => a.id === clip.assetId);
                const live = drag && drag.id === clip.id ? drag : null;
                return <Clip key={clip.id} clip={clip} kind={track.kind} name={asset?.name ?? "Missing file"} selected={selected === clip.id} locked={track.locked} pxPerSec={pxPerSec}
                  start={live ? live.start : clip.start} end={live ? live.end : T.clipEnd(clip)} film={thumbs[clip.assetId]} peaks={peaks[clip.assetId]} duration={asset?.duration ?? 0}
                  onDown={onDown} onMove={onMove} onUp={onUp} onSelect={onSelect} />;
              })}
            </div>
          ))}
          {empty && <button type="button" className="fs-tl-empty" onClick={onImport}><Icon name="plus" size={18} /> Add your first clip</button>}
          <div className="fs-tl-playhead" style={{ left: playhead * pxPerSec }} aria-hidden="true"><span className="fs-tl-playhead-cap" /></div>
        </div>
      </div>
    </div>
  );
}

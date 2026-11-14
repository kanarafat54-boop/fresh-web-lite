import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { StudioProject } from "../shared/types.ts";
import type { StudioProjectService } from "../projects/projectService.ts";
import { getTranscriptionStatus, normalizeCues, parseCaptions, serializeSrt, serializeVtt, validateCues, type Cue } from "./captions.ts";
import { ExportCancelled, ExportError, availableExportOptions, runExport, type ExportStage, type WorkerCapabilities } from "./exportJob.ts";
import { createBrowserExportPorts } from "./renderClient.ts";
import type { ExportPresetId } from "./renderPlan.ts";
import { Icon, type IconName } from "./icons.tsx";
import { useLayerDrag } from "./useLayerDrag.ts";
import { STICKERS, stickerLayer } from "./stickers.ts";
import { ClipInspector, OverlayInspector, TextInspector } from "./Inspector.tsx";
import { ANALYSIS_SAMPLE_RATE } from "./audioAnalysis.ts";
import { computePeaks, extractFilmstrip, filmstripCount, type Filmstrip } from "./mediaVisuals.ts";
import Timeline, { formatClock } from "./Timeline.tsx";
import { ScenesPanel } from "./ScenesPanel.tsx";
import * as T from "./timeline.ts";
import { useVideoEditor } from "./useVideoEditor.ts";

type Props = { project: StudioProject; service: StudioProjectService | null; onSaved: (p: StudioProject) => void; notify: (kind: "info" | "error", text: string) => void; onClose: () => void; signedIn: boolean; initialPanel?: Tab };
type Tab = "media" | "text" | "overlays" | "scenes" | "captions" | "smart" | "export";

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 10000);
}
const isTyping = (t: EventTarget | null) => t instanceof HTMLElement && (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName));

/** Preview gain through Web Audio so volume above 100% and fades can be heard. Falls back to element.volume. */
const audioGraphs = new WeakMap<HTMLMediaElement, { ctx: AudioContext; gain: GainNode }>();
let sharedCtx: AudioContext | null = null;
function setPreviewGain(el: HTMLMediaElement, value: number) {
  let g = audioGraphs.get(el);
  if (!g) {
    try {
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) throw new Error("no web audio");
      sharedCtx ??= new Ctx();
      const gain = sharedCtx.createGain();
      sharedCtx.createMediaElementSource(el).connect(gain).connect(sharedCtx.destination);
      g = { ctx: sharedCtx, gain }; audioGraphs.set(el, g);
    } catch { el.volume = Math.min(1, Math.max(0, value)); return; }
  }
  if (g.ctx.state === "suspended") void g.ctx.resume().catch(() => {});
  g.gain.gain.value = value;
}
/** 0–1 factor for a clip's fade in/out at timeline time `t`. */
function fadeFactor(doc: T.TimelineDoc, c: T.TimelineClip, t: number, medium: "audio" | "video"): number {
  const end = T.clipEnd(c);
  const { fadeIn, fadeOut } = T.effectiveFades(doc, c, medium);
  let f = 1;
  if (fadeIn) f = Math.min(f, (t - c.start) / fadeIn);
  if (fadeOut) f = Math.min(f, (end - t) / fadeOut);
  // Blend-style transitions are previewed as a fade-in of the new clip (the export shows the exact effect).
  if (medium === "video" && c.transitionIn && c.transitionIn.type !== "dip") f = Math.min(f, (t - c.start) / c.transitionIn.duration);
  return Math.min(1, Math.max(0, f));
}
/** Preview of a clip's zoom/position at the playhead; matches the exported movement. */
function motionTransform(c: T.TimelineClip | null, t: number): string | undefined {
  if (!c?.motion) return undefined;
  const m = T.motionAt(c.motion, (t - c.start) / Math.max(0.001, T.clipDuration(c)));
  return `translate(${(-m.x * (m.zoom - 1) * 50).toFixed(3)}%, ${(-m.y * (m.zoom - 1) * 50).toFixed(3)}%) scale(${m.zoom.toFixed(4)})`;
}
/** Approximate preview of warmth, split toning and vignette (the export is exact). */
function GradeOverlay({ look }: { look: T.ClipLook }) {
  const warm = look.warmth ?? 0, split = look.split ?? 0, vig = look.vignette ?? 0;
  if (Math.abs(warm) < 1e-6 && split < 1e-6 && vig < 1e-6) return null;
  const tint = warm > 0 ? `rgba(255,150,60,${0.55 * warm})` : `rgba(60,130,255,${0.55 * -warm})`;
  const splitTint = `linear-gradient(rgba(255,150,60,${0.6 * split}), rgba(20,120,170,${0.6 * split}))`;
  return (
    <>
      {(Math.abs(warm) > 1e-6 || split > 1e-6) && <div className="fs-grade" aria-hidden="true" style={{ background: split > 1e-6 ? `${splitTint}${Math.abs(warm) > 1e-6 ? `, linear-gradient(${tint}, ${tint})` : ""}` : tint }} />}
      {vig > 1e-6 && <div className="fs-grade fs-grade-vignette" aria-hidden="true" style={{ background: `radial-gradient(ellipse at center, transparent 45%, rgba(0,0,0,${0.75 * vig}) 100%)` }} />}
    </>
  );
}

const lookFilter = (l: T.ClipLook | undefined) => (l ? `brightness(${1 + l.brightness}) contrast(${l.contrast}) saturate(${l.saturation})` : "none");
const ratioOf = (a: string) => { const [w, h] = a.split(":").map(Number); return w / h; };

const PANELS: Array<{ id: Tab; label: string; icon: IconName }> = [
  { id: "media", label: "Media", icon: "media" },
  { id: "text", label: "Text", icon: "type" },
  { id: "overlays", label: "Overlays", icon: "image" },
  { id: "scenes", label: "Scenes", icon: "scenes" },
  { id: "captions", label: "Captions", icon: "captions" },
  { id: "smart", label: "Smart edit", icon: "sparkles" },
  { id: "export", label: "Export", icon: "export" },
];

export default function VideoEditor({ project, service, onSaved, notify, onClose, signedIn, initialPanel }: Props) {
  const ed = useVideoEditor(project, service, onSaved, notify);
  const { doc, selected, playhead, duration, media } = ed;
  const [panel, setPanel] = useState<Tab | null>(() => initialPanel ?? (typeof window !== "undefined" && window.matchMedia?.("(min-width: 900px)").matches ? "media" : null));
  const [playing, setPlaying] = useState(false);
  const [pxPerSec, setPxPerSec] = useState(70);
  const [dropping, setDropping] = useState(false);
  const [safeAreas, setSafeAreas] = useState(false);
  const monitorRef = useRef<HTMLDivElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const videoEl = useRef<HTMLVideoElement>(null);
  const audioEl = useRef<HTMLAudioElement>(null);
  const pipEl = useRef<HTMLVideoElement>(null);

  const videoTrack = doc.tracks.find((t) => t.kind === "video");
  const musicTrack = doc.tracks.find((t) => t.kind === "music");
  const activeVideo = videoTrack ? T.clipAt(doc, videoTrack.id, playhead) : null;
  const layerTrack = T.layerVideoTracks(doc)[0] ?? null;
  const activeLayer = layerTrack ? T.clipAt(doc, layerTrack.id, playhead) : null;
  const activeAudio = musicTrack ? T.clipAt(doc, musicTrack.id, playhead) : null;
  const selectedClip = doc.clips.find((c) => c.id === selected) ?? null;
  const selectedText = (doc.texts ?? []).find((t) => t.id === selected) ?? null;
  const aspect = doc.aspect ?? String(project.meta.settings.aspectRatio ?? "16:9");
  const aspectValid = (T.ASPECT_RATIOS as readonly string[]).includes(aspect) ? aspect : "16:9";
  const frameAr = ratioOf(aspectValid);
  const visibleTexts = T.textsAt(doc, playhead);
  const selectedOverlay = (doc.overlays ?? []).find((o) => o.id === selected) ?? null;
  const visibleOverlays = T.overlaysAt(doc, playhead);
  const frameRef = useRef<HTMLDivElement>(null);
  const drag = useLayerDrag(frameRef, doc, ed.edit, ed.setSelected);
  const at = <L extends { id: string; x: number; y: number }>(l: L) => (drag.live && drag.live.id === l.id ? { ...l, ...drag.live } : l);
  const videoFade = activeVideo ? fadeFactor(doc, activeVideo, playhead, "video") : 1;

  // --- thumbnails and waveforms, computed once per file
  const [thumbs, setThumbs] = useState<Record<string, Filmstrip>>({});
  const [peaks, setPeaks] = useState<Record<string, Float32Array>>({});
  const visualsStarted = useRef(new Set<string>());
  useEffect(() => {
    for (const [id, entry] of Object.entries(media)) {
      if (visualsStarted.current.has(id) || entry.missing) continue;
      visualsStarted.current.add(id);
      const samples = entry.samples;
      if (samples) setPeaks((p) => ({ ...p, [id]: computePeaks(samples, ANALYSIS_SAMPLE_RATE) }));
      const length = entry.asset.duration ?? 0;
      if (entry.url && entry.asset.kind === "video" && length > 0) void extractFilmstrip(entry.url, length, filmstripCount(length)).then((f) => { if (f) setThumbs((t) => ({ ...t, [id]: f })); });
    }
  }, [media]);

  // --- preview sync: the media element follows the timeline, never the other way round while paused
  const sync = useCallback((el: HTMLMediaElement | null, clip: T.TimelineClip | null, muted: boolean, at: number) => {
    if (!el) return;
    const entry = clip ? media[clip.assetId] : null;
    if (!clip || !entry?.url) { if (!el.paused) el.pause(); return; }
    if (el.dataset.src !== entry.url) { el.dataset.src = entry.url; el.src = entry.url; }
    el.muted = false; el.playbackRate = clip.speed;
    setPreviewGain(el, muted ? 0 : (clip.volume ?? 1) * fadeFactor(doc, clip, at, "audio"));
    const target = clip.sourceIn + (at - clip.start) * clip.speed;
    if (Math.abs(el.currentTime - target) > (playing ? 0.35 : 0.04)) { try { el.currentTime = target; } catch { /* not seekable yet */ } }
  }, [media, playing, doc]);

  useEffect(() => {
    sync(videoEl.current, activeVideo, !!videoTrack?.muted, playhead);
    sync(audioEl.current, activeAudio, !!musicTrack?.muted, playhead);
    sync(pipEl.current, activeLayer, !!layerTrack?.muted, playhead);
    for (const [el, clip] of [[videoEl.current, activeVideo], [audioEl.current, activeAudio], [pipEl.current, activeLayer]] as const) {
      if (!el) continue;
      if (playing && clip && media[clip.assetId]?.url) void el.play().catch(() => {}); else if (!el.paused) el.pause();
    }
  }, [playhead, playing, activeVideo?.id, activeAudio?.id, activeLayer?.id, sync, activeVideo, activeAudio, activeLayer, videoTrack?.muted, musicTrack?.muted, layerTrack?.muted, media]);

  // --- playback clock
  const lastTick = useRef(0);
  const playheadRef = useRef(playhead); playheadRef.current = playhead;
  useEffect(() => {
    if (!playing) return;
    let raf = 0;
    lastTick.current = performance.now();
    const tick = (now: number) => {
      const dt = (now - lastTick.current) / 1000; lastTick.current = now;
      ed.setPlayhead(Math.min(duration, playheadRef.current + dt));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, duration]);
  useEffect(() => { if (playing && playhead >= duration) setPlaying(false); }, [playing, playhead, duration]);

  const togglePlay = useCallback(() => {
    if (duration <= 0) return;
    if (!playing && playheadRef.current >= duration - 0.05) ed.setPlayhead(0);
    setPlaying((p) => !p);
  }, [duration, playing, ed]);

  // --- edit actions
  const targetClip = useCallback((): T.TimelineClip | null => selectedClip ?? (videoTrack ? T.clipAt(doc, videoTrack.id, playhead) : null), [selectedClip, videoTrack, doc, playhead]);
  const split = () => {
    const c = targetClip();
    if (!c) return notify("error", "Select a clip, or move the playhead over one.");
    if (playhead <= c.start + 0.05 || playhead >= T.clipEnd(c) - 0.05) return notify("error", "Move the playhead inside the clip to split it.");
    ed.edit((d) => T.splitClip(d, c.id, playhead));
  };
  const remove = (ripple: boolean) => {
    if (selectedText) { ed.edit((d) => T.deleteText(d, selectedText.id)); ed.setSelected(null); return; }
    if (selectedOverlay) { ed.edit((d) => T.deleteOverlay(d, selectedOverlay.id)); ed.setSelected(null); return; }
    if (!selectedClip) return notify("error", "Select a clip first.");
    ed.edit((d) => T.deleteClip(d, selectedClip.id, ripple)); ed.setSelected(null);
  };
  const addTextLayer = (patch: Partial<Omit<T.TextLayer, "id">> = {}) => {
    const id = T.newId("text");
    const ok = ed.edit((d) => {
      const withText = T.addText(d, { start: playhead, id, duration: 3 });
      return Object.keys(patch).length ? T.updateText(withText, id, patch) : withText;
    });
    if (ok) ed.setSelected(id);
  };
  const addOverlayLayer = (kind: "image" | "rect", assetId?: string) => {
    const id = T.newId("overlay");
    if (ed.edit((d) => T.addOverlay(d, { kind, assetId, start: playhead, id }))) { ed.setSelected(id); setPanel("overlays"); }
  };
  const addAsLayer = (assetId: string) => {
    const id = T.newId("clip");
    if (ed.edit((d) => {
      const withTrack = T.addVideoLayer(d);
      const track = T.layerVideoTracks(withTrack)[0];
      if (!track) throw new T.TimelineError("This project cannot have another video layer.");
      return T.addClip(withTrack, { trackId: track.id, assetId, start: Math.min(playhead, Math.max(0, T.timelineDuration(withTrack) - 0.5)), id });
    })) ed.setSelected(id);
  };
  /** Alt + arrow moves the selected text, picture, rectangle or picture-in-picture by 1% of the frame (5% with Shift). */
  const nudge = (key: string, amount: number) => {
    const dx = key === "ArrowLeft" ? -amount : key === "ArrowRight" ? amount : 0;
    const dy = key === "ArrowUp" ? -amount : key === "ArrowDown" ? amount : 0;
    const clampUnit = (n: number) => Math.min(1, Math.max(0, T.round3(n)));
    if (selectedText) ed.edit((d) => T.updateText(d, selectedText.id, { x: clampUnit(selectedText.x + dx), y: clampUnit(selectedText.y + dy) }));
    else if (selectedOverlay) ed.edit((d) => T.updateOverlay(d, selectedOverlay.id, { x: clampUnit(selectedOverlay.x + dx), y: clampUnit(selectedOverlay.y + dy) }));
    else if (selectedClip && T.isLayerTrack(doc, selectedClip.trackId) && selectedClip.layer) { const L = selectedClip.layer; ed.edit((d) => T.setClipLayer(d, selectedClip.id, { x: clampUnit(L.x + dx), y: clampUnit(L.y + dy) })); }
  };
  const step = (dir: 1 | -1) => { setPlaying(false); ed.setPlayhead(Math.min(duration, Math.max(0, T.round3(playheadRef.current + dir / doc.fps)))); };
  const fullscreen = () => { const el = monitorRef.current; if (!el) return; if (document.fullscreenElement) void document.exitFullscreen(); else void el.requestFullscreen?.().catch(() => notify("error", "Fullscreen is not available here.")); };
  const duplicate = () => { if (selectedClip) ed.edit((d) => T.duplicateClip(d, selectedClip.id)); else notify("error", "Select a clip first."); };
  const fit = () => {
    const el = document.querySelector(".fs-tl-scroll");
    const w = el instanceof HTMLElement ? el.clientWidth : 600;
    setPxPerSec(Math.max(10, Math.min(200, Math.floor((w - 40) / Math.max(duration, 5)))));
  };

  // The editor fills the window, so the page behind it must not scroll.
  useEffect(() => {
    const root = document.documentElement, prev = root.style.overflow;
    root.style.overflow = "hidden";
    return () => { root.style.overflow = prev; };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e.target)) return;
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === "z") { e.preventDefault(); if (e.shiftKey) ed.redo(); else ed.undo(); }
      else if (mod && e.key.toLowerCase() === "y") { e.preventDefault(); ed.redo(); }
      else if (e.altKey && e.key.startsWith("Arrow")) { e.preventDefault(); nudge(e.key, e.shiftKey ? 0.05 : 0.01); }
      else if (e.key === " ") { e.preventDefault(); togglePlay(); }
      else if (e.key.toLowerCase() === "s" && !mod) { e.preventDefault(); split(); }
      else if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); remove(e.shiftKey); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); ed.setPlayhead(Math.max(0, T.round3(playheadRef.current - (e.shiftKey ? 1 : 1 / doc.fps)))); }
      else if (e.key === "ArrowRight") { e.preventDefault(); ed.setPlayhead(Math.min(duration, T.round3(playheadRef.current + (e.shiftKey ? 1 : 1 / doc.fps)))); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const saveLabel = ed.saveState === "saved" ? "Saved" : ed.saveState === "saving" ? "Saving…" : ed.saveState === "conflict" ? "Changed elsewhere" : "Not saved";
  const where = service ? "" : " · not saving";
  const openImport = () => fileInput.current?.click();
  const empty = doc.clips.length === 0;

  return (
    <div className="fs-editor" aria-label="Video editor" data-panel={panel ?? "none"}
      onDragOver={(e) => { if (e.dataTransfer.types.includes("Files")) { e.preventDefault(); setDropping(true); } }}
      onDragLeave={(e) => { if (e.currentTarget === e.target) setDropping(false); }}
      onDrop={(e) => { e.preventDefault(); setDropping(false); const files = Array.from(e.dataTransfer.files); if (files.length) void ed.importFiles(files); }}>

      <input ref={fileInput} type="file" accept="video/*,audio/*,image/png,image/jpeg,image/webp" multiple hidden onChange={(e) => { const files = Array.from(e.target.files ?? []); e.target.value = ""; if (files.length) void ed.importFiles(files); }} />

      <header className="fs-ed-top">
        <button type="button" className="fs-iconbtn fs-iconbtn-lg" onClick={() => { void ed.flushNow(); onClose(); }} aria-label="Back to project"><Icon name="back" /></button>
        <div className="fs-ed-heading"><strong className="fs-ed-title">{project.name}</strong><span className={`fs-save is-${ed.saveState}`} role="status">{saveLabel}{where}</span></div>
        <button type="button" className="fs-btn fs-btn-primary fs-export-btn" onClick={() => setPanel("export")}><Icon name="export" size={18} /> Export</button>
      </header>
      {ed.saveState === "conflict" && (
        <div className="fs-banner is-error" role="alert"><span>This project was changed somewhere else. Autosave is paused so nothing is overwritten.</span><button type="button" className="fs-btn" onClick={() => void ed.reloadLatest()}>Load latest version</button></div>
      )}

      <nav className="fs-rail" aria-label="Editor tools" role="tablist">
        {PANELS.map((p) => (
          <button key={p.id} type="button" role="tab" id={`tab-${p.id}`} aria-selected={panel === p.id} aria-controls="fs-sidepanel" className={panel === p.id ? "is-active" : ""} onClick={() => setPanel(panel === p.id ? null : p.id)}>
            <Icon name={p.icon} size={22} /><span>{p.label}</span>
          </button>
        ))}
      </nav>

      <div className="fs-sheet-backdrop" onClick={() => setPanel(null)} aria-hidden="true" />
      <aside className="fs-sidepanel" id="fs-sidepanel" role="tabpanel" aria-labelledby={panel ? `tab-${panel}` : undefined} hidden={!panel}>
        {panel && (
          <>
            <div className="fs-sidepanel-head"><h2>{PANELS.find((p) => p.id === panel)?.label}</h2><button type="button" className="fs-iconbtn" onClick={() => setPanel(null)} aria-label="Close panel"><Icon name="close" /></button></div>
            <div className="fs-tabpanel">
              {panel === "media" && <MediaPanel ed={ed} onImport={openImport} onOverlay={(id) => addOverlayLayer("image", id)} onLayer={addAsLayer} />}
              {panel === "text" && <TextPanel ed={ed} onAdd={addTextLayer} />}
              {panel === "overlays" && <OverlaysPanel ed={ed} onAdd={addOverlayLayer} onImport={openImport} />}
              {panel === "scenes" && <ScenesPanel ed={ed} clip={selectedClip} ownerId={signedIn ? project.ownerId : null} thumbs={thumbs} onPick={(c) => { setPlaying(false); ed.setSelected(c.id); ed.setPlayhead(c.start); }} />}
              {panel === "captions" && <CaptionsPanel ed={ed} />}
              {panel === "smart" && <SmartPanel ed={ed} clip={selectedClip} />}
              {panel === "export" && <ExportPanel ed={ed} projectId={project.id} aspect={aspectValid} signedIn={signedIn} notify={notify} />}
            </div>
          </>
        )}
      </aside>

      <section className="fs-stage" aria-label="Preview">
        <div className="fs-monitor" ref={monitorRef} data-empty={!activeVideo}>
          <div className="fs-frame" ref={frameRef} style={{ aspectRatio: aspectValid.replace(":", " / "), ["--ar" as string]: ratioOf(aspectValid) }} data-aspect={aspectValid}>
            <video ref={videoEl} playsInline preload="auto" aria-label="Video preview"
              style={{ visibility: activeVideo ? "visible" : "hidden", objectFit: activeVideo?.fit === "fill" ? "cover" : "contain", filter: lookFilter(activeVideo?.look), opacity: videoFade, transform: motionTransform(activeVideo, playhead) }} />
            {activeVideo?.look && <GradeOverlay look={activeVideo.look} />}
            {!activeVideo && (empty
              ? <button type="button" className="fs-empty-cta" onClick={openImport} disabled={!!ed.busy}><Icon name="import" size={30} /><strong>Import video or audio</strong><span>or drop files here</span></button>
              : <p className="fs-muted fs-gap">No video at this point. Gaps render as black.</p>)}
            <div className={`fs-pip${activeLayer && selected === activeLayer.id ? " is-selected" : ""}`} data-testid="pip" hidden={!activeLayer}
              style={activeLayer ? (() => { const L = at({ id: activeLayer.id, ...(activeLayer.layer ?? T.DEFAULT_LAYER) }) as T.ClipLayer & { id: string }; return { left: `${L.x * 100}%`, top: `${L.y * 100}%`, width: `${L.width * 100}%`, aspectRatio: `${frameAr}`, opacity: L.opacity * fadeFactor(doc, activeLayer, playhead, "video") }; })() : undefined}
              onPointerDown={(e) => activeLayer && drag.begin(e, activeLayer.id, "clip")} onPointerMove={drag.move} onPointerUp={drag.end} onPointerCancel={drag.end}>
              <div className="fs-pip-clip"><video ref={pipEl} playsInline preload="auto" aria-label="Layer preview" style={{ objectFit: activeLayer?.fit === "fill" ? "cover" : "contain", filter: lookFilter(activeLayer?.look), transform: motionTransform(activeLayer, playhead) }} /></div>
              {activeLayer && selected === activeLayer.id && <span className="fs-resize-handle" role="presentation" data-testid="pip-handle" onPointerDown={(e) => drag.begin(e, activeLayer.id, "clip", "resize")} onPointerMove={drag.move} onPointerUp={drag.end} onPointerCancel={drag.end} />}
            </div>
            {visibleTexts.map((t0) => { const t = at(t0); return (
              <div key={t.id} className={`fs-overlay-text${selected === t.id ? " is-selected" : ""}`} data-testid="overlay-text"
                style={{ left: `${t.x * 100}%`, top: `${t.y * 100}%`, fontSize: `${t.size * 100}cqh`, color: t.color, fontWeight: t.bold ? 700 : 400, background: t.box ? "rgba(0,0,0,.55)" : "transparent", padding: t.box ? "0.25em" : 0, textShadow: t.box ? "none" : "0.05em 0.05em 0.05em rgba(0,0,0,.6)", ...(t.rotation || t.animIn || t.animOut ? (() => { const a = T.textAnimationAt(t, playhead); return { opacity: a.opacity, transform: `translate(-50%, -50%) translate(${a.dx * 100}cqw, ${a.dy * 100}cqh)${t.rotation ? ` rotate(${t.rotation}deg)` : ""}` }; })() : {}) }}
                onPointerDown={(e) => drag.begin(e, t.id, "text")} onPointerMove={drag.move} onPointerUp={drag.end} onPointerCancel={drag.end}>{t.text}</div>
            ); })}
            {visibleOverlays.map((o0) => {
              const o = at(o0) as T.OverlayLayer & { x: number; y: number };
              const url = o.kind === "image" ? ed.media[o.assetId!]?.url : null;
              return (
                <div key={o.id} className={`fs-overlay-item${selected === o.id ? " is-selected" : ""}`} data-testid={o.kind === "rect" ? "overlay-shape" : "overlay-picture"}
                  style={{ left: `${o.x * 100}%`, top: `${o.y * 100}%`, width: `${o.width * 100}%`, ...(o.kind === "rect" ? { height: `${o.height * 100}%` } : {}), ...(o.rotation ? { transform: `translate(-50%, -50%) rotate(${o.rotation}deg)` } : {}) }}
                  onPointerDown={(e) => drag.begin(e, o.id, "overlay")} onPointerMove={drag.move} onPointerUp={drag.end} onPointerCancel={drag.end}>
                  {o.kind === "rect"
                    ? <div className="fs-overlay-fill" style={{ background: o.color, opacity: o.opacity }} />
                    : <img alt="" src={url ?? undefined} draggable={false} style={{ opacity: o.opacity, visibility: url ? "visible" : "hidden" }} />}
                  {selected === o.id && <span className="fs-resize-handle" role="presentation" data-testid="resize-handle" onPointerDown={(e) => drag.begin(e, o.id, "overlay", "resize")} onPointerMove={drag.move} onPointerUp={drag.end} onPointerCancel={drag.end} />}
                </div>
              );
            })}
            {(drag.guides.x || drag.guides.y) && <div className="fs-guides" aria-hidden="true">{drag.guides.x && <i className="gx" />}{drag.guides.y && <i className="gy" />}</div>}
            {safeAreas && <div className="fs-safe" aria-hidden="true"><i /><i /></div>}
            {ed.busy && <div className="fs-busy" role="status">{ed.busy}</div>}
          </div>
        </div>
        <audio ref={audioEl} preload="auto" />
        <div className="fs-transport">
          <span className="fs-time fs-mono" aria-live="off"><b>{formatClock(playhead)}</b><span className="fs-time-sep"> / </span><span>{formatClock(duration)}</span></span>
          <div className="fs-transport-main">
            <button type="button" className="fs-iconbtn" onClick={() => step(-1)} disabled={duration <= 0} aria-label="Back one frame"><Icon name="stepBack" /></button>
            <button type="button" className="fs-play" onClick={togglePlay} disabled={duration <= 0} aria-label={playing ? "Pause" : "Play"}><Icon name={playing ? "pause" : "play"} size={22} /></button>
            <button type="button" className="fs-iconbtn" onClick={() => step(1)} disabled={duration <= 0} aria-label="Forward one frame"><Icon name="stepForward" /></button>
          </div>
          <div className="fs-transport-end">
            <select value={aspectValid} onChange={(e) => ed.edit((d) => T.setAspect(d, e.target.value))} aria-label="Preview aspect ratio" title="The shape of your video. Export uses the same shape.">
              {T.ASPECT_RATIOS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            <button type="button" className="fs-iconbtn" aria-pressed={safeAreas} onClick={() => setSafeAreas((v) => !v)} aria-label="Safe areas" title="Show safe areas"><Icon name="safe" /></button>
            <button type="button" className="fs-iconbtn" onClick={fullscreen} aria-label="Fullscreen preview"><Icon name="fullscreen" /></button>
          </div>
        </div>
      </section>

      <aside className="fs-inspector" aria-label="Clip settings">
        {selectedClip ? <ClipInspector doc={doc} clip={selectedClip} edit={ed.edit} playhead={playhead} />
          : selectedText ? <TextInspector layer={selectedText} edit={ed.edit} duration={duration} />
          : selectedOverlay ? <OverlayInspector layer={selectedOverlay} assetName={doc.assets.find((a) => a.id === selectedOverlay.assetId)?.name ?? null} edit={ed.edit} duration={duration} />
          : (
            <>
              <h2>Properties</h2>
              <p className="fs-muted">{empty && !(doc.texts ?? []).length ? "Import a video to start editing." : "Tap a clip or text on the timeline to change its speed, volume, look, framing or style."}</p>
            </>
          )}
      </aside>

      <div className="fs-tl-tools" role="toolbar" aria-label="Editing tools">
        <div className="fs-toolgroup">
          <ToolBtn icon="undo" label="Undo" onClick={ed.undo} disabled={!ed.canUndo} />
          <ToolBtn icon="redo" label="Redo" onClick={ed.redo} disabled={!ed.canRedo} />
        </div>
        <div className="fs-toolgroup">
          <ToolBtn icon="split" label="Split" onClick={split} disabled={empty} />
          <ToolBtn icon="trash" label="Delete" onClick={() => remove(false)} disabled={!selectedClip && !selectedText && !selectedOverlay} />
          <ToolBtn icon="ripple" label="Ripple delete" short="Ripple" onClick={() => remove(true)} disabled={!selectedClip} title="Delete and close the gap" />
          <ToolBtn icon="copy" label="Duplicate" onClick={duplicate} disabled={!selectedClip} />
        </div>
        <div className="fs-toolgroup">
          <ToolBtn icon="type" label="Add text" onClick={() => addTextLayer()} />
          {!layerTrack && <ToolBtn icon="video" label="Add video layer" short="Layer" onClick={() => ed.edit((d) => T.addVideoLayer(d))} disabled={empty} title="A second video track for picture-in-picture" />}
          <ToolBtn icon="image" label="Add rectangle" short="Shape" onClick={() => addOverlayLayer("rect")} />
        </div>
        <div className="fs-toolgroup fs-zoomgroup">
          <button type="button" className="fs-iconbtn" aria-label="Zoom out" onClick={() => setPxPerSec((z) => Math.max(10, Math.round(z / 1.4)))}><Icon name="zoomOut" /></button>
          <input type="range" min={10} max={200} value={pxPerSec} onChange={(e) => setPxPerSec(Number(e.target.value))} aria-label="Timeline zoom" />
          <button type="button" className="fs-iconbtn" aria-label="Zoom in" onClick={() => setPxPerSec((z) => Math.min(200, Math.round(z * 1.4)))}><Icon name="zoomIn" /></button>
          <button type="button" className="fs-iconbtn" aria-label="Fit timeline to screen" onClick={fit}><Icon name="fit" /></button>
        </div>
      </div>

      <div className="fs-tl-wrap">
        <Timeline doc={doc} selected={selected} playhead={playhead} pxPerSec={pxPerSec} thumbs={thumbs} peaks={peaks} onSelect={ed.setSelected} onImport={openImport}
          onSeek={(t) => { setPlaying(false); ed.setPlayhead(Math.min(t, Math.max(duration, 0))); }} edit={ed.edit} />
      </div>
      {dropping && <div className="fs-dropzone" aria-hidden="true"><Icon name="import" size={36} /><strong>Drop to import</strong></div>}
    </div>
  );
}

function ToolBtn({ icon, label, short, onClick, disabled, title }: { icon: IconName; label: string; short?: string; onClick: () => void; disabled?: boolean; title?: string }) {
  return <button type="button" className="fs-tool" onClick={onClick} disabled={disabled} title={title} aria-label={label}><Icon name={icon} size={20} /><span>{short ?? label}</span></button>;
}

type Ed = ReturnType<typeof useVideoEditor>;

function MediaPanel({ ed, onImport, onOverlay, onLayer }: { ed: Ed; onImport: () => void; onOverlay: (assetId: string) => void; onLayer: (assetId: string) => void }) {
  const place = (assetId: string) => {
    const asset = ed.doc.assets.find((a) => a.id === assetId);
    if (!asset) return;
    if (asset.kind === "image") { onOverlay(assetId); return; }
    const track = ed.doc.tracks.find((t) => t.kind === (asset.kind === "audio" ? "music" : "video"));
    if (!track) return;
    const end = T.trackClips(ed.doc, track.id).reduce((m, c) => Math.max(m, T.clipEnd(c)), 0);
    ed.edit((d) => T.addClip(d, { trackId: track.id, assetId, start: asset.kind === "audio" ? Math.min(ed.playhead, end) : end }));
  };
  return (
    <div>
      <button type="button" className="fs-btn fs-btn-primary" onClick={onImport} disabled={!!ed.busy}><Icon name="plus" size={18} /> Import video or audio</button>
      {ed.busy && <p className="fs-muted" role="status">{ed.busy}</p>}
      <p className="fs-muted">Files stay on this device until you export.</p>
      <ul className="fs-bin">
        {ed.doc.assets.length === 0 && <li className="fs-muted">No media yet.</li>}
        {ed.doc.assets.map((a) => {
          const entry = ed.media[a.id];
          return (
            <li key={a.id}>
              <div><strong>{a.name}</strong><div className="fs-muted">{a.kind} · {formatClock(a.duration ?? 0)}{a.width ? ` · ${a.width}×${a.height}` : ""}{a.kind !== "image" ? (a.hasAudio ? " · audio" : " · no audio") : ""}</div>
                {entry?.missing && <div className="fs-warn">Not stored on this device. Re-import it to edit or export.</div>}</div>
              <div className="fs-row"><button type="button" className="fs-btn" onClick={() => place(a.id)} disabled={!!entry?.missing}>{a.kind === "image" ? "Add as overlay" : "Add"}</button>{a.kind === "video" && <button type="button" className="fs-btn" onClick={() => onLayer(a.id)} disabled={!!entry?.missing} aria-label={`Add ${a.name} as a layer over the video`}>As layer</button>}<button type="button" className="fs-btn" onClick={() => void ed.removeAsset(a.id)} aria-label={`Remove ${a.name}`}>Remove</button></div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

const TEXT_STYLES: Array<{ name: string; hint: string; patch: Partial<Omit<T.TextLayer, "id">> }> = [
  { name: "Title", hint: "Big, centred", patch: { text: "Title", size: 0.14, y: 0.5, bold: true, box: false } },
  { name: "Subtitle", hint: "Lower third", patch: { text: "Subtitle", size: 0.07, y: 0.82, bold: false, box: true } },
  { name: "Callout", hint: "Yellow, top", patch: { text: "Look here", size: 0.08, y: 0.14, bold: true, color: "#ffd400" } },
];

function TextPanel({ ed, onAdd }: { ed: Ed; onAdd: (patch?: Partial<Omit<T.TextLayer, "id">>) => void }) {
  const texts = ed.doc.texts ?? [];
  return (
    <div>
      <button type="button" className="fs-btn fs-btn-primary" onClick={() => onAdd()}><Icon name="plus" size={18} /> Add text at playhead</button>
      <h3>Quick styles</h3>
      <div className="fs-styles">
        {TEXT_STYLES.map((st) => <button key={st.name} type="button" className="fs-style" onClick={() => onAdd(st.patch)}><strong>{st.name}</strong><span>{st.hint}</span></button>)}
      </div>
      <h3>Stickers</h3>
      <div className="fs-stickers" role="group" aria-label="Stickers">
        {STICKERS.map((st) => <button key={st.name} type="button" className="fs-sticker" aria-label={`Add ${st.name} sticker`} title={st.name} style={{ color: st.color }} onClick={() => onAdd(stickerLayer(st))}>{st.glyph}</button>)}
      </div>
      <p className="fs-muted">Single-colour symbols that you can move, resize, turn and recolour like text. Colour emoji and animated sticker packs are not available.</p>
      <h3>Text on this video</h3>
      <ul className="fs-bin">
        {texts.length === 0 && <li className="fs-muted">No text yet.</li>}
        {texts.map((t) => (
          <li key={t.id}>
            <button type="button" className="fs-linkbtn" onClick={() => { ed.setSelected(t.id); ed.setPlayhead(t.start); }} aria-label={`Select text ${t.text.slice(0, 30)}`}><strong>{t.text.split("\n")[0].slice(0, 40)}</strong><div className="fs-muted">{formatClock(t.start)} · {t.duration.toFixed(1)} s</div></button>
            <button type="button" className="fs-btn" aria-label={`Delete text ${t.text.slice(0, 30)}`} onClick={() => ed.edit((d) => T.deleteText(d, t.id))}>Delete</button>
          </li>
        ))}
      </ul>
      <p className="fs-muted">Text is drawn on the final video with the DejaVu Sans font. Pick a layer to restyle it; drag its block on the timeline to retime it.</p>
    </div>
  );
}

function OverlaysPanel({ ed, onAdd, onImport }: { ed: Ed; onAdd: (kind: "image" | "rect", assetId?: string) => void; onImport: () => void }) {
  const overlays = ed.doc.overlays ?? [];
  const pictures = ed.doc.assets.filter((a) => a.kind === "image");
  const nameOf = (o: T.OverlayLayer) => (o.kind === "rect" ? "Rectangle" : ed.doc.assets.find((a) => a.id === o.assetId)?.name ?? "Picture");
  return (
    <div>
      <button type="button" className="fs-btn fs-btn-primary" onClick={() => onAdd("rect")}><Icon name="plus" size={18} /> Add rectangle at playhead</button>
      <h3>Pictures</h3>
      <button type="button" className="fs-btn" onClick={onImport} disabled={!!ed.busy}><Icon name="import" size={18} /> Import a picture</button>
      <ul className="fs-bin">
        {pictures.length === 0 && <li className="fs-muted">No pictures yet. PNG, JPEG and WebP work; transparent PNGs keep their see-through parts.</li>}
        {pictures.map((a) => (
          <li key={a.id}>
            <div><strong>{a.name}</strong><div className="fs-muted">{a.width}×{a.height}{ed.media[a.id]?.missing ? " · not on this device" : ""}</div></div>
            <button type="button" className="fs-btn" onClick={() => onAdd("image", a.id)} disabled={!!ed.media[a.id]?.missing} aria-label={`Add ${a.name} to the video`}>Add to video</button>
          </li>
        ))}
      </ul>
      <h3>On this video</h3>
      <ul className="fs-bin">
        {overlays.length === 0 && <li className="fs-muted">No overlays yet.</li>}
        {overlays.map((o) => (
          <li key={o.id}>
            <button type="button" className="fs-linkbtn" onClick={() => { ed.setSelected(o.id); ed.setPlayhead(o.start); }} aria-label={`Select ${nameOf(o)}`}><strong>{nameOf(o)}</strong><div className="fs-muted">{formatClock(o.start)} · {o.duration.toFixed(1)} s</div></button>
            <button type="button" className="fs-btn" aria-label={`Delete ${nameOf(o)}`} onClick={() => ed.edit((d) => T.deleteOverlay(d, o.id))}>Delete</button>
          </li>
        ))}
      </ul>
      <p className="fs-muted">Overlays are drawn on the exported video above the footage and below text. Pictures are uploaded to the render service only when you export.</p>
    </div>
  );
}

function CaptionsPanel({ ed }: { ed: Ed }) {
  const status = getTranscriptionStatus();
  const file = useRef<HTMLInputElement>(null);
  const issues = useMemo(() => validateCues(ed.captions), [ed.captions]);
  const update = (id: string, patch: Partial<Cue>) => ed.setCaptions(ed.captions.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  const add = () => ed.setCaptions(normalizeCues([...ed.captions, { id: T.newId("cue"), start: ed.playhead, end: ed.playhead + 2, text: "New caption" }]));
  const importFile = async (f: File) => {
    const { cues, skipped } = parseCaptions(await f.text());
    if (cues.length === 0) return ed.notify("error", "No captions were found in that file. Use an SRT or VTT file.");
    ed.setCaptions(cues);
    if (skipped) ed.notify("info", `${skipped} entr${skipped === 1 ? "y was" : "ies were"} skipped because they could not be read.`);
  };
  return (
    <div>
      <p className="fs-muted" role="note">{status.available ? "Automatic captions are available." : status.reason}</p>
      <div className="fs-row">
        <input ref={file} type="file" accept=".srt,.vtt,text/vtt,text/plain" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void importFile(f); }} />
        <button type="button" className="fs-btn" onClick={() => file.current?.click()}>Import SRT/VTT</button>
        <button type="button" className="fs-btn" onClick={add}>＋ Add at playhead</button>
        <button type="button" className="fs-btn" disabled={!ed.captions.length} onClick={() => download(new Blob([serializeSrt(ed.captions)], { type: "text/plain" }), "captions.srt")}>Export SRT</button>
        <button type="button" className="fs-btn" disabled={!ed.captions.length} onClick={() => download(new Blob([serializeVtt(ed.captions)], { type: "text/vtt" }), "captions.vtt")}>Export VTT</button>
      </div>
      <p className="fs-muted">Imported captions are treated as timeline time. Burned into the video on export.</p>
      {issues.length > 0 && <p className="fs-warn" role="alert">{issues[0].message}</p>}
      <ul className="fs-cues">
        {ed.captions.length === 0 && <li className="fs-muted">No captions.</li>}
        {ed.captions.map((c) => (
          <li key={c.id}>
            <div className="fs-row">
              <input type="number" step="0.1" min="0" value={c.start} aria-label="Start seconds" onChange={(e) => update(c.id, { start: Number(e.target.value) })} />
              <input type="number" step="0.1" min="0" value={c.end} aria-label="End seconds" onChange={(e) => update(c.id, { end: Number(e.target.value) })} />
              <button type="button" className="fs-btn" aria-label="Delete caption" onClick={() => ed.setCaptions(ed.captions.filter((x) => x.id !== c.id))}>✕</button>
            </div>
            <textarea value={c.text} maxLength={200} rows={2} aria-label="Caption text" onChange={(e) => update(c.id, { text: e.target.value })} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function SmartPanel({ ed, clip }: { ed: Ed; clip: T.TimelineClip | null }) {
  const [noiseDb, setNoiseDb] = useState(-35);
  const [minSilence, setMinSilence] = useState(0.5);
  const [result, setResult] = useState("");
  const [every, setEvery] = useState(1);
  const [beatResult, setBeatResult] = useState("");
  const entry = clip ? ed.media[clip.assetId] : null;
  return (
    <div>
      <h3>Cut to the beat</h3>
      <p className="fs-muted">Select your music clip. Fresh finds its beat on this device and cuts the main video track on the beat, so your shots change with the music. Undo restores it.</p>
      <label className="fs-field"><span>Cut on</span><select value={every} onChange={(e) => setEvery(Number(e.target.value))}><option value={1}>every beat</option><option value={2}>every 2nd beat</option><option value={4}>every 4th beat (each bar)</option><option value={8}>every 8th beat</option></select></label>
      <button type="button" className="fs-btn fs-btn-primary" disabled={!clip || !entry?.samples} onClick={() => clip && setBeatResult(ed.cutToBeat(clip.id, every))}>Cut video to the beat of selected clip</button>
      {!clip && <p className="fs-muted">Select a clip on the timeline first.</p>}
      {beatResult && <p role="status">{beatResult}</p>}
      <h3>Remove silences</h3>
      <p className="fs-muted">Finds quiet gaps in the selected clip using audio analysed on this device, then cuts them out and closes the gaps. Undo restores everything.</p>
      <label className="fs-field"><span>Counts as silence below {noiseDb} dB</span><input type="range" min={-60} max={-15} value={noiseDb} onChange={(e) => setNoiseDb(Number(e.target.value))} /></label>
      <label className="fs-field"><span>Only gaps longer than {minSilence.toFixed(1)} s</span><input type="range" min={0.2} max={2} step={0.1} value={minSilence} onChange={(e) => setMinSilence(Number(e.target.value))} /></label>
      <button type="button" className="fs-btn fs-btn-primary" disabled={!clip || !entry?.samples} onClick={() => clip && setResult(ed.trimSilence(clip.id, { noiseDb, minSilence }))}>Remove silences from selected clip</button>
      {!clip && <p className="fs-muted">Select a clip on the timeline first.</p>}
      {clip && entry && !entry.samples && <p className="fs-warn">{entry.missing ? "This file is not stored on this device." : "This clip has no audio that can be analysed here."}</p>}
      {result && <p role="status">{result}</p>}
      <h3>Not available yet</h3>
      <ul className="fs-muted"><li>Automatic captions, background removal and AI scene editing need AI services that are not connected.</li></ul>
    </div>
  );
}

function ExportPanel({ ed, projectId, aspect, signedIn, notify }: { ed: Ed; projectId: string; aspect: string; signedIn: boolean; notify: Props["notify"] }) {
  const [caps, setCaps] = useState<WorkerCapabilities | null>(null);
  const [capsError, setCapsError] = useState<string | null>(null);
  const [preset, setPreset] = useState<ExportPresetId>("720p");
  const [stage, setStage] = useState<ExportStage | null>(null);
  const [detail, setDetail] = useState("");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Blob | null>(null);
  const abort = useRef<AbortController | null>(null);
  const ports = useMemo(() => createBrowserExportPorts(projectId), [projectId]);

  useEffect(() => {
    if (!signedIn) return;
    let alive = true;
    ports.getCapabilities().then((c) => { if (!alive) return; setCaps(c); if (!c.presets.includes(preset)) setPreset(c.presets[c.presets.length - 1] ?? "720p"); })
      .catch((e: unknown) => { if (alive) setCapsError(e instanceof Error ? e.message : "The render service is not reachable."); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ports, signedIn]);

  const opts = availableExportOptions(caps);
  const running = stage !== null;
  const start = async () => {
    setError(null); setResult(null); setProgress(0);
    const blobs = new Map<string, Blob>(), names = new Map<string, string>();
    for (const a of ed.doc.assets) { names.set(a.id, a.name); const b = ed.media[a.id]?.blob; if (b) blobs.set(a.id, b); }
    const ctl = new AbortController(); abort.current = ctl;
    try {
      const blob = await runExport(ports, { doc: ed.doc, preset, aspectRatio: aspect, captions: ed.captions, blobs, names }, { signal: ctl.signal, onStage: (s, d) => { setStage(s); setDetail(d ?? ""); }, onProgress: setProgress });
      setResult(blob); notify("info", "Your video is ready.");
    } catch (e) {
      if (e instanceof ExportCancelled) notify("info", "Export cancelled.");
      else setError(e instanceof ExportError || e instanceof Error ? e.message : "Export failed.");
    } finally { setStage(null); abort.current = null; }
  };

  if (!signedIn) return <p className="fs-warn" role="note">Sign in to export. Rendering runs on Fresh’s server, so it needs your account. Your edit is safe on this device.</p>;
  return (
    <div>
      <p className="fs-muted">Exports an MP4 rendered on the Fresh media worker. Your source files are uploaded privately for the render.</p>
      {capsError && <p className="fs-warn" role="alert">{capsError}</p>}
      {!caps && !capsError && <p className="fs-muted" role="status">Checking what the render service supports…</p>}
      {caps && (
        <>
          <label className="fs-field"><span>Quality</span><select value={preset} disabled={running} onChange={(e) => setPreset(e.target.value as ExportPresetId)}>{opts.presets.map((p) => <option key={p} value={p}>{p}</option>)}</select></label>
          <p className="fs-muted">Shape: <b>{aspect}</b>{opts.aspectRatios.includes(aspect) ? "" : " (not available on this worker)"}. Change it with the ratio menu under the preview.</p>
          {(ed.doc.texts ?? []).length > 0 && !caps.text && <p className="fs-warn" role="alert">This render worker cannot export text yet.</p>}
          <p className="fs-muted">Up to {caps.maxSeconds >= 120 ? `${Math.floor(caps.maxSeconds / 60)} min${caps.maxSeconds % 60 ? ` ${caps.maxSeconds % 60} s` : ""}` : `${caps.maxSeconds} seconds`} per export. 1440p and 4K are not offered because they are not verified yet.</p>
        </>
      )}
      <div className="fs-row">
        <button type="button" className="fs-btn fs-btn-primary" disabled={!caps || running || ed.duration <= 0} onClick={() => void start()}>{running ? "Exporting…" : "Export MP4"}</button>
        {running && <button type="button" className="fs-btn" onClick={() => abort.current?.abort()}>Cancel</button>}
      </div>
      {running && (
        <div role="status"><p>{stage === "checking" ? "Checking…" : stage === "uploading" ? `Uploading source ${detail}…` : stage === "rendering" ? "Rendering…" : "Downloading…"}</p><progress value={progress} max={1} aria-label="Export progress" /></div>
      )}
      {error && <p className="fs-warn" role="alert">{error}</p>}
      {result && <button type="button" className="fs-btn fs-btn-primary" onClick={() => download(result, "fresh-studio-export.mp4")}>Save video ({(result.size / 1048576).toFixed(1)} MB)</button>}
    </div>
  );
}

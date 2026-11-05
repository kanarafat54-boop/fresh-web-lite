import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { StudioProject } from "../shared/types.ts";
import type { StudioProjectService } from "../projects/projectService.ts";
import { getTranscriptionStatus, normalizeCues, parseCaptions, serializeSrt, serializeVtt, validateCues, type Cue } from "./captions.ts";
import { ExportCancelled, ExportError, availableExportOptions, runExport, type ExportStage, type WorkerCapabilities } from "./exportJob.ts";
import { createBrowserExportPorts } from "./renderClient.ts";
import type { ExportPresetId } from "./renderPlan.ts";
import { Icon, type IconName } from "./icons.tsx";
import { ANALYSIS_SAMPLE_RATE } from "./audioAnalysis.ts";
import { computePeaks, extractFilmstrip, filmstripCount, type Filmstrip } from "./mediaVisuals.ts";
import Timeline, { formatClock } from "./Timeline.tsx";
import * as T from "./timeline.ts";
import { useVideoEditor } from "./useVideoEditor.ts";

type Props = { project: StudioProject; service: StudioProjectService | null; onSaved: (p: StudioProject) => void; notify: (kind: "info" | "error", text: string) => void; onClose: () => void; signedIn: boolean };
type Tab = "media" | "captions" | "smart" | "export";

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 10000);
}
const isTyping = (t: EventTarget | null) => t instanceof HTMLElement && (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName));

const SPEEDS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4];
const PANELS: Array<{ id: Tab; label: string; icon: IconName }> = [
  { id: "media", label: "Media", icon: "media" },
  { id: "captions", label: "Captions", icon: "captions" },
  { id: "smart", label: "Smart edit", icon: "sparkles" },
  { id: "export", label: "Export", icon: "export" },
];

export default function VideoEditor({ project, service, onSaved, notify, onClose, signedIn }: Props) {
  const ed = useVideoEditor(project, service, onSaved, notify);
  const { doc, selected, playhead, duration, media } = ed;
  const [panel, setPanel] = useState<Tab | null>(() => (typeof window !== "undefined" && window.matchMedia?.("(min-width: 900px)").matches ? "media" : null));
  const [playing, setPlaying] = useState(false);
  const [pxPerSec, setPxPerSec] = useState(70);
  const [dropping, setDropping] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const videoEl = useRef<HTMLVideoElement>(null);
  const audioEl = useRef<HTMLAudioElement>(null);

  const videoTrack = doc.tracks.find((t) => t.kind === "video");
  const musicTrack = doc.tracks.find((t) => t.kind === "music");
  const activeVideo = videoTrack ? T.clipAt(doc, videoTrack.id, playhead) : null;
  const activeAudio = musicTrack ? T.clipAt(doc, musicTrack.id, playhead) : null;
  const selectedClip = doc.clips.find((c) => c.id === selected) ?? null;

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
    el.muted = muted; el.playbackRate = clip.speed;
    const target = clip.sourceIn + (at - clip.start) * clip.speed;
    if (Math.abs(el.currentTime - target) > (playing ? 0.35 : 0.04)) { try { el.currentTime = target; } catch { /* not seekable yet */ } }
  }, [media, playing]);

  useEffect(() => {
    sync(videoEl.current, activeVideo, !!videoTrack?.muted, playhead);
    sync(audioEl.current, activeAudio, !!musicTrack?.muted, playhead);
    for (const [el, clip] of [[videoEl.current, activeVideo], [audioEl.current, activeAudio]] as const) {
      if (!el) continue;
      if (playing && clip && media[clip.assetId]?.url) void el.play().catch(() => {}); else if (!el.paused) el.pause();
    }
  }, [playhead, playing, activeVideo?.id, activeAudio?.id, sync, activeVideo, activeAudio, videoTrack?.muted, musicTrack?.muted, media]);

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
    if (!selectedClip) return notify("error", "Select a clip first.");
    ed.edit((d) => T.deleteClip(d, selectedClip.id, ripple)); ed.setSelected(null);
  };
  const duplicate = () => { if (selectedClip) ed.edit((d) => T.duplicateClip(d, selectedClip.id)); else notify("error", "Select a clip first."); };
  const fit = () => {
    const el = document.querySelector(".fs-tl-scroll");
    const w = el instanceof HTMLElement ? el.clientWidth : 600;
    setPxPerSec(Math.max(10, Math.min(200, Math.floor((w - 40) / Math.max(duration, 5)))));
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e.target)) return;
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === "z") { e.preventDefault(); if (e.shiftKey) ed.redo(); else ed.undo(); }
      else if (mod && e.key.toLowerCase() === "y") { e.preventDefault(); ed.redo(); }
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

      <input ref={fileInput} type="file" accept="video/*,audio/*" multiple hidden onChange={(e) => { const files = Array.from(e.target.files ?? []); e.target.value = ""; if (files.length) void ed.importFiles(files); }} />

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
              {panel === "media" && <MediaPanel ed={ed} onImport={openImport} />}
              {panel === "captions" && <CaptionsPanel ed={ed} />}
              {panel === "smart" && <SmartPanel ed={ed} clip={selectedClip} />}
              {panel === "export" && <ExportPanel ed={ed} projectId={project.id} settings={project.meta.settings} signedIn={signedIn} notify={notify} />}
            </div>
          </>
        )}
      </aside>

      <section className="fs-stage" aria-label="Preview">
        <div className="fs-monitor" data-empty={!activeVideo}>
          <video ref={videoEl} playsInline preload="auto" aria-label="Video preview" style={{ visibility: activeVideo ? "visible" : "hidden" }} />
          {!activeVideo && (empty
            ? <button type="button" className="fs-empty-cta" onClick={openImport} disabled={!!ed.busy}><Icon name="import" size={30} /><strong>Import video or audio</strong><span>or drop files here</span></button>
            : <p className="fs-muted">No video at this point. Gaps render as black.</p>)}
          {ed.busy && <div className="fs-busy" role="status">{ed.busy}</div>}
        </div>
        <audio ref={audioEl} preload="auto" />
        <div className="fs-transport">
          <span className="fs-time fs-mono" aria-live="off"><b>{formatClock(playhead)}</b> / {formatClock(duration)}</span>
          <button type="button" className="fs-play" onClick={togglePlay} disabled={duration <= 0} aria-label={playing ? "Pause" : "Play"}><Icon name={playing ? "pause" : "play"} size={22} /></button>
          <span className="fs-transport-end" />
        </div>
      </section>

      <aside className="fs-inspector" aria-label="Clip settings">
        {selectedClip ? (
          <>
            <h2>Clip</h2>
            <p className="fs-inspector-name">{doc.assets.find((a) => a.id === selectedClip.assetId)?.name ?? "Clip"}</p>
            <dl className="fs-facts"><div><dt>Starts</dt><dd className="fs-mono">{formatClock(selectedClip.start)}</dd></div><div><dt>Length</dt><dd className="fs-mono">{formatClock(T.clipEnd(selectedClip) - selectedClip.start)}</dd></div></dl>
            <div className="fs-label">Speed</div>
            <div className="fs-chips" role="group" aria-label="Clip speed">
              {SPEEDS.map((sp) => <button key={sp} type="button" className={`fs-chip${selectedClip.speed === sp ? " is-active" : ""}`} aria-pressed={selectedClip.speed === sp} onClick={() => ed.edit((d) => T.setClipSpeed(d, selectedClip.id, sp))}>{sp}×</button>)}
            </div>
          </>
        ) : (
          <>
            <h2>Clip</h2>
            <p className="fs-muted">{empty ? "Import a video to start editing." : "Tap a clip on the timeline to change its speed, split, duplicate or delete it."}</p>
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
          <ToolBtn icon="trash" label="Delete" onClick={() => remove(false)} disabled={!selectedClip} />
          <ToolBtn icon="ripple" label="Ripple delete" short="Ripple" onClick={() => remove(true)} disabled={!selectedClip} title="Delete and close the gap" />
          <ToolBtn icon="copy" label="Duplicate" onClick={duplicate} disabled={!selectedClip} />
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

function MediaPanel({ ed, onImport }: { ed: Ed; onImport: () => void }) {
  const place = (assetId: string) => {
    const asset = ed.doc.assets.find((a) => a.id === assetId);
    if (!asset) return;
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
              <div className="fs-row"><button type="button" className="fs-btn" onClick={() => place(a.id)} disabled={!!entry?.missing}>Add</button><button type="button" className="fs-btn" onClick={() => void ed.removeAsset(a.id)} aria-label={`Remove ${a.name}`}>Remove</button></div>
            </li>
          );
        })}
      </ul>
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
  const entry = clip ? ed.media[clip.assetId] : null;
  return (
    <div>
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

function ExportPanel({ ed, projectId, settings, signedIn, notify }: { ed: Ed; projectId: string; settings: Record<string, string | number | boolean>; signedIn: boolean; notify: Props["notify"] }) {
  const [caps, setCaps] = useState<WorkerCapabilities | null>(null);
  const [capsError, setCapsError] = useState<string | null>(null);
  const [preset, setPreset] = useState<ExportPresetId>("720p");
  const [aspect, setAspect] = useState(String(settings.aspectRatio ?? "16:9"));
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
    ports.getCapabilities().then((c) => { if (!alive) return; setCaps(c); if (!c.presets.includes(preset)) setPreset(c.presets[c.presets.length - 1] ?? "720p"); if (!c.aspectRatios.includes(aspect)) setAspect(c.aspectRatios[0] ?? "16:9"); })
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
          <label className="fs-field"><span>Aspect ratio</span><select value={aspect} disabled={running} onChange={(e) => setAspect(e.target.value)}>{opts.aspectRatios.map((a) => <option key={a} value={a}>{a}</option>)}</select></label>
          <p className="fs-muted">Up to {caps.maxSeconds} seconds per export. 1440p and 4K are not offered because they are not verified yet.</p>
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

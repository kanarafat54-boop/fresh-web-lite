import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { StudioProject } from "../shared/types.ts";
import type { StudioProjectService } from "../projects/projectService.ts";
import { getTranscriptionStatus, normalizeCues, parseCaptions, serializeSrt, serializeVtt, validateCues, type Cue } from "./captions.ts";
import { ExportCancelled, ExportError, availableExportOptions, runExport, type ExportStage, type WorkerCapabilities } from "./exportJob.ts";
import { createBrowserExportPorts } from "./renderClient.ts";
import type { ExportPresetId } from "./renderPlan.ts";
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

export default function VideoEditor({ project, service, onSaved, notify, onClose, signedIn }: Props) {
  const ed = useVideoEditor(project, service, onSaved, notify);
  const { doc, selected, playhead, duration, media } = ed;
  const [tab, setTab] = useState<Tab>("media");
  const [playing, setPlaying] = useState(false);
  const [pxPerSec, setPxPerSec] = useState(60);
  const fileInput = useRef<HTMLInputElement>(null);
  const videoEl = useRef<HTMLVideoElement>(null);
  const audioEl = useRef<HTMLAudioElement>(null);

  const videoTrack = doc.tracks.find((t) => t.kind === "video");
  const musicTrack = doc.tracks.find((t) => t.kind === "music");
  const activeVideo = videoTrack ? T.clipAt(doc, videoTrack.id, playhead) : null;
  const activeAudio = musicTrack ? T.clipAt(doc, musicTrack.id, playhead) : null;
  const selectedClip = doc.clips.find((c) => c.id === selected) ?? null;

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
  const playheadRef = useRef(playhead); playheadRef.current = playhead;
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

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTyping(e.target)) return;
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === "z") { e.preventDefault(); e.shiftKey ? ed.redo() : ed.undo(); }
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

  const saveLabel = ed.saveState === "saved" ? "All changes saved" : ed.saveState === "saving" ? "Saving…" : ed.saveState === "conflict" ? "Changed elsewhere" : "Not saved";
  const storedWhere = service ? "" : " (not saving)";

  return (
    <div className="fs-editor" aria-label="Video editor">
      <header className="fs-ed-top">
        <button type="button" className="fs-btn" onClick={() => { void ed.flushNow(); onClose(); }}>← Project</button>
        <strong className="fs-ed-title">{project.name}</strong>
        <span className={`fs-save is-${ed.saveState}`} role="status">{saveLabel}{storedWhere}</span>
      </header>
      {ed.saveState === "conflict" && (
        <div className="fs-banner is-error" role="alert"><span>This project was changed somewhere else. Autosave is paused so nothing is overwritten.</span><button type="button" className="fs-btn" onClick={() => void ed.reloadLatest()}>Load latest version</button></div>
      )}

      <div className="fs-ed-main">
        <section className="fs-ed-stage" aria-label="Preview">
          <div className="fs-monitor" data-empty={!activeVideo}>
            <video ref={videoEl} playsInline preload="auto" aria-label="Video preview" style={{ visibility: activeVideo ? "visible" : "hidden" }} />
            {!activeVideo && <p className="fs-muted">{doc.clips.length === 0 ? "Import a video to start." : "No video at this point (gap renders as black)."}</p>}
          </div>
          <audio ref={audioEl} preload="auto" />
          <div className="fs-transport">
            <button type="button" className="fs-btn" onClick={togglePlay} disabled={duration <= 0} aria-label={playing ? "Pause" : "Play"}>{playing ? "⏸" : "▶"}</button>
            <span className="fs-time" aria-live="off">{formatClock(playhead)} / {formatClock(duration)}</span>
          </div>
        </section>

        <aside className="fs-ed-side">
          <div role="tablist" className="fs-tabs" aria-label="Editor panels">
            {([["media", "Media"], ["captions", "Captions"], ["smart", "Smart edit"], ["export", "Export"]] as const).map(([id, label]) => (
              <button key={id} type="button" role="tab" id={`tab-${id}`} aria-selected={tab === id} aria-controls={`panel-${id}`} className={tab === id ? "is-active" : ""} onClick={() => setTab(id)}>{label}</button>
            ))}
          </div>
          <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} className="fs-tabpanel">
            {tab === "media" && <MediaPanel ed={ed} fileInput={fileInput} />}
            {tab === "captions" && <CaptionsPanel ed={ed} />}
            {tab === "smart" && <SmartPanel ed={ed} clip={selectedClip} />}
            {tab === "export" && <ExportPanel ed={ed} projectId={project.id} settings={project.meta.settings} signedIn={signedIn} notify={notify} />}
          </div>
        </aside>
      </div>

      <div className="fs-ed-toolbar" role="toolbar" aria-label="Editing tools">
        <button type="button" className="fs-btn" onClick={ed.undo} disabled={!ed.canUndo} aria-label="Undo">↶ Undo</button>
        <button type="button" className="fs-btn" onClick={ed.redo} disabled={!ed.canRedo} aria-label="Redo">↷ Redo</button>
        <button type="button" className="fs-btn" onClick={split}>✂ Split</button>
        <button type="button" className="fs-btn" onClick={() => remove(false)} disabled={!selectedClip}>Delete</button>
        <button type="button" className="fs-btn" onClick={() => remove(true)} disabled={!selectedClip} title="Delete and close the gap">Ripple delete</button>
        <button type="button" className="fs-btn" onClick={duplicate} disabled={!selectedClip}>Duplicate</button>
        <label className="fs-inline">Speed
          <select value={selectedClip ? String(selectedClip.speed) : "1"} disabled={!selectedClip} onChange={(e) => selectedClip && ed.edit((d) => T.setClipSpeed(d, selectedClip.id, Number(e.target.value)))} aria-label="Clip speed">
            {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 2, 3, 4].map((s) => <option key={s} value={s}>{s}×</option>)}
          </select>
        </label>
        <label className="fs-inline">Zoom
          <input type="range" min={10} max={200} value={pxPerSec} onChange={(e) => setPxPerSec(Number(e.target.value))} aria-label="Timeline zoom" />
        </label>
      </div>

      <Timeline doc={doc} selected={selected} playhead={playhead} pxPerSec={pxPerSec} onSelect={ed.setSelected} onSeek={(t) => { setPlaying(false); ed.setPlayhead(Math.min(t, Math.max(duration, 0))); }} edit={ed.edit} />
      <p className="fs-muted fs-ed-hint">Shortcuts: Space play · S split · Delete remove · Shift+Delete ripple · ←/→ step frame · Ctrl+Z undo</p>
    </div>
  );
}

type Ed = ReturnType<typeof useVideoEditor>;

function MediaPanel({ ed, fileInput }: { ed: Ed; fileInput: React.RefObject<HTMLInputElement | null> }) {
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
      <input ref={fileInput} type="file" accept="video/*,audio/*" multiple hidden onChange={(e) => { const files = Array.from(e.target.files ?? []); e.target.value = ""; if (files.length) void ed.importFiles(files); }} />
      <button type="button" className="fs-btn fs-btn-primary" onClick={() => fileInput.current?.click()} disabled={!!ed.busy}>＋ Import video or audio</button>
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

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { StudioProject } from "../shared/types.ts";
import type { StudioProjectService } from "../projects/projectService.ts";
import {
  EDIT_LIMITS, MAX_AUDIO_SECONDS, MAX_MARKERS, audibleRangeMs, chaptersJson, chaptersText, encodeWav, exportFileName, formatClock,
  keptRange, keptSeconds, markersInExport, processChannels, readAudioEdit, toSettings, waveformPeaks, type AudioEdit, type Marker,
} from "./audioEdit.ts";

type Props = {
  project: StudioProject;
  service: StudioProjectService | null;
  onSaved: (project: StudioProject) => void;
  notify: (kind: "info" | "error", text: string) => void;
  onClose: () => void;
};
type Clip = { name: string; rate: number; channels: Float32Array[] };

const MAX_BYTES = 200 * 1024 * 1024;
const AudioCtor = (): typeof AudioContext | null => (typeof window === "undefined" ? null : window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext ?? null);

function download(blob: Blob, name: string) {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob); link.download = name; link.click();
  window.setTimeout(() => URL.revokeObjectURL(link.href), 4000);
}

/**
 * Audio editor for Studio audio and podcast projects: record or choose a file, trim, fade, level, mark chapters and export.
 * All of it runs in this browser. The edits are saved on the project, the recording stays on this device, so reopening a
 * project asks for the file again. Export is a WAV file plus an optional chapters file; publishing audio to Fresh Music or
 * Fresh Podcasts is not connected yet.
 */
export default function AudioEditor({ project, service, onSaved, notify, onClose }: Props) {
  const [edit, setEdit] = useState<AudioEdit>(() => readAudioEdit(project.meta.settings));
  const [clip, setClip] = useState<Clip | null>(null);
  const [save, setSave] = useState<"saved" | "saving" | "error">("saved");
  const [busy, setBusy] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const baseRef = useRef(project);
  const timer = useRef<number | null>(null);
  const latest = useRef(edit);
  latest.current = edit;
  const ctxRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const frame = useRef(0);

  const stopPlayback = useCallback(() => { try { sourceRef.current?.stop(); } catch { /* already stopped */ } sourceRef.current = null; cancelAnimationFrame(frame.current); setPlaying(false); }, []);
  useEffect(() => () => {
    if (timer.current) window.clearTimeout(timer.current);
    stopPlayback();
    recorderRef.current?.stream.getTracks().forEach((t) => t.stop());
    void ctxRef.current?.close().catch(() => undefined);
  }, [stopPlayback]);

  const persist = async () => {
    if (!service) return;
    setSave("saving");
    try {
      const saved = await service.updateSettings(baseRef.current, toSettings(latest.current));
      baseRef.current = saved; onSaved(saved); setSave("saved");
    } catch (error) { setSave("error"); notify("error", error instanceof Error ? error.message : "The edits could not be saved."); }
  };
  const change = (next: AudioEdit) => {
    setEdit(next); setSave("saving");
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => void persist(), 600);
  };

  const context = () => {
    const Ctor = AudioCtor();
    if (!Ctor) throw new Error("This browser cannot work with audio.");
    return (ctxRef.current ??= new Ctor());
  };
  const load = async (blob: Blob, name: string) => {
    setBusy("Reading the audio…"); stopPlayback();
    try {
      if (blob.size > MAX_BYTES) throw new Error("That file is larger than 200 MB. Choose a shorter recording.");
      const decoded = await context().decodeAudioData(await blob.arrayBuffer());
      if (decoded.duration > MAX_AUDIO_SECONDS) throw new Error(`Recordings are limited to ${MAX_AUDIO_SECONDS / 60} minutes.`);
      const channels = Array.from({ length: Math.min(2, decoded.numberOfChannels) }, (_, c) => decoded.getChannelData(c).slice());
      setClip({ name, rate: decoded.sampleRate, channels });
    } catch (error) {
      notify("error", error instanceof DOMException || !(error instanceof Error) ? "That audio could not be read. Try a WAV, MP3 or M4A file." : error.message);
    } finally { setBusy(null); }
  };
  const choose = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("audio/") && !/\.(wav|mp3|m4a|aac|ogg|opus|flac|webm)$/i.test(file.name)) return notify("error", "Choose an audio file (WAV, MP3, M4A, OGG).");
    void load(file, file.name);
  };

  const startRecording = async () => {
    try {
      if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) throw new Error("This browser cannot record audio. Choose a file instead.");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      const recorder = new MediaRecorder(stream), parts: Blob[] = [];
      recorder.ondataavailable = (e) => { if (e.data.size) parts.push(e.data); };
      recorder.onstop = () => { stream.getTracks().forEach((t) => t.stop()); setRecording(false); void load(new Blob(parts, { type: recorder.mimeType || "audio/webm" }), `Recording ${new Date().toLocaleTimeString()}`); };
      recorderRef.current = recorder; recorder.start(); setRecording(true);
    } catch (error) {
      notify("error", error instanceof DOMException && error.name === "NotAllowedError" ? "Microphone access was blocked. Allow it in your browser's site settings, or choose a file." : error instanceof Error ? error.message : "Recording could not start.");
    }
  };
  const stopRecording = () => recorderRef.current?.stop();

  const length = clip?.channels[0]?.length ?? 0;
  const totalSeconds = clip ? length / clip.rate : 0;
  const kept = clip ? keptSeconds(edit, length, clip.rate) : 0;
  const peaks = useMemo(() => (clip ? waveformPeaks(clip.channels, 300) : null), [clip]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !peaks || !clip) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    const { from, to } = keptRange(edit, length, clip.rate);
    for (let i = 0; i < peaks.length; i++) {
      const at = (i / peaks.length) * length, inside = at >= from && at < to;
      ctx.fillStyle = inside ? "#f2b84b" : "rgba(255,255,255,.22)";
      const bar = Math.max(1, peaks[i] * h * 0.9);
      ctx.fillRect((i / peaks.length) * w, (h - bar) / 2, Math.max(1, w / peaks.length - 1), bar);
    }
    ctx.fillStyle = "#4dd2ff";
    for (const m of edit.markers) { const x = ((m.ms / 1000) / totalSeconds) * w; ctx.fillRect(x, 0, 2, h); }
    if (playing) { ctx.fillStyle = "#fff"; ctx.fillRect(((edit.trimStartMs / 1000 + position) / totalSeconds) * w, 0, 2, h); }
  }, [peaks, clip, edit, length, playing, position, totalSeconds]);

  const play = () => {
    if (!clip) return;
    if (playing) return stopPlayback();
    try {
      const ctx = context(); void ctx.resume();
      const out = processChannels(clip.channels, clip.rate, edit);
      if (!out.length || !out[0].length) return notify("error", "There is nothing left to play. Widen the trim.");
      const buffer = ctx.createBuffer(out.length, out[0].length, clip.rate);
      out.forEach((c, i) => buffer.copyToChannel(c, i));
      const source = ctx.createBufferSource(); source.buffer = buffer; source.connect(ctx.destination);
      const startedAt = ctx.currentTime;
      source.onended = () => { cancelAnimationFrame(frame.current); setPlaying(false); setPosition(0); };
      source.start(); sourceRef.current = source; setPlaying(true);
      const tick = () => { setPosition(ctx.currentTime - startedAt); frame.current = requestAnimationFrame(tick); };
      tick();
    } catch (error) { notify("error", error instanceof Error ? error.message : "Playback failed."); }
  };

  const addMarker = () => {
    if (edit.markers.length >= MAX_MARKERS) return notify("error", `A project can have at most ${MAX_MARKERS} chapters.`);
    const ms = Math.round(edit.trimStartMs + (playing ? position : 0) * 1000);
    change({ ...edit, markers: [...edit.markers, { ms, name: `Chapter ${edit.markers.length + 1}` }].sort((a, b) => a.ms - b.ms) });
  };
  const renameMarker = (i: number, name: string) => change({ ...edit, markers: edit.markers.map((m, k) => (k === i ? { ...m, name } : m)) });
  const removeMarker = (i: number) => change({ ...edit, markers: edit.markers.filter((_, k) => k !== i) });
  const trimQuiet = () => {
    if (!clip) return;
    const r = audibleRangeMs(clip.channels, clip.rate);
    if (!r) return notify("info", "The whole recording is very quiet, so there is no sound to keep. Nothing was trimmed.");
    change({ ...edit, trimStartMs: r.startMs, trimEndMs: r.endMs >= Math.floor((length * 1000) / clip.rate) ? 0 : r.endMs });
  };

  const exportWav = () => {
    if (!clip) return;
    setBusy("Exporting…");
    window.setTimeout(() => { // let the busy label paint before the work
      try {
        const out = processChannels(clip.channels, clip.rate, edit);
        if (!out.length || !out[0].length) throw new Error("There is nothing to export. Widen the trim.");
        download(new Blob([encodeWav(out, clip.rate).buffer as ArrayBuffer], { type: "audio/wav" }), exportFileName(project.name, "wav"));
        notify("info", "Exported a WAV file. Your original recording was not changed.");
      } catch (error) { notify("error", error instanceof Error ? error.message : "Export failed."); }
      finally { setBusy(null); }
    }, 30);
  };
  const exportChapters = (kind: "json" | "txt") => {
    if (!clip) return;
    const marks: Marker[] = markersInExport(edit, length, clip.rate);
    if (!marks.length) return notify("error", "Add at least one chapter inside the kept part first.");
    download(new Blob([kind === "json" ? chaptersJson(marks) : chaptersText(marks)], { type: kind === "json" ? "application/json" : "text/plain" }), exportFileName(`${project.name}-chapters`, kind));
  };

  const range = (key: "fadeInMs" | "fadeOutMs", label: string) => (
    <label className="fs-field">{label} <output>{(edit[key] / 1000).toFixed(1)} s</output>
      <input type="range" min={EDIT_LIMITS.fadeMs[0]} max={Math.min(EDIT_LIMITS.fadeMs[1], Math.max(500, Math.floor(kept * 500)))} step={100} value={edit[key]} onChange={(e) => change({ ...edit, [key]: Number(e.target.value) })} />
    </label>
  );
  const totalMs = Math.floor(totalSeconds * 1000);
  const endShown = edit.trimEndMs > 0 ? edit.trimEndMs : totalMs;

  return (
    <div className="fs-details" aria-label="Audio editor">
      <header className="fs-section-head">
        <div>
          <button type="button" className="fs-link" onClick={onClose}>← Back to project</button>
          <h1>{project.name}</h1>
          <p className="fs-muted">Audio editor · edits are saved with the project{service?.backendKind === "device" ? " on this device" : ""}. The recording stays on this device.</p>
        </div>
        <span className={`fs-save is-${save}`} role="status">{save === "saved" ? "All changes saved" : save === "saving" ? "Saving…" : "Not saved"}</span>
      </header>
      <section className="fs-panel">
        <input ref={fileRef} type="file" accept="audio/*,.wav,.mp3,.m4a,.aac,.ogg,.opus,.flac" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; choose(f); }} />
        <div className="fs-actions">
          <button type="button" className="fs-btn fs-btn-primary" disabled={!!busy || recording} onClick={() => fileRef.current?.click()}>{clip ? "Choose a different file" : "Choose an audio file"}</button>
          {!recording ? <button type="button" className="fs-btn" disabled={!!busy} onClick={() => void startRecording()}>● Record with microphone</button>
            : <button type="button" className="fs-btn fs-btn-danger" onClick={stopRecording}>■ Stop recording</button>}
        </div>
        {recording && <p role="status">Recording… tap Stop when you are done.</p>}
        {busy && <p className="fs-muted" role="status">{busy}</p>}
        {!clip && !busy && !recording && <div className="fs-empty-hero"><p>Record your voice or choose a file to start. The audio stays on this device; your edits are saved on the project.</p></div>}
        {clip && (
          <>
            <canvas ref={canvasRef} className="fs-wave" width={900} height={140} role="img" aria-label={`Waveform of ${clip.name}. Gold is the part that is kept.`} />
            <p className="fs-muted">{clip.name} · {formatClock(totalMs)} long · keeping {formatClock(Math.round(kept * 1000))}</p>
            <div className="fs-actions">
              <button type="button" className="fs-btn fs-btn-primary" onClick={play}>{playing ? "■ Stop" : "▶ Play with edits"}</button>
              <button type="button" className="fs-btn" onClick={trimQuiet}>Cut quiet from both ends</button>
              <button type="button" className="fs-btn" onClick={() => change({ ...edit, trimStartMs: 0, trimEndMs: 0 })} disabled={!edit.trimStartMs && !edit.trimEndMs}>Keep everything</button>
            </div>
            <label className="fs-field">Start at <output>{formatClock(edit.trimStartMs)}</output>
              <input type="range" min={0} max={Math.max(0, endShown - 500)} step={100} value={Math.min(edit.trimStartMs, Math.max(0, endShown - 500))} onChange={(e) => change({ ...edit, trimStartMs: Number(e.target.value) })} />
            </label>
            <label className="fs-field">End at <output>{formatClock(endShown)}</output>
              <input type="range" min={Math.min(totalMs, edit.trimStartMs + 500)} max={totalMs} step={100} value={endShown} onChange={(e) => { const v = Number(e.target.value); change({ ...edit, trimEndMs: v >= totalMs ? 0 : v }); }} />
            </label>
            {range("fadeInMs", "Fade in")}
            {range("fadeOutMs", "Fade out")}
            <label className="fs-field">Volume <output>{edit.gainDb > 0 ? "+" : ""}{edit.gainDb} dB</output>
              <input type="range" min={EDIT_LIMITS.gainDb[0]} max={EDIT_LIMITS.gainDb[1]} step={1} value={edit.gainDb} onChange={(e) => change({ ...edit, gainDb: Number(e.target.value) })} />
            </label>
            <label className="fs-field"><input type="checkbox" checked={edit.normalize} onChange={(e) => change({ ...edit, normalize: e.target.checked })} /> Level the volume (raise the loudest moment to just below the limit)</label>

            <h3>Chapters</h3>
            <p className="fs-muted">Chapters are saved with the project and exported as a file for podcast and audiobook players. Press play, then add a chapter where the sound is.</p>
            <button type="button" className="fs-btn" onClick={addMarker}>＋ Add chapter {playing ? "here" : "at the start"}</button>
            <ul className="fs-list">
              {edit.markers.map((m, i) => (
                <li key={`${m.ms}-${i}`} className="fs-row">
                  <span>{formatClock(m.ms)}</span>
                  <input className="fs-input" aria-label={`Name of chapter at ${formatClock(m.ms)}`} maxLength={60} value={m.name} onChange={(e) => renameMarker(i, e.target.value)} />
                  <button type="button" className="fs-btn" onClick={() => removeMarker(i)} aria-label={`Remove chapter ${m.name}`}>Remove</button>
                </li>
              ))}
            </ul>

            <div className="fs-actions">
              <button type="button" className="fs-btn fs-btn-primary" disabled={!!busy} onClick={exportWav}>Export WAV</button>
              <button type="button" className="fs-btn" onClick={() => exportChapters("json")}>Chapters file (JSON)</button>
              <button type="button" className="fs-btn" onClick={() => exportChapters("txt")}>Chapters list (text)</button>
            </div>
            <p className="fs-muted">WAV files are large and uncompressed; convert to MP3 or M4A before uploading to a podcast host. Publishing audio to Fresh Music or Fresh Podcasts is not connected yet.</p>
          </>
        )}
      </section>
    </div>
  );
}

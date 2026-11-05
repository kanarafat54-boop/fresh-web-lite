import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { StudioProject } from "../shared/types.ts";
import { StudioConflictError, type StudioProjectService } from "../projects/projectService.ts";
import { removeSilences } from "./analysis.ts";
import { detectSilenceFromSamples, ANALYSIS_SAMPLE_RATE } from "./audioAnalysis.ts";
import type { Cue } from "./captions.ts";
import { importMediaFile, loadStoredMedia, removeStoredMedia, type MediaEntry } from "./mediaImport.ts";
import * as T from "./timeline.ts";

export type EditorSave = "saved" | "saving" | "conflict" | "error";
const AUTOSAVE_MS = 900;

export function useVideoEditor(project: StudioProject, service: StudioProjectService | null, onSaved: (p: StudioProject) => void, notify: (kind: "info" | "error", text: string) => void) {
  const initial = useMemo(() => {
    const stored = project.meta.timeline as T.TimelineDoc | null;
    return stored && T.validateTimeline(stored).length === 0 ? stored : T.createTimeline(30);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only the first load seeds the editor
  }, []);
  const [history, setHistory] = useState<T.History>(() => T.createHistory(initial));
  const [captions, setCaptionsState] = useState<Cue[]>(() => project.meta.captions.map((c) => ({ ...c })));
  const [selected, setSelected] = useState<string | null>(null);
  const [playhead, setPlayhead] = useState(0);
  const [media, setMedia] = useState<Record<string, MediaEntry>>({});
  const [saveState, setSaveState] = useState<EditorSave>("saved");
  const [busy, setBusy] = useState<string | null>(null);

  const doc = history.present;
  const docRef = useRef(doc); docRef.current = doc;
  const capRef = useRef(captions); capRef.current = captions;
  const baseRef = useRef(project);
  const dirty = useRef(false);
  const saving = useRef(false);
  /** Set after a conflict so autosave stops instead of overwriting someone else's work. */
  const blocked = useRef(false);
  const timer = useRef<number | null>(null);
  const flushRef = useRef<() => Promise<void>>(async () => {});
  const mediaRef = useRef(media); mediaRef.current = media;

  // Re-open media for assets already on the timeline.
  useEffect(() => {
    let alive = true;
    void (async () => {
      for (const asset of initial.assets) {
        const entry = await loadStoredMedia(project.id, asset);
        if (alive) setMedia((m) => ({ ...m, [asset.id]: entry })); else if (entry.url) URL.revokeObjectURL(entry.url);
      }
    })();
    return () => { alive = false; Object.values(mediaRef.current).forEach((m) => m.url && URL.revokeObjectURL(m.url)); };
  }, [initial, project.id]);

  const flush = useCallback(async () => {
    if (!service || saving.current || !dirty.current) return;
    saving.current = true; setSaveState("saving");
    const sentDoc = docRef.current, sentCaps = capRef.current;
    dirty.current = false;
    let ok = false;
    try {
      const saved = await service.saveEditor(baseRef.current, { timeline: sentDoc, captions: sentCaps });
      baseRef.current = saved; onSaved(saved);
      ok = true;
      setSaveState(dirty.current ? "saving" : "saved");
    } catch (error) {
      dirty.current = true;
      if (error instanceof StudioConflictError) { blocked.current = true; setSaveState("conflict"); }
      else { setSaveState("error"); notify("error", error instanceof Error ? error.message : "Could not save your edit."); }
    } finally {
      saving.current = false;
      if (ok && dirty.current && !blocked.current && !timer.current) timer.current = window.setTimeout(() => { timer.current = null; void flushRef.current(); }, AUTOSAVE_MS);
    }
  }, [service, onSaved, notify]);
  flushRef.current = flush;

  const markDirty = useCallback(() => {
    dirty.current = true;
    if (blocked.current) return;
    setSaveState("saving");
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => { timer.current = null; void flushRef.current(); }, AUTOSAVE_MS);
  }, []);
  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current); void flushRef.current(); }, []);

  /** Applies an edit; invalid edits are reported and leave the timeline unchanged. */
  const edit = useCallback((fn: (d: T.TimelineDoc) => T.TimelineDoc): boolean => {
    try {
      const next = fn(docRef.current);
      if (next === docRef.current) return false;
      docRef.current = next;
      setHistory((h) => T.commit(h, next));
      markDirty();
      return true;
    } catch (error) {
      notify("error", error instanceof Error ? error.message : "That edit is not possible.");
      return false;
    }
  }, [markDirty, notify]);

  const undo = useCallback(() => { setHistory((h) => { const n = T.undo(h); docRef.current = n.present; return n; }); markDirty(); }, [markDirty]);
  const redo = useCallback(() => { setHistory((h) => { const n = T.redo(h); docRef.current = n.present; return n; }); markDirty(); }, [markDirty]);

  const setCaptions = useCallback((next: Cue[]) => { capRef.current = next; setCaptionsState(next); markDirty(); }, [markDirty]);

  const importFiles = useCallback(async (files: File[]) => {
    for (const file of files) {
      setBusy(`Importing ${file.name}…`);
      try {
        const entry = await importMediaFile(file, project.id);
        setMedia((m) => ({ ...m, [entry.asset.id]: entry }));
        const ok = edit((d) => {
          const withAsset = T.addAsset(d, entry.asset);
          const track = entry.asset.kind === "audio" ? withAsset.tracks.find((t) => t.kind === "music") : withAsset.tracks.find((t) => t.kind === "video");
          if (!track) return withAsset;
          const end = T.trackClips(withAsset, track.id).reduce((m, c) => Math.max(m, T.clipEnd(c)), 0);
          return T.addClip(withAsset, { trackId: track.id, assetId: entry.asset.id, start: entry.asset.kind === "audio" ? 0 : end });
        });
        if (!ok) notify("error", `Could not add “${file.name}” to the timeline.`);
      } catch (error) {
        notify("error", error instanceof Error ? error.message : `Could not import ${file.name}.`);
      }
    }
    setBusy(null);
  }, [edit, notify, project.id]);

  const removeAsset = useCallback(async (assetId: string) => {
    const used = docRef.current.clips.some((c) => c.assetId === assetId);
    if (used) { notify("error", "This file is used on the timeline. Delete its clips first."); return; }
    edit((d) => ({ ...d, assets: d.assets.filter((a) => a.id !== assetId) }));
    const entry = mediaRef.current[assetId];
    if (entry?.url) URL.revokeObjectURL(entry.url);
    setMedia((m) => { const { [assetId]: _gone, ...rest } = m; return rest; });
    await removeStoredMedia(project.id, assetId);
  }, [edit, notify, project.id]);

  /** On-device silence removal for one clip. Returns a plain-language result. */
  const trimSilence = useCallback((clipId: string, opts: { noiseDb: number; minSilence: number }) => {
    const clip = docRef.current.clips.find((c) => c.id === clipId);
    const entry = clip ? mediaRef.current[clip.assetId] : null;
    if (!clip || !entry) return "Select a clip first.";
    if (!entry.samples) return entry.missing ? "This file is not stored on this device." : "This clip has no audio that could be analysed here.";
    const silences = detectSilenceFromSamples(entry.samples, ANALYSIS_SAMPLE_RATE, opts);
    if (silences.length === 0) return "No silences that long were found at this sensitivity.";
    let message = "";
    edit((d) => { const r = removeSilences(d, clipId, silences); message = r.cuts === 0 ? "Nothing to remove." : `Removed ${r.removedSeconds.toFixed(1)} s of silence in ${r.cuts} cut${r.cuts === 1 ? "" : "s"}. Undo restores it.`; return r.cuts === 0 ? d : r.doc; });
    return message;
  }, [edit]);

  const duration = T.timelineDuration(doc);
  useEffect(() => { setPlayhead((p) => Math.min(p, duration)); }, [duration]);

  const reloadLatest = useCallback(async () => {
    if (!service) return;
    const fresh = await service.get(project.id);
    if (!fresh) return;
    baseRef.current = fresh; onSaved(fresh);
    const stored = fresh.meta.timeline as T.TimelineDoc | null;
    const next = stored && T.validateTimeline(stored).length === 0 ? stored : T.createTimeline(30);
    docRef.current = next; setHistory(T.createHistory(next));
    setCaptionsState(fresh.meta.captions.map((c) => ({ ...c }))); dirty.current = false; blocked.current = false; setSaveState("saved");
  }, [service, project.id, onSaved]);

  return { notify, doc, history, captions, setCaptions, selected, setSelected, playhead, setPlayhead, duration, media, saveState, busy, edit, undo, redo, canUndo: T.canUndo(history), canRedo: T.canRedo(history), importFiles, removeAsset, trimSilence, reloadLatest, flushNow: () => flushRef.current() };
}

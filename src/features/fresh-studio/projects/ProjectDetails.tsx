import { useCallback, useEffect, useRef, useState } from "react";
import { MEDIA_KIND_LABELS, STATUS_LABELS, STUDIO_STATUSES, type StudioProject, type StudioProjectVersion, type StudioStatus } from "../shared/types.ts";
import { settingFieldsFor } from "../shared/projectSettings.ts";
import { formatRelativeTime } from "../shared/format.ts";
import { StudioConflictError, isTrashed } from "./projectService.ts";
import { describeError } from "./useProjectActions.ts";
import type { OpenOptions, StudioScreenProps } from "../shared/context.ts";
import VideoEditor from "../video-studio/VideoEditor.tsx";

type SaveState = "saved" | "saving" | "conflict" | "error";
const AUTOSAVE_MS = 800;

type Props = StudioScreenProps & { projectId: string; startOpen?: OpenOptions };

export default function ProjectDetails({ projectId, startOpen, state, notify, goto, openDeviceEditor, navigateRoute }: Props) {
  const stored = state.projects.find((p) => p.id === projectId) ?? null;
  const service = state.service;

  // Local draft of the editable fields; `base` is the last version known to be saved.
  const [base, setBase] = useState<StudioProject | null>(stored);
  const [name, setName] = useState(stored?.name ?? "");
  const [status, setStatus] = useState<StudioStatus>(stored?.meta.status ?? "planning");
  const [settings, setSettings] = useState<Record<string, string | number | boolean>>(stored?.meta.settings ?? {});
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [editing, setEditing] = useState(Boolean(startOpen?.editor));
  const [versions, setVersions] = useState<StudioProjectVersion[]>([]);
  const [checkpointLabel, setCheckpointLabel] = useState("");
  const timer = useRef<number | null>(null);
  const saving = useRef(false);
  // `baseRef` always holds the last version known to be saved, updated synchronously (state lags a render).
  const baseRef = useRef<StudioProject | null>(base);
  const latest = useRef({ name, status, settings });
  latest.current = { name, status, settings };
  // Always points at the newest flush so timers and unmount never call a stale closure.
  const flushRef = useRef<() => Promise<void>>(async () => {});

  const adopt = useCallback((p: StudioProject) => {
    baseRef.current = p;
    setBase(p); setName(p.name); setStatus(p.meta.status); setSettings(p.meta.settings);
  }, []);

  // First load of this project (e.g. the list was still loading when the screen opened).
  useEffect(() => { if (!base && stored) adopt(stored); }, [base, stored, adopt]);

  const loadVersions = useCallback(async () => {
    if (!service) return;
    try { setVersions(await service.listVersions(projectId)); } catch (e) { notify("error", describeError(e)); }
  }, [service, projectId, notify]);
  useEffect(() => { void loadVersions(); }, [loadVersions]);

  const isDirty = () => {
    const b = baseRef.current;
    const { name: n, status: st, settings: se } = latest.current;
    return !!b && (n !== b.name || st !== b.meta.status || JSON.stringify(se) !== JSON.stringify(b.meta.settings));
  };

  const flush = useCallback(async () => {
    const b = baseRef.current;
    if (!service || !b || saving.current) return;
    if (!isDirty()) { setSaveState("saved"); return; }
    const { name: n, status: st, settings: se } = latest.current;
    saving.current = true;
    setSaveState("saving");
    let ok = false;
    try {
      const saved = await service.update(b, { name: n, status: st, settings: se });
      baseRef.current = saved;
      setBase(saved);
      state.applyUpdate(saved);
      await service.checkpoint(saved);
      void loadVersions();
      ok = true;
      setSaveState("saved");
    } catch (error) {
      if (error instanceof StudioConflictError) { setSaveState("conflict"); }
      else { setSaveState("error"); notify("error", describeError(error)); }
    } finally {
      saving.current = false;
    }
    // Edits typed while this save was in flight still need saving.
    if (ok && isDirty()) {
      setSaveState("saving");
      timer.current = window.setTimeout(() => { void flushRef.current(); }, AUTOSAVE_MS);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps -- isDirty only reads refs
  }, [service, state, loadVersions, notify]);
  flushRef.current = flush;

  const schedule = useCallback(() => {
    setSaveState("saving");
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => { void flushRef.current(); }, AUTOSAVE_MS);
  }, []);

  // Never lose pending edits when leaving the screen (spec §18: Back returns without losing work).
  useEffect(() => () => {
    if (timer.current) { window.clearTimeout(timer.current); timer.current = null; }
    void flushRef.current();
  }, []);

  const reloadFromServer = async () => {
    if (!service) return;
    const fresh = await service.get(projectId);
    if (fresh) { adopt(fresh); state.applyUpdate(fresh); setSaveState("saved"); notify("info", "Loaded the latest version."); }
  };

  const createCheckpoint = async () => {
    if (!service || !base) return;
    if (timer.current) { window.clearTimeout(timer.current); await flush(); }
    try {
      await service.checkpoint(baseRef.current ?? base, checkpointLabel.trim() || "Checkpoint");
      setCheckpointLabel("");
      notify("info", "Checkpoint saved.");
      void loadVersions();
    } catch (e) { notify("error", describeError(e)); }
  };

  const restoreVersion = async (v: StudioProjectVersion) => {
    if (!service || !baseRef.current) return;
    try {
      const restored = await service.restoreVersion(baseRef.current, v);
      adopt(restored); state.applyUpdate(restored);
      notify("info", `Restored version ${v.version}. Your previous state was kept in history.`);
      void loadVersions();
    } catch (e) { notify("error", describeError(e)); if (e instanceof StudioConflictError) setSaveState("conflict"); }
  };

  if (state.loading) return <p className="fs-muted" role="status">Loading project…</p>;
  if (!base) {
    return (
      <div className="fs-empty-hero">
        <h2>Project not found</h2>
        <p>It may have been deleted or belongs to another account.</p>
        <button type="button" className="fs-btn" onClick={() => goto("projects")}>Back to projects</button>
      </div>
    );
  }

  const trashed = isTrashed(base);
  if (editing && !trashed && base.meta.kind === "video") {
    // Flush any pending detail edits first so the editor starts from the newest saved version.
    return <VideoEditor key={base.id} project={baseRef.current ?? base} service={service} signedIn={state.source === "account"} notify={notify}
      onSaved={(p) => { baseRef.current = p; setBase(p); state.applyUpdate(p); }} onClose={() => setEditing(false)} initialPanel={startOpen?.panel} onOpenShorts={() => navigateRoute("creator")} />;
  }
  const fields = settingFieldsFor(base.meta.kind);
  const saveLabel = saveState === "saved" ? "All changes saved" : saveState === "saving" ? "Saving…" : saveState === "conflict" ? "Changed elsewhere" : "Not saved";

  return (
    <div className="fs-details">
      <header className="fs-section-head">
        <div>
          <button type="button" className="fs-link" onClick={() => goto("projects")}>← Projects</button>
          <h1>{name || "Untitled"}</h1>
          <p className="fs-muted">{MEDIA_KIND_LABELS[base.meta.kind]} · version {base.version} · {state.source === "account" ? "saved to your account" : "stored on this device only"}</p>
        </div>
        <span className={`fs-save is-${saveState}`} role="status">{saveLabel}</span>
      </header>

      {saveState === "conflict" && (
        <div className="fs-banner is-error" role="alert">
          <span>This project was changed somewhere else. Your edits were not saved so nothing was overwritten.</span>
          <button type="button" className="fs-btn" onClick={() => void reloadFromServer()}>Load latest version</button>
        </div>
      )}
      {trashed && <p className="fs-banner" role="note">This project is in the trash. Restore it from Projects to edit it.</p>}

      {!trashed && base.meta.kind === "video" && (
        <section className="fs-panel" aria-label="Video editor">
          <h2>Video editor</h2>
          <p className="fs-muted">Cut, trim, speed up and caption your footage. Files stay on this device; exporting renders an MP4 on the Fresh media worker.</p>
          <button type="button" className="fs-btn fs-btn-primary" onClick={async () => { if (timer.current) { window.clearTimeout(timer.current); timer.current = null; } await flushRef.current(); setEditing(true); }}>
            {base.meta.timeline ? "Continue editing" : "Open editor"}
          </button>
        </section>
      )}

      <section className="fs-panel" aria-label="Project details">
        <h2>Details</h2>
        <div className="fs-form-grid">
          <label className="fs-field"><span>Project name</span>
            <input value={name} maxLength={120} disabled={trashed} onChange={(e) => { setName(e.target.value); schedule(); }} />
          </label>
          <label className="fs-field"><span>Status</span>
            <select value={status} disabled={trashed} onChange={(e) => { setStatus(e.target.value as StudioStatus); schedule(); }}>
              {STUDIO_STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
            </select>
          </label>
          {fields.map((f) => f.type === "select" ? (
            <label key={f.key} className="fs-field"><span>{f.label}</span>
              <select value={String(settings[f.key] ?? f.default)} disabled={trashed} onChange={(e) => { setSettings((s) => ({ ...s, [f.key]: e.target.value })); schedule(); }}>
                {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </label>
          ) : (
            <label key={f.key} className="fs-field"><span>{f.label}</span>
              <input type="number" inputMode="numeric" min={f.min} max={f.max} disabled={trashed} value={Number(settings[f.key] ?? f.default)} onChange={(e) => { setSettings((s) => ({ ...s, [f.key]: Number(e.target.value) })); schedule(); }} />
            </label>
          ))}
        </div>
      </section>

      {base.meta.kind !== "video" && (
        <section className="fs-panel" aria-label="Open in an editor">
          <h2>Editing</h2>
          <p className="fs-muted">A Studio editor for this kind of project is not built yet. You can use the existing tools; they are not linked to this project&apos;s files.</p>
          <div className="fs-actions">
            <button type="button" className="fs-btn" onClick={openDeviceEditor}>Open device editor</button>
            <button type="button" className="fs-btn" onClick={() => navigateRoute("ai")}>Open Fresh AI</button>
          </div>
        </section>
      )}

      <section className="fs-panel" aria-label="Version history">
        <h2>Version history</h2>
        <div className="fs-inline-form">
          <label className="fs-field fs-grow"><span className="fs-sr">Checkpoint name</span>
            <input value={checkpointLabel} maxLength={120} placeholder="Name a checkpoint, e.g. “Before color grade”" disabled={trashed} onChange={(e) => setCheckpointLabel(e.target.value)} />
          </label>
          <button type="button" className="fs-btn" disabled={trashed} onClick={() => void createCheckpoint()}>Save checkpoint</button>
        </div>
        {versions.length === 0 ? <p className="fs-empty">No versions yet. Changes you make are recorded here.</p> : (
          <ul className="fs-versions">
            {versions.slice(0, 30).map((v) => (
              <li key={v.id}>
                <div>
                  <strong>{v.label ?? (v.kind === "autosave" ? "Autosave" : v.kind === "restore" ? "Restore point" : "Checkpoint")}</strong>
                  <small className="fs-muted"> · v{v.version} · {v.snapshot.name} · {formatRelativeTime(v.createdAt)}</small>
                </div>
                <button type="button" className="fs-btn" disabled={trashed} onClick={() => void restoreVersion(v)}>Restore</button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

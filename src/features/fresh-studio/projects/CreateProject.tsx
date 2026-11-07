import { useMemo, useState } from "react";
import { MEDIA_KIND_LABELS, STARTING_POINTS, STUDIO_MEDIA_KINDS, type StudioMediaKind, type StudioStartingPoint } from "../shared/types.ts";
import { defaultSettingsFor, settingFieldsFor, validateSettings } from "../shared/projectSettings.ts";
import { KIND_GLYPH } from "../shared/format.ts";
import { describeError } from "./useProjectActions.ts";
import QuickStart from "./QuickStart.tsx";
import { hasStudioEditor } from "../shared/studioNav.ts";
import type { StudioScreenProps } from "../shared/context.ts";

const KIND_HINTS: Record<StudioMediaKind, string> = {
  video: "Shorts, long videos, tutorials and films",
  image: "Photos, artwork and illustrations",
  audio: "Music and sound",
  podcast: "Record and edit episodes",
  animation3d: "3D scenes and animation",
  design: "Posters, thumbnails and branding",
  live: "Broadcast production",
  custom: "Start empty and decide later",
};

const START_LABELS: Record<StudioStartingPoint, { label: string; available: boolean; note?: string }> = {
  blank: { label: "Blank project", available: true },
  template: { label: "Template", available: false, note: "Templates are not available yet." },
  import: { label: "Import existing media", available: true, note: "Creates the project, then opens the device editor to import." },
  continue: { label: "Continue an existing project", available: false, note: "Open it from Projects instead." },
  ai: { label: "Start with Fresh AI", available: true, note: "Creates the project, then opens Fresh AI." },
};

type Step = 1 | 2 | 3;

export default function CreateProject({ state, notify, openProject, navigateRoute, openDeviceEditor, goto }: StudioScreenProps) {
  const [step, setStep] = useState<Step>(1);
  const [kind, setKind] = useState<StudioMediaKind | null>(null);
  const [name, setName] = useState("");
  const [values, setValues] = useState<Record<string, string | number>>({});
  const [start, setStart] = useState<StudioStartingPoint>("blank");
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const fields = useMemo(() => (kind ? settingFieldsFor(kind) : []), [kind]);
  const merged = useMemo(() => (kind ? { ...defaultSettingsFor(kind), ...values } : {}), [kind, values]);

  const pickKind = (k: StudioMediaKind) => { setKind(k); setValues({}); setErrors([]); setStart("blank"); setStep(2); };

  const toConfirm = () => {
    if (!kind) return;
    const found: string[] = [];
    if (!name.trim()) found.push("Give the project a name.");
    const v = validateSettings(kind, merged);
    if (!v.ok) found.push(...v.errors);
    setErrors(found);
    if (!found.length) setStep(3);
  };

  const create = async () => {
    if (!kind || !state.service || busy) return;
    setBusy(true);
    try {
      const project = await state.service.create({ name, kind, settings: merged, startingPoint: start });
      state.applyUpdate(project);
      notify("info", `“${project.name}” created.`);
      if (start === "ai") navigateRoute("ai");
      else if (start === "import") openDeviceEditor();
      else openProject(project, { editor: hasStudioEditor(project.meta.kind) });
    } catch (error) {
      setErrors([describeError(error)]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fs-create">
      <header className="fs-section-head">
        <div><h1>Create</h1>{step > 1 && <p className="fs-muted" aria-live="polite">Step {step - 1} of 2</p>}</div>
        <button type="button" className="fs-link" onClick={() => goto("projects")}>Cancel</button>
      </header>
      <ol className="fs-steps" aria-label="Progress" hidden={step === 1}>
        {["Choose what to create", "Project settings", "Starting point"].map((label, i) => (
          <li key={label} className={step === i + 1 ? "is-active" : step > i + 1 ? "is-done" : ""} aria-current={step === i + 1 ? "step" : undefined}>{label}</li>
        ))}
      </ol>

      {step === 1 && (
        <>
          <section aria-label="Make a video" className="fs-create-video">
            <h2>Make a video</h2>
            <p className="fs-muted">One tap — the editor opens ready for your clips.</p>
            <QuickStart state={state} notify={notify} openProject={openProject} />
            <button type="button" className="fs-link" onClick={() => pickKind("video")}>Custom video settings…</button>
          </section>
          <section aria-label="Other project types">
            <h2>Other project types</h2>
            <p className="fs-muted">These create a project record for planning. Their editors are not built yet.</p>
            <div className="fs-kind-grid">
              {STUDIO_MEDIA_KINDS.filter((k) => !hasStudioEditor(k)).map((k) => (
                <button key={k} type="button" className="fs-kind" onClick={() => pickKind(k)}>
                  <span className="fs-kind-glyph" aria-hidden="true">{KIND_GLYPH[k]}</span>
                  <strong>{MEDIA_KIND_LABELS[k]}</strong>
                  <small>{KIND_HINTS[k]}</small>
                  <span className="fs-tag">Planning only</span>
                </button>
              ))}
            </div>
          </section>
        </>
      )}

      {step === 2 && kind && (
        <form className="fs-form" onSubmit={(e) => { e.preventDefault(); toConfirm(); }}>
          <label className="fs-field"><span>Project name</span>
            <input value={name} maxLength={120} autoFocus onChange={(e) => setName(e.target.value)} placeholder={`My ${MEDIA_KIND_LABELS[kind].toLowerCase()} project`} />
          </label>
          {fields.length === 0 && <p className="fs-muted">Custom projects have no preset settings.</p>}
          <div className="fs-form-grid">
            {fields.map((f) => f.type === "select" ? (
              <label key={f.key} className="fs-field"><span>{f.label}</span>
                <select value={String(merged[f.key] ?? f.default)} onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}>
                  {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </label>
            ) : (
              <label key={f.key} className="fs-field"><span>{f.label}</span>
                <input type="number" inputMode="numeric" min={f.min} max={f.max} value={Number(merged[f.key] ?? f.default)} onChange={(e) => setValues((v) => ({ ...v, [f.key]: Number(e.target.value) }))} />
              </label>
            ))}
          </div>
          {errors.length > 0 && <ul className="fs-errors" role="alert">{errors.map((e) => <li key={e}>{e}</li>)}</ul>}
          <div className="fs-form-actions">
            <button type="button" className="fs-btn" onClick={() => setStep(1)}>Back</button>
            <button type="submit" className="fs-btn fs-btn-primary">Next</button>
          </div>
        </form>
      )}

      {step === 3 && kind && (
        <div className="fs-form">
          <fieldset className="fs-radios">
            <legend>How do you want to start “{name.trim()}”?</legend>
            {STARTING_POINTS.map((sp) => {
              const info = START_LABELS[sp];
              return (
                <label key={sp} className={`fs-radio${!info.available ? " is-disabled" : ""}`}>
                  <input type="radio" name="start" value={sp} checked={start === sp} disabled={!info.available} onChange={() => setStart(sp)} />
                  <span><strong>{info.label}</strong>{info.note && <small>{info.note}</small>}</span>
                </label>
              );
            })}
          </fieldset>
          {state.source === "device" && <p className="fs-banner" role="note">This project will be saved on this device only.</p>}
          {errors.length > 0 && <ul className="fs-errors" role="alert">{errors.map((e) => <li key={e}>{e}</li>)}</ul>}
          <div className="fs-form-actions">
            <button type="button" className="fs-btn" onClick={() => setStep(2)} disabled={busy}>Back</button>
            <button type="button" className="fs-btn fs-btn-primary" onClick={() => void create()} disabled={busy || !state.service}>{busy ? "Creating…" : "Create project"}</button>
          </div>
        </div>
      )}
    </div>
  );
}

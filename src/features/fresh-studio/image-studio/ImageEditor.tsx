import { useEffect, useMemo, useRef, useState } from "react";
import type { StudioProject } from "../shared/types.ts";
import type { StudioProjectService } from "../projects/projectService.ts";
import { stageStudioExport, STUDIO_HANDOFF_ACTION } from "../../creator/core/studioHandoff.ts";
import { ADJUST_LIMITS, cssFilter, DEFAULT_ADJUST, exportFileName, isDefault, outputSize, readAdjust, rotate, type ImageAdjust } from "./imageAdjust.ts";

type Props = {
  project: StudioProject;
  service: StudioProjectService | null;
  onSaved: (project: StudioProject) => void;
  notify: (kind: "info" | "error", text: string) => void;
  onClose: () => void;
  /** Opens the Studio Publish page, where the edited picture arrives attached. */
  onOpenPublish: () => void;
};

const MAX_BYTES = 40 * 1024 * 1024;

/**
 * Photo editor for Studio image projects. The adjustments are saved on the project, so reopening it brings them back.
 * The picture itself stays on this device: reopening a project asks for the file again.
 */
export default function ImageEditor({ project, service, onSaved, notify, onClose, onOpenPublish }: Props) {
  const [adjust, setAdjust] = useState<ImageAdjust>(() => readAdjust(project.meta.settings));
  const [url, setUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [save, setSave] = useState<"saved" | "saving" | "error">("saved");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const baseRef = useRef(project);
  const timer = useRef<number | null>(null);
  const latest = useRef(adjust);
  latest.current = adjust;

  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);
  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current); }, []);

  const persist = async () => {
    if (!service) return;
    setSave("saving");
    try {
      const saved = await service.updateSettings(baseRef.current, { ...latest.current });
      baseRef.current = saved; onSaved(saved); setSave("saved");
    } catch (error) {
      setSave("error");
      notify("error", error instanceof Error ? error.message : "The adjustments could not be saved.");
    }
  };
  const change = (next: ImageAdjust) => {
    setAdjust(next);
    setSave("saving");
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => void persist(), 600);
  };

  const choose = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) return notify("error", "Choose a picture file (JPEG, PNG, WebP).");
    if (file.size > MAX_BYTES) return notify("error", "That picture is larger than 40 MB. Choose a smaller one.");
    if (url) URL.revokeObjectURL(url);
    setUrl(URL.createObjectURL(file)); setFileName(file.name);
  };

  const render = (): Promise<Blob> => new Promise((resolve, reject) => {
    if (!url) return reject(new Error("Choose a picture first."));
    const image = new Image();
    image.onload = () => {
      const { width, height } = outputSize(image.naturalWidth, image.naturalHeight, adjust.rotation);
      const canvas = document.createElement("canvas");
      canvas.width = width; canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("This browser could not export the picture."));
      ctx.filter = cssFilter(adjust);
      ctx.translate(width / 2, height / 2);
      ctx.rotate((adjust.rotation * Math.PI) / 180);
      ctx.drawImage(image, -image.naturalWidth / 2, -image.naturalHeight / 2);
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("The export failed. Your original was not changed."))), "image/png");
    };
    image.onerror = () => reject(new Error("The picture could not be read."));
    image.src = url;
  });

  const exportCopy = async () => {
    setBusy(true);
    try {
      const blob = await render();
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob); link.download = exportFileName(fileName, project.name);
      link.click(); window.setTimeout(() => URL.revokeObjectURL(link.href), 4000);
      notify("info", "Exported a PNG copy. Your original file was not changed.");
    } catch (error) { notify("error", error instanceof Error ? error.message : "Export failed."); }
    finally { setBusy(false); }
  };

  const sendToPublish = async () => {
    setBusy(true);
    try {
      const blob = await render();
      stageStudioExport(new File([blob], exportFileName(fileName, project.name), { type: "image/png" }));
      try { sessionStorage.setItem("fresh-flow-create-intent", JSON.stringify({ action: STUDIO_HANDOFF_ACTION, requestedAt: new Date().toISOString() })); } catch { /* publish then opens without the picture and says so */ }
      onOpenPublish();
    } catch (error) { notify("error", error instanceof Error ? error.message : "Could not prepare the picture."); }
    finally { setBusy(false); }
  };

  const preview = useMemo(() => ({ filter: cssFilter(adjust), transform: `rotate(${adjust.rotation}deg)` }), [adjust]);
  const slider = (key: "brightness" | "contrast" | "saturation", label: string) => (
    <label className="fs-field">{label} <output>{adjust[key]}%</output>
      <input type="range" min={ADJUST_LIMITS[key][0]} max={ADJUST_LIMITS[key][1]} value={adjust[key]} onChange={(e) => change({ ...adjust, [key]: Number(e.target.value) })} />
    </label>
  );

  return (
    <div className="fs-details" aria-label="Photo editor">
      <header className="fs-section-head">
        <div>
          <button type="button" className="fs-link" onClick={onClose}>← Back to project</button>
          <h1>{project.name}</h1>
          <p className="fs-muted">Photo editor · adjustments are saved with the project{service?.backendKind === "device" ? " on this device" : ""}.</p>
        </div>
        <span className={`fs-save is-${save}`} role="status">{save === "saved" ? "All changes saved" : save === "saving" ? "Saving…" : "Not saved"}</span>
      </header>
      <section className="fs-panel">
        {url ? <img src={url} alt={`Preview of ${fileName}`} style={{ ...preview, maxWidth: "100%", maxHeight: "50vh", objectFit: "contain" }} /> : (
          <div className="fs-empty-hero"><p>The picture stays on this device. Choose it to continue editing.</p></div>
        )}
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; choose(f); }} />
        <div className="fs-actions">
          <button type="button" className="fs-btn fs-btn-primary" onClick={() => fileRef.current?.click()}>{url ? "Choose a different picture" : "Choose a picture"}</button>
          <button type="button" className="fs-btn" onClick={() => change(rotate(adjust, "left"))}>↶ Rotate left</button>
          <button type="button" className="fs-btn" onClick={() => change(rotate(adjust, "right"))}>↷ Rotate right</button>
          <button type="button" className="fs-btn" disabled={isDefault(adjust)} onClick={() => change(DEFAULT_ADJUST)}>Reset</button>
        </div>
        {slider("brightness", "Brightness")}
        {slider("contrast", "Contrast")}
        {slider("saturation", "Saturation")}
        <div className="fs-actions">
          <button type="button" className="fs-btn" disabled={!url || busy} onClick={() => void exportCopy()}>Export PNG copy</button>
          <button type="button" className="fs-btn fs-btn-primary" disabled={!url || busy} onClick={() => void sendToPublish()}>Publish this picture</button>
        </div>
        <p className="fs-muted">Publishing opens the Publish page with the edited picture attached. Nothing is posted until you do it there.</p>
      </section>
    </div>
  );
}

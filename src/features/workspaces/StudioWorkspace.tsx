import { useEffect, useMemo, useRef, useState } from "react";
import { getComputeCapabilities, planCompute } from "../../core/platform/freshComputeFabric";
import {
  addEdit,
  createRenderDocument,
  createRenderJob,
  type MediaEdit,
  type RenderDocument,
  type RenderJob,
} from "../../core/platform/mediaRenderGraph";
import {
  DEFAULT_RECOMMENDATION_WEIGHTS,
  normalizeWeights,
  rerankCandidates,
} from "../../core/platform/recommendationEngine";
import {
  DEFAULT_MEDIA_PIPELINE,
  createMediaPipelineJob,
  runMediaPipeline,
  type MediaPipelineJob,
} from "../../core/platform/mediaPipeline";
import { createBrowserSpeechRecognition, getBrowserSpeechCapability } from "../../core/platform/browserSpeech";
import { fundEscrow, releaseEscrow, verifyMilestone } from "../../core/platform/escrowLedger";
import {
  createMediaProject,
  listMediaProjects,
  saveMediaProject,
  updateMediaProject,
  type FreshMediaProject,
} from "../../core/platform/mediaProjectStore";
import { exportVideoFrameStream, getBrowserExportSupport } from "../../core/platform/browserMediaExport";
import { loadPlaybackState, savePlaybackState } from "../../core/platform/playbackStateStore";
import { runWasmSmokeTest } from "../../core/platform/wasmRuntime";
import { createThumbnail, probeMedia, submitMediaToWorker, waitForMediaWorker } from "../../core/platform/mediaRuntime";
import { saveMediaAsset } from "../../core/platform/mediaStorage";
import { useLayout } from "../../app/contexts/useLayout";
import StudioMediaOpsPanels from "./StudioMediaOpsPanels";
import "./WorkspacePage.css";
import "./StudioWorkspace.css";

type StudioMode = "start" | "photo" | "edit" | "pipeline" | "discover" | "business" | "system";

const MODE_TABS: { id: StudioMode; label: string }[] = [
  { id: "edit", label: "Edit" },
  { id: "pipeline", label: "Pipeline" },
  { id: "discover", label: "Discover" },
  { id: "business", label: "Business" },
  { id: "system", label: "System" },
];

const candidates = [
  { id: "Fresh AI tutorial", subscription: 0.8, niche: 0.9, length: 0.7, freshness: 0.8 },
  { id: "Termux build guide", subscription: 0.4, niche: 1, length: 0.6, freshness: 0.9 },
  { id: "Creator workflow", subscription: 0.7, niche: 0.6, length: 0.8, freshness: 0.6 },
];

function isLiveObjectUrl(url?: string | null): boolean {
  return !!url && url.startsWith("blob:");
}

export default function StudioWorkspace() {
  const { setActiveRoute } = useLayout();
  const capabilities = getComputeCapabilities();
  const [mode, setMode] = useState<StudioMode>("start");
  const [weights, setWeights] = useState(DEFAULT_RECOMMENDATION_WEIGHTS);
  const [document, setDocument] = useState<RenderDocument>(() => createRenderDocument("local-media"));
  const [projects, setProjects] = useState<FreshMediaProject[]>([]);
  const [project, setProject] = useState<FreshMediaProject | null>(null);
  const [renderJob, setRenderJob] = useState<RenderJob | null>(null);
  const [pipelineJob, setPipelineJob] = useState<MediaPipelineJob | null>(null);
  const [sourcePreview, setSourcePreview] = useState<string | null>(null);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [exporting, setExporting] = useState(false);
  const [exportUrl, setExportUrl] = useState<string | null>(null);
  const [browserSupport] = useState(() => getBrowserExportSupport());
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [message, setMessage] = useState("Import a video to start editing on this device.");
  const [mediaInfo, setMediaInfo] = useState<{
    duration: number;
    width: number;
    height: number;
    aspectRatio: number;
  } | null>(null);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [transcript, setTranscript] = useState("");
  const speechSupported = useMemo(() => getBrowserSpeechCapability().supported, []);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(30);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const photoFileRef = useRef<HTMLInputElement | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoName, setPhotoName] = useState("");
  const [photoBrightness, setPhotoBrightness] = useState(100);
  const [photoContrast, setPhotoContrast] = useState(100);
  const [photoSaturation, setPhotoSaturation] = useState(100);
  const [photoRotation, setPhotoRotation] = useState(0);
  const [escrow, setEscrow] = useState(() =>
    fundEscrow({
      payerId: "brand-demo",
      payeeId: "creator-demo",
      amountMinor: 50000,
      currency: "UGX",
      milestone: "Deliver final vertical campaign asset",
    }),
  );

  useEffect(() => {
    const saved = listMediaProjects();
    setProjects(saved);
    if (saved[0]) {
      setProject(saved[0]);
      if (saved[0].renderDocument && typeof saved[0].renderDocument === "object") {
        setDocument(saved[0].renderDocument as RenderDocument);
      }
      // Blob URLs die after refresh — only restore live previews
      if (isLiveObjectUrl(saved[0].sourceUrl)) {
        setSourcePreview(saved[0].sourceUrl!);
      } else if (saved[0].sourceName) {
        setMessage(`Project “${saved[0].title}” restored. Re-import “${saved[0].sourceName}” to preview (blob URLs expire after refresh).`);
      }
    }
  }, []);

  const normalized = useMemo(() => normalizeWeights(weights), [weights]);
  const ranked = useMemo(() => rerankCandidates(candidates, normalized), [normalized]);
  const compute = planCompute({ capability: "render", gpuRequired: capabilities.webgpu, private: true });

  const importPhoto = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setMessage("Choose an image file such as JPG, PNG or WebP.");
      return;
    }
    if (photoUrl) URL.revokeObjectURL(photoUrl);
    const url = URL.createObjectURL(file);
    setPhotoUrl(url);
    setPhotoName(file.name);
    setPhotoBrightness(100);
    setPhotoContrast(100);
    setPhotoSaturation(100);
    setPhotoRotation(0);
    setMode("photo");
    setMessage("Photo loaded locally. Adjust it, then export a new copy; the original stays unchanged.");
  };

  const exportPhoto = () => {
    if (!photoUrl) return;
    const image = new Image();
    image.onload = () => {
      const quarterTurn = Math.abs(photoRotation % 180) === 90;
      const canvas = window.document.createElement("canvas");
      canvas.width = quarterTurn ? image.naturalHeight : image.naturalWidth;
      canvas.height = quarterTurn ? image.naturalWidth : image.naturalHeight;
      const context = canvas.getContext("2d");
      if (!context) {
        setMessage("This browser could not export the photo. Try another browser.");
        return;
      }
      context.filter = `brightness(${photoBrightness}%) contrast(${photoContrast}%) saturate(${photoSaturation}%)`;
      context.translate(canvas.width / 2, canvas.height / 2);
      context.rotate((photoRotation * Math.PI) / 180);
      context.drawImage(image, -image.naturalWidth / 2, -image.naturalHeight / 2);
      canvas.toBlob((blob) => {
        if (!blob) {
          setMessage("Photo export failed. Your original has not been changed.");
          return;
        }
        const url = URL.createObjectURL(blob);
        const link = window.document.createElement("a");
        link.href = url;
        link.download = `fresh-studio-${photoName.replace(/\\.[^.]+$/, "") || "photo"}.png`;
        link.click();
        URL.revokeObjectURL(url);
        setMessage(`Exported edited photo at ${canvas.width}×${canvas.height}. Your original file was not changed.`);
      }, "image/png");
    };
    image.onerror = () => setMessage("Could not read this image. Try a JPG, PNG or WebP file.");
    image.src = photoUrl;
  };

  const setWeight = (key: keyof typeof weights, value: number) =>
    setWeights((current) => ({ ...current, [key]: value }));

  const add = (edit: Parameters<typeof addEdit>[1]) => {
    setDocument((current) => {
      const next = addEdit(current, edit);
      if (project) updateMediaProject(project.id, { renderDocument: next, pipelineStatus: "draft" });
      return next;
    });
    setMessage(`Added ${edit.type} to render graph (${document.edits.length + 1} edits).`);
  };

  const undoLastEdit = () => {
    setDocument((current) => {
      if (!current.edits.length) return current;
      const next = { ...current, edits: current.edits.slice(0, -1) };
      if (project) updateMediaProject(project.id, { renderDocument: next, pipelineStatus: "draft" });
      return next;
    });
    setMessage("Removed last edit from render graph.");
  };

  const persist = () => {
    const next = project
      ? updateMediaProject(project.id, { renderDocument: document, pipelineStatus: project.pipelineStatus }) ?? project
      : saveMediaProject(createMediaProject("Untitled Fresh project", document));
    setProject(next);
    setProjects(listMediaProjects());
    setMessage("Project saved on this device.");
  };

  const newProject = () => {
    if (sourcePreview) URL.revokeObjectURL(sourcePreview);
    if (exportUrl) URL.revokeObjectURL(exportUrl);
    const doc = createRenderDocument("local-media");
    setDocument(doc);
    setProject(null);
    setSourcePreview(null);
    setExportUrl(null);
    setMediaInfo(null);
    setThumbnailUrl(null);
    setRenderJob(null);
    setPipelineJob(null);
    setTranscript("");
    setTrimStart(0);
    setTrimEnd(30);
    setMessage("New project. Choose a creation path to begin.");
    setMode("start");
  };

  const importMedia = (file: File) => {
    if (sourcePreview) URL.revokeObjectURL(sourcePreview);
    if (exportUrl) {
      URL.revokeObjectURL(exportUrl);
      setExportUrl(null);
    }
    const url = URL.createObjectURL(file);
    setSourcePreview(url);
    setMediaInfo(null);
    setThumbnailUrl(null);
    void Promise.all([probeMedia(url), createThumbnail(url)])
      .then(([info, thumbnail]) => {
        setMediaInfo(info);
        setThumbnailUrl(thumbnail);
        if (info.duration > 0) {
          setTrimEnd(Math.min(30, Math.round(info.duration * 10) / 10));
        }
      })
      .catch(() => setMessage("Media imported; metadata will update when preview loads."));

    const nextProject = project
      ? updateMediaProject(project.id, {
          sourceName: file.name,
          sourceType: file.type,
          sourceUrl: url,
          pipelineStatus: "draft",
        })
      : saveMediaProject({
          ...createMediaProject(file.name.replace(/\.[^.]+$/, "") || "Fresh project", document),
          sourceName: file.name,
          sourceType: file.type,
          sourceUrl: url,
        });

    if (!nextProject) {
      setMessage("Could not create project for this media.");
      return;
    }
    setProject(nextProject);
    setProjects(listMediaProjects());
    void file
      .arrayBuffer()
      .then((bytes) => saveMediaAsset(nextProject.id, new Blob([bytes], { type: file.type })))
      .catch(() => {});
    setMessage(`Imported ${file.name}. Use Edit tools, then Render or hand off to Creator.`);
    setMode("edit");
  };

  const savePlayback = async () => {
    const video = videoRef.current;
    if (!video || !project) return;
    await savePlaybackState({
      contentId: project.id,
      positionSeconds: video.currentTime,
      durationSeconds: video.duration || undefined,
      playbackRate: video.playbackRate,
      updatedAt: Date.now(),
    });
    setMessage("Playback position saved.");
  };

  const restorePlayback = async () => {
    const video = videoRef.current;
    if (!video || !project) return;
    const state = await loadPlaybackState(project.id);
    if (state) {
      video.currentTime = Math.min(state.positionSeconds, video.duration || state.positionSeconds);
      video.playbackRate = state.playbackRate;
      setPlaybackRate(state.playbackRate);
    }
  };

  const runBrowserTranscription = () => {
    const recognition = createBrowserSpeechRecognition();
    if (!recognition) {
      setMessage("Speech recognition is not available on this device.");
      return;
    }
    setTranscript("");
    recognition.onresult = (event: SpeechRecognitionEventLike) => {
      const text = Array.from(event.results ?? [])
        .map((result) => result?.[0]?.transcript ?? "")
        .join(" ");
      setTranscript(text.trim());
    };
    recognition.onerror = () => setMessage("Transcription stopped with an error.");
    recognition.onend = () => setMessage("Local transcription finished.");
    recognition.start();
    setMessage("Listening…");
  };

  const runLocalPipelineSmoke = async () => {
    const inputId = project?.id ?? document.source.id;
    const job = createMediaPipelineJob(inputId, ["ingest"]);
    const result = await runMediaPipeline(job, async (_current, stage) => {
      if (stage === "ingest" && !sourcePreview) throw new Error("Import media first.");
    });
    setPipelineJob(result);
    setMessage(
      result.status === "complete" ? "Ingest check complete." : result.error ?? "Pipeline check failed.",
    );
  };

  const runFullPipeline = async () => {
    if (!sourcePreview) {
      setMessage("Import media before running the pipeline.");
      return;
    }
    const inputId = project?.id ?? document.source.id;
    const job = createMediaPipelineJob(inputId);
    setPipelineJob({ ...job, status: "running" });
    const result = await runMediaPipeline(job, async () => {
      // Stages are contract-ready; local smoke advances the graph without remote models.
      await new Promise((r) => setTimeout(r, 120));
    });
    setPipelineJob(result);
    if (project) {
      const updated = updateMediaProject(project.id, {
        pipelineStatus: result.status === "complete" ? "ready" : "draft",
      });
      if (updated) {
        setProject(updated);
        setProjects(listMediaProjects());
      }
    }
    setMessage(
      result.status === "complete"
        ? "Pipeline stages completed (local contract run). Remote ML adapters process when connected."
        : result.error ?? "Pipeline failed.",
    );
  };

  const runLocalWasm = async () => {
    try {
      const result = await runWasmSmokeTest();
      setMessage(`WASM runtime OK · ${result}`);
    } catch (error) {
      setMessage(error instanceof Error ? `WASM check failed: ${error.message}` : "WASM check failed. Retry.");
    }
  };

  const exportDocument = async () => {
    const video = videoRef.current;
    if (!video) {
      setMessage("Import and load a video in the preview first.");
      return;
    }
    if (!browserSupport.mediaRecorder || !browserSupport.canvasCapture) {
      setMessage("Browser export is not supported on this device.");
      return;
    }
    setExporting(true);
    try {
      const trim = document.edits.find(
        (edit): edit is Extract<MediaEdit, { type: "trim" }> => edit.type === "trim",
      );
      const crop = [...document.edits]
        .reverse()
        .find((edit): edit is Extract<MediaEdit, { type: "crop" }> => edit.type === "crop");
      const grade = [...document.edits]
        .reverse()
        .find((edit): edit is Extract<MediaEdit, { type: "grade" }> => edit.type === "grade");
      const text = [...document.edits]
        .reverse()
        .find((edit): edit is Extract<MediaEdit, { type: "text" }> => edit.type === "text");
      const blob = await exportVideoFrameStream(video, {
        aspect: crop?.aspect ?? "9:16",
        startSeconds: trim?.start,
        endSeconds: trim?.end,
        grade: grade ? { preset: grade.preset, intensity: grade.intensity } : undefined,
        overlayText: text ? { text: text.text, start: text.start, end: text.end } : undefined,
        fps: 30,
      });
      if (exportUrl) URL.revokeObjectURL(exportUrl);
      const url = URL.createObjectURL(blob);
      setExportUrl(url);
      if (project) {
        const updated = updateMediaProject(project.id, { renderDocument: document, pipelineStatus: "ready" });
        if (updated) {
          setProject(updated);
          setProjects(listMediaProjects());
        }
      }
      setMessage("Render complete. Download the WebM or open Creator to publish.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Browser render failed.");
    } finally {
      setExporting(false);
    }
  };

  const queueRemoteRender = async () => {
    const remoteInput = project?.sourceUrl?.trim() ?? "";
    if (!/^https?:\/\//i.test(remoteInput)) {
      setMessage(
        "Remote FFmpeg needs an HTTP(S) URL. Local files stay on-device — use Render current graph for blob media.",
      );
      return;
    }
    try {
      const accepted = await submitMediaToWorker(remoteInput, "webm");
      setMessage(`Remote job accepted: ${accepted.jobId}`);
      const result = await waitForMediaWorker(accepted.jobId);
      if (result.status === "succeeded") {
        setMessage(`Remote render done · ${result.outputUrl ?? "output ready"}`);
      } else {
        setMessage(result.error ?? "Remote render failed.");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Remote render unavailable.");
    }
  };

  const queueRender = () => {
    if (!project && !sourcePreview) {
      setMessage("Import media or save a project first.");
      return;
    }
    try {
      const execution = compute.target === "device" ? "device" : "cloud";
      const job = createRenderJob(document, execution);
      setRenderJob(job);
      setPipelineJob(createMediaPipelineJob(document.source.id));
      if (project) {
        const updated = updateMediaProject(project.id, {
          renderDocument: document,
          pipelineStatus: "queued",
        });
        if (updated) setProject(updated);
      }
      setMessage(`Queued on ${execution}. Use “Render current graph” for an immediate browser export.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not queue render.");
    }
  };

  const openCreator = () => {
    if (!project && !sourcePreview) {
      setMessage("Import media or save a project before opening Creator.");
      return;
    }
    try {
      sessionStorage.setItem(
        "fresh-studio-handoff",
        JSON.stringify({
          projectId: project?.id,
          title: project?.title,
          sourceName: project?.sourceName,
        }),
      );
      setActiveRoute("creator");
    } catch (error) {
      setMessage(error instanceof Error ? `Creator handoff failed: ${error.message}` : "Creator handoff failed. Retry.");
    }
  };

  const restoreProject = (item: FreshMediaProject) => {
    setProject(item);
    if (item.renderDocument && typeof item.renderDocument === "object") {
      setDocument(item.renderDocument as RenderDocument);
    }
    if (isLiveObjectUrl(item.sourceUrl)) {
      setSourcePreview(item.sourceUrl!);
      setMessage(`Restored “${item.title}”.`);
    } else {
      setSourcePreview(null);
      setMessage(
        item.sourceName
          ? `Restored “${item.title}”. Re-import ${item.sourceName} to preview (session blob expired).`
          : `Restored “${item.title}”. Import media to attach a source.`,
      );
    }
    setMode("edit");
  };

  return (
    <section className={`workspace-page studio-workspace${mode === "start" ? " studio-workspace-start" : ""}`} aria-label="Fresh Studio">
      <header className="workspace-hero studio-hero-compact">
        <span className="workspace-eyebrow">Creation</span>
        <h1>Fresh Studio</h1>
        <p>Choose what you want to make. Start simple; advanced tools are available when you need them.</p>
        <div className="studio-hero-actions">
          {mode !== "start" && (
            <>
              <button type="button" className="studio-btn-primary" onClick={() => (mode === "photo" ? photoFileRef.current?.click() : fileRef.current?.click())}>{mode === "photo" ? "Choose another photo" : "Import video"}</button>
              <button type="button" onClick={persist}>Save project</button>
              <button type="button" onClick={newProject}>New project</button>
              <button type="button" onClick={openCreator}>Open Creator</button>
              <button type="button" onClick={() => setActiveRoute("fresh-flow")}>Fresh Flow</button>
            </>
          )}
        </div>
        <input
          ref={photoFileRef}
          hidden
          type="file"
          accept="image/*"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.currentTarget.value = "";
            if (file) importPhoto(file);
          }}
        />
        <input
          ref={fileRef}
          hidden
          type="file"
          accept="video/*"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.currentTarget.value = "";
            if (file) importMedia(file);
          }}
        />
        <p className="studio-message" role="status">
          {message}
        </p>
      </header>

      {mode === "start" && (
        <section className="studio-start-hub" aria-label="Choose what to create">
          <div className="studio-start-heading">
            <span className="workspace-eyebrow">FRESH STUDIO</span>
            <h2>What would you like to create?</h2>
            <p>Pick one starting point. You can explore advanced controls later.</p>
          </div>
          <div className="studio-start-grid">
            <button type="button" className="studio-start-card studio-start-card-primary" onClick={() => photoFileRef.current?.click()}>
              <span className="studio-start-icon" aria-hidden="true">▧</span>
              <strong>Edit a photo</strong>
              <small>Import a picture, adjust light and color, rotate it, and export a new copy.</small>
              <span className="studio-start-link">Choose photo →</span>
            </button>
            <button type="button" className="studio-start-card studio-start-card-primary" onClick={() => fileRef.current?.click()}>
              <span className="studio-start-icon" aria-hidden="true">▶</span>
              <strong>Edit a video</strong>
              <small>Import a video, preview it, make supported edits and export.</small>
              <span className="studio-start-link">Choose video →</span>
            </button>
            <button type="button" className="studio-start-card" onClick={() => setActiveRoute("ai")}>
              <span className="studio-start-icon" aria-hidden="true">✦</span>
              <strong>Create with Fresh AI</strong>
              <small>Open Fresh AI for the creation and assistance tools currently available.</small>
              <span className="studio-start-link">Open Fresh AI →</span>
            </button>
            <button type="button" className="studio-start-card" onClick={() => setActiveRoute("creator")}>
              <span className="studio-start-icon" aria-hidden="true">▧</span>
              <strong>Design a post</strong>
              <small>Open Creator to compose and prepare content.</small>
              <span className="studio-start-link">Open Creator →</span>
            </button>
            <button type="button" className="studio-start-card" onClick={() => setMode("pipeline")}>
              <span className="studio-start-icon" aria-hidden="true">⚙</span>
              <strong>Advanced tools</strong>
              <small>Access media pipeline status, diagnostics and experimental controls.</small>
              <span className="studio-start-link">View tools →</span>
            </button>
          </div>
          {project && (
            <div className="studio-continue-card">
              <div>
                <span className="workspace-eyebrow">YOUR PROJECT</span>
                <strong>{project.title}</strong>
                <p>{project.sourceName ?? "Saved project"} · {project.pipelineStatus ?? "draft"}</p>
              </div>
              <button type="button" className="studio-btn-primary" onClick={() => setMode("edit")}>Continue editing</button>
            </div>
          )}
          <p className="studio-start-note">Your video is previewed and edited in this workspace. Some AI operations depend on device support or configured services; Fresh Studio will report when a tool is unavailable.</p>
        </section>
      )}

      {mode !== "photo" && <section className="studio-project-bar" aria-label="Active project">
        <div>
          <span>PROJECT</span>
          <strong>{project?.title ?? "No project yet"}</strong>
        </div>
        <div>
          <span>SOURCE</span>
          <strong>{project?.sourceName ?? (sourcePreview ? "Loaded" : "Import a file")}</strong>
        </div>
        <div>
          <span>STATE</span>
          <strong>{renderJob?.status ?? project?.pipelineStatus ?? "draft"}</strong>
        </div>
      </section>}

      {!["photo"].includes(mode) && <nav className="studio-mode-tabs" aria-label="Studio sections">
        {MODE_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={mode === tab.id ? "active" : ""}
            onClick={() => setMode(tab.id)}
            aria-pressed={mode === tab.id}
          >
            {tab.label}
          </button>
        ))}
      </nav>}

      {mode === "photo" && (
        <section className="studio-photo-workspace" aria-label="Photo editor">
          <article className="studio-panel studio-photo-preview-panel">
            <div className="studio-panel-heading"><span>PHOTO</span><h2>Preview</h2></div>
            {photoUrl ? <img className="studio-photo-preview" src={photoUrl} alt={`Original photo: ${photoName}`} style={{ filter: `brightness(${photoBrightness}%) contrast(${photoContrast}%) saturate(${photoSaturation}%)`, transform: `rotate(${photoRotation}deg)` }} /> : <p>Choose a photo to begin.</p>}
            <p className="studio-muted">Edits are previewed in your browser. The original file remains unchanged until you choose to export a copy.</p>
            <div className="studio-actions">
              <button type="button" onClick={() => setPhotoRotation((value) => (value + 270) % 360)}>↶ Rotate left</button>
              <button type="button" onClick={() => setPhotoRotation((value) => (value + 90) % 360)}>↷ Rotate right</button>
              <button type="button" onClick={() => { setPhotoBrightness(100); setPhotoContrast(100); setPhotoSaturation(100); setPhotoRotation(0); setMessage("Photo adjustments reset."); }}>Reset edits</button>
              <button type="button" className="studio-btn-primary" onClick={exportPhoto} disabled={!photoUrl}>Export PNG copy</button>
            </div>
          </article>
          <article className="studio-panel">
            <div className="studio-panel-heading"><span>ADJUST</span><h2>Light and color</h2></div>
            <p className="studio-muted">Use the sliders to make a natural correction. These are real browser adjustments, not AI enhancement.</p>
            <label className="studio-photo-slider">Brightness <output>{photoBrightness}%</output><input type="range" min="50" max="150" value={photoBrightness} onChange={(event) => setPhotoBrightness(Number(event.target.value))} /></label>
            <label className="studio-photo-slider">Contrast <output>{photoContrast}%</output><input type="range" min="50" max="150" value={photoContrast} onChange={(event) => setPhotoContrast(Number(event.target.value))} /></label>
            <label className="studio-photo-slider">Saturation <output>{photoSaturation}%</output><input type="range" min="0" max="180" value={photoSaturation} onChange={(event) => setPhotoSaturation(Number(event.target.value))} /></label>
            <div className="studio-photo-info"><strong>{photoName || "No photo selected"}</strong><span>Local editing · No automatic upload</span><span>Export format: PNG</span></div>
            <button type="button" onClick={() => photoFileRef.current?.click()}>Choose a different photo</button>
          </article>
        </section>
      )}

      {mode === "edit" && (
        <section className="studio-grid studio-edit-grid">
          <article className="studio-panel studio-preview-panel">
            <div className="studio-panel-heading">
              <span>01</span>
              <h2>Preview</h2>
            </div>
            {sourcePreview ? (
              <video
                ref={videoRef}
                className="studio-preview"
                src={sourcePreview}
                controls
                playsInline
                onLoadedMetadata={() => void restorePlayback()}
                onPause={() => void savePlayback()}
                onRateChange={(event) => setPlaybackRate(event.currentTarget.playbackRate)}
              />
            ) : (
              <button
                type="button"
                className="studio-preview-empty studio-dropzone"
                onClick={() => fileRef.current?.click()}
              >
                <strong>Tap to import video</strong>
                <span>Stays private on this device until you publish from Creator.</span>
              </button>
            )}
            {sourcePreview && (
              <div className="studio-actions studio-player-controls">
                <button
                  type="button"
                  onClick={() => {
                    const next = Math.max(0.25, playbackRate - 0.05);
                    if (videoRef.current) videoRef.current.playbackRate = next;
                    setPlaybackRate(next);
                  }}
                >
                  − 0.05×
                </button>
                <strong>{playbackRate.toFixed(2)}×</strong>
                <button
                  type="button"
                  onClick={() => {
                    const next = Math.min(3, playbackRate + 0.05);
                    if (videoRef.current) videoRef.current.playbackRate = next;
                    setPlaybackRate(next);
                  }}
                >
                  + 0.05×
                </button>
                <button type="button" onClick={() => void savePlayback()}>
                  Save position
                </button>
              </div>
            )}
            {sourcePreview && (
              <div className="studio-actions">
                <button type="button" className="studio-btn-primary" onClick={() => void exportDocument()} disabled={exporting}>
                  {exporting ? "Rendering…" : "Render current graph"}
                </button>
                {exportUrl && (
                  <a className="studio-download" href={exportUrl} download="fresh-web-lite-9x16.webm">
                    Download WebM
                  </a>
                )}
                <button type="button" onClick={queueRender}>
                  Queue render
                </button>
                <button type="button" onClick={() => void runLocalWasm()}>
                  Run local WASM
                </button>
                <button type="button" onClick={runBrowserTranscription} disabled={!speechSupported}>
                  Transcribe
                </button>
              </div>
            )}
            {mediaInfo && (
              <p className="studio-muted">
                {Math.round(mediaInfo.duration)}s · {mediaInfo.width}×{mediaInfo.height} ·{" "}
                {mediaInfo.aspectRatio.toFixed(2)}:1
              </p>
            )}
            {transcript && <p className="studio-muted">Transcript: {transcript.slice(0, 200)}</p>}
            {thumbnailUrl && <img className="studio-thumbnail" src={thumbnailUrl} alt="" />}
          </article>

          <article className="studio-panel">
            <div className="studio-panel-heading">
              <span>02</span>
              <h2>Edits</h2>
            </div>
            <p className="studio-muted">Non-destructive. Edits store as a JSON graph until you render.</p>
            <div className="studio-actions studio-edit-fields">
              <label>
                Trim start
                <input
                  type="number"
                  min={0}
                  step={0.1}
                  value={trimStart}
                  onChange={(e) => setTrimStart(Number(e.target.value))}
                />
              </label>
              <label>
                Trim end
                <input
                  type="number"
                  min={0.1}
                  step={0.1}
                  value={trimEnd}
                  onChange={(e) => setTrimEnd(Number(e.target.value))}
                />
              </label>
            </div>
            <div className="studio-actions">
              <button
                type="button"
                onClick={() =>
                  add({
                    type: "trim",
                    start: Math.max(0, trimStart),
                    end: Math.max(trimStart + 0.05, trimEnd),
                  })
                }
              >
                Apply trim
              </button>
              <button type="button" onClick={() => add({ type: "crop", aspect: "9:16", focus: "active-speaker" })}>
                + 9:16 crop
              </button>
              <button type="button" onClick={() => add({ type: "grade", preset: "Fresh Clean", intensity: 0.65 })}>
                + Grade
              </button>
              <button type="button" onClick={() => add({ type: "split", at: Math.max(0, trimStart) })}>
                + Split
              </button>
              <button
                type="button"
                onClick={() =>
                  add({ type: "stem-separate", model: "lightweight", lanes: ["voice", "music", "ambient"] })
                }
              >
                + Stems
              </button>
              <button type="button" onClick={() => add({ type: "dub", language: "en", voice: "localized" })}>
                + Dub
              </button>
              <button type="button" onClick={undoLastEdit} disabled={!document.edits.length}>
                Undo last
              </button>
            </div>
            <div className="studio-stat-row">
              <strong>{document.edits.length}</strong>
              <span>edits</span>
              <strong>
                {document.output.width}×{document.output.height}
              </strong>
              <span>target</span>
            </div>
            {document.edits.length > 0 && (
              <ul className="studio-edit-list">
                {document.edits.map((edit, i) => (
                  <li key={`${edit.type}-${i}`}>
                    <b>{edit.type}</b>
                    <span>{JSON.stringify(edit).slice(0, 80)}</span>
                  </li>
                ))}
              </ul>
            )}
            <details className="studio-ast-details">
              <summary>Render graph JSON</summary>
              <pre className="studio-code">{JSON.stringify(document, null, 2)}</pre>
            </details>
          </article>

          {projects.length > 0 && (
            <article className="studio-panel studio-projects-panel">
              <div className="studio-panel-heading">
                <span>Projects</span>
                <h2>Recent</h2>
              </div>
              <div className="studio-project-list">
                {projects.map((item) => (
                  <button type="button" key={item.id} onClick={() => restoreProject(item)}>
                    <strong>{item.title}</strong>
                    <span>
                      {item.pipelineStatus} · {item.sourceName ?? "no source"}
                    </span>
                  </button>
                ))}
              </div>
            </article>
          )}
        </section>
      )}

      {mode === "pipeline" && (
        <section className="studio-grid">
          <article className="studio-panel">
            <div className="studio-panel-heading">
              <span>AI</span>
              <h2>Media pipeline</h2>
            </div>
            <p className="studio-muted">
              Ingest → transcribe → separate-audio → detect-subjects → repurpose → translate → synthesize →
              package → publish
            </p>
            <div className="studio-pipeline">
              {DEFAULT_MEDIA_PIPELINE.map((stage, i) => {
                const done = pipelineJob?.completedStages?.includes(stage);
                const current = pipelineJob?.currentStage === stage;
                return (
                  <span key={stage} className={done ? "ready" : current ? "current" : ""}>
                    {i + 1}. {stage}
                  </span>
                );
              })}
            </div>
            <div className="studio-actions" style={{ marginTop: 14 }}>
              <button type="button" onClick={() => void runLocalPipelineSmoke()} disabled={!sourcePreview}>
                Ingest check
              </button>
              <button type="button" className="studio-btn-primary" onClick={() => void runFullPipeline()} disabled={!sourcePreview}>
                Run pipeline
              </button>
              <button type="button" onClick={() => void queueRemoteRender()} disabled={!sourcePreview}>
                Remote FFmpeg
              </button>
            </div>
            {pipelineJob && (
              <div className="studio-job">
                <span>{pipelineJob.status}</span>
                <b>{pipelineJob.currentStage ?? pipelineJob.error ?? "idle"}</b>
              </div>
            )}
            <div className="studio-capabilities" style={{ marginTop: 14 }}>
              {Object.entries(capabilities).map(([name, ready]) => (
                <span key={name} className={ready ? "ready" : ""}>
                  {name} · {ready ? "ready" : "fallback"}
                </span>
              ))}
            </div>
            <div className="studio-route">
              <b>{compute.target.toUpperCase()}</b>
              <span>{compute.reason}</span>
            </div>
          </article>
        </section>
      )}

      {mode === "discover" && (
        <section className="studio-grid">
          <article className="studio-panel">
            <div className="studio-panel-heading">
              <span>Rank</span>
              <h2>Recommendation weights</h2>
            </div>
            <p className="studio-muted">
              Score = w₁·S_sub + w₂·S_niche + w₃·S_length + w₄·S_freshness. Adjusts ranking on device.
            </p>
            {(Object.keys(weights) as Array<keyof typeof weights>).map((key) => (
              <label className="studio-slider" key={key}>
                {key}
                <output>{normalized[key].toFixed(2)}</output>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={Math.round(weights[key] * 100)}
                  onChange={(e) => setWeight(key, Number(e.target.value) / 100)}
                />
              </label>
            ))}
            <div className="studio-ranking">
              {ranked.map((row, index) => (
                <div key={row.candidate.id}>
                  <span>{index + 1}</span>
                  <span>{row.candidate.id}</span>
                  <em>{row.score.toFixed(3)}</em>
                </div>
              ))}
            </div>
          </article>
        </section>
      )}

      {mode === "business" && (
        <section className="studio-grid">
          <article className="studio-panel">
            <div className="studio-panel-heading">
              <span>Escrow</span>
              <h2>Brand deal</h2>
            </div>
            <p className="studio-muted">Separate from user Treasury balances.</p>
            <div className="studio-escrow">
              <div>
                <strong>
                  {escrow.currency} {(escrow.amountMinor / 100).toFixed(2)}
                </strong>
                <span>
                  {escrow.status} · {escrow.milestone}
                </span>
              </div>
            </div>
            <div className="studio-actions">
              <button type="button" onClick={() => setEscrow((c) => verifyMilestone(c))}>
                Verify milestone
              </button>
              <button type="button" onClick={() => setEscrow((c) => releaseEscrow(c))}>
                Release payout
              </button>
            </div>
          </article>
          <StudioMediaOpsPanels
            contentId={project?.id ?? "studio-demo"}
            onAddStemSeparate={() =>
              add({ type: "stem-separate", model: "lightweight", lanes: ["voice", "music", "ambient"] })
            }
            compact
          />
        </section>
      )}

      {mode === "system" && (
        <section className="studio-grid">
          <StudioMediaOpsPanels
            contentId={project?.id ?? "studio-demo"}
            onAddStemSeparate={() =>
              add({ type: "stem-separate", model: "lightweight", lanes: ["voice", "music", "ambient"] })
            }
            showMapOnly
          />
        </section>
      )}
    </section>
  );
}

/** Minimal type for browser SpeechRecognition result events without DOM lib friction. */
type SpeechRecognitionEventLike = {
  results?: ArrayLike<ArrayLike<{ transcript?: string }> | undefined>;
};

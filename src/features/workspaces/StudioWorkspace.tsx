import { useEffect, useMemo, useRef, useState } from "react";
import { getComputeCapabilities, planCompute } from "../../core/platform/freshComputeFabric";
import { addEdit, createRenderDocument, createRenderJob, type RenderDocument, type RenderJob } from "../../core/platform/mediaRenderGraph";
import { DEFAULT_RECOMMENDATION_WEIGHTS, normalizeWeights, rerankCandidates } from "../../core/platform/recommendationEngine";
import { DEFAULT_MEDIA_PIPELINE, createMediaPipelineJob, type MediaPipelineJob } from "../../core/platform/mediaPipeline";
import { fundEscrow, releaseEscrow, verifyMilestone } from "../../core/platform/escrowLedger";
import { createMediaProject, listMediaProjects, saveMediaProject, updateMediaProject, type FreshMediaProject } from "../../core/platform/mediaProjectStore";
import { exportVideoFrameStream, getBrowserExportSupport } from "../../core/platform/browserMediaExport";
import { loadPlaybackState, savePlaybackState } from "../../core/platform/playbackStateStore";
import { runWasmSmokeTest } from "../../core/platform/wasmRuntime";
import { useLayout } from "../../app/contexts/useLayout";
import "./WorkspacePage.css";
import "./StudioWorkspace.css";

const candidates = [
  { id: "Fresh AI tutorial", subscription: .8, niche: .9, length: .7, freshness: .8 },
  { id: "Termux build guide", subscription: .4, niche: 1, length: .6, freshness: .9 },
  { id: "Creator workflow", subscription: .7, niche: .6, length: .8, freshness: .6 },
];

export default function StudioWorkspace() {
  const { setActiveRoute } = useLayout();
  const capabilities = getComputeCapabilities();
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
  const [message, setMessage] = useState("Import media to begin a real device-side Studio project.");
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(30);
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [escrow, setEscrow] = useState(() => fundEscrow({ payerId: "brand-demo", payeeId: "creator-demo", amountMinor: 50000, currency: "UGX", milestone: "Deliver final vertical campaign asset" }));

  useEffect(() => {
    const saved = listMediaProjects();
    setProjects(saved);
    if (saved[0]) {
      setProject(saved[0]);
      if (saved[0].renderDocument && typeof saved[0].renderDocument === "object") setDocument(saved[0].renderDocument as RenderDocument);
    }
  }, []);

  const normalized = useMemo(() => normalizeWeights(weights), [weights]);
  const ranked = useMemo(() => rerankCandidates(candidates, normalized), [normalized]);
  const compute = planCompute({ capability: "render", gpuRequired: capabilities.webgpu, private: true });

  const setWeight = (key: keyof typeof weights, value: number) => setWeights((current) => ({ ...current, [key]: value }));
  const add = (edit: Parameters<typeof addEdit>[1]) => {
    setDocument((current) => {
      const next = addEdit(current, edit);
      if (project) updateMediaProject(project.id, { renderDocument: next, pipelineStatus: "draft" });
      return next;
    });
  };

  const persist = () => {
    const next = project
      ? updateMediaProject(project.id, { renderDocument: document, pipelineStatus: project.pipelineStatus }) ?? project
      : saveMediaProject(createMediaProject("Untitled Fresh project", document));
    setProject(next);
    setProjects(listMediaProjects());
    setMessage("Project saved on this device. The render graph is preserved and can be resumed.");
  };

  const importMedia = (file: File) => {
    if (sourcePreview) URL.revokeObjectURL(sourcePreview);
    const url = URL.createObjectURL(file);
    setSourcePreview(url);
    const nextProject = project
      ? updateMediaProject(project.id, { sourceName: file.name, sourceType: file.type, sourceUrl: url, pipelineStatus: "draft" })
      : saveMediaProject({
          ...createMediaProject(file.name.replace(/\.[^.]+$/, "") || "Fresh project", document),
          sourceName: file.name,
          sourceType: file.type,
          sourceUrl: url,
        });
    setProject(nextProject);
    setProjects(listMediaProjects());
    setMessage("Imported " + file.name + ". Edits remain non-destructive until render.");
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
    setMessage("Playback position saved locally.");
  };

  const restorePlayback = async () => {
    const video = videoRef.current;
    if (!video || !project) return;
    const state = await loadPlaybackState(project.id);
    if (state) {
      video.currentTime = Math.min(state.positionSeconds, video.duration || state.positionSeconds);
      video.playbackRate = state.playbackRate;
      setPlaybackRate(state.playbackRate);
      setMessage("Playback position restored from this device.");
    }
  };

  const runLocalWasm = async () => {
    const result = await runWasmSmokeTest();
    setMessage("Client WebAssembly runtime is executing locally. Smoke-test result: " + result);
  };

  const exportDocument = async () => {
    const video = videoRef.current;
    if (!video || !browserSupport.mediaRecorder || !browserSupport.canvasCapture) {
      setMessage("Browser video export is not supported on this device.");
      return;
    }
    setExporting(true);
    try {
      const trim = document.edits.find((edit) => edit.type === "trim");
      const crop = [...document.edits].reverse().find((edit) => edit.type === "crop");
      const grade = [...document.edits].reverse().find((edit) => edit.type === "grade");
      const text = [...document.edits].reverse().find((edit) => edit.type === "text");
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
      setMessage("Real browser render completed from the current render graph. The WebM result is available locally.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Browser render failed.");
    } finally {
      setExporting(false);
    }
  };

  const queueRender = () => {
    const execution = compute.target === "device" ? "device" : "cloud";
    const job = createRenderJob(document, execution);
    setRenderJob(job);
    setPipelineJob(createMediaPipelineJob(document.source.id));
    if (project) {
      const updated = updateMediaProject(project.id, { renderDocument: document, pipelineStatus: "queued" });
      if (updated) setProject(updated);
    }
    setMessage("Render job queued on " + execution + ". The browser render path is executable now; cloud workers remain a separate runtime deployment.");
  };

  const openCreator = () => {
    try {
      sessionStorage.setItem("fresh-studio-handoff", JSON.stringify({ projectId: project?.id, title: project?.title, sourceName: project?.sourceName }));
    } catch { /* ignore */ }
    setActiveRoute("creator");
  };

  return <section className="workspace-page studio-workspace" aria-label="Fresh Creation and Platform Fabric">
    <header className="workspace-hero">
      <span className="workspace-eyebrow">Creation · Intelligence · Compute</span>
      <h1>Fresh Studio</h1>
      <p>One production workspace: import, edit non-destructively, save, queue, preview execution, then hand off to the live Creator publishing system.</p>
      <div className="studio-hero-actions">
        <button onClick={() => fileRef.current?.click()}>Import media</button>
        <button onClick={persist}>Save project</button>
        <button onClick={openCreator}>Open Creator</button>
        <input ref={fileRef} hidden type="file" accept="video/*,audio/*,image/*" onChange={(event) => { const file = event.target.files?.[0]; event.currentTarget.value = ""; if (file) importMedia(file); }} />
      </div>
      <p className="studio-message" role="status">{message}</p>
    </header>

    <section className="studio-project-bar">
      <div><span>PROJECT</span><strong>{project?.title ?? "No project yet"}</strong></div>
      <div><span>SOURCE</span><strong>{project?.sourceName ?? "Import a file"}</strong></div>
      <div><span>STATE</span><strong>{renderJob?.status ?? project?.pipelineStatus ?? "draft"}</strong></div>
    </section>

    <section className="studio-grid">
      <article className="studio-panel studio-preview-panel"><div className="studio-panel-heading"><span>01</span><h2>Local media preview</h2></div>
        {sourcePreview ? <video
          ref={videoRef}
          className="studio-preview"
          src={sourcePreview}
          controls
          playsInline
          onLoadedMetadata={restorePlayback}
          onPause={savePlayback}
          onRateChange={(event) => setPlaybackRate(event.currentTarget.playbackRate)}
        /> : <div className="studio-preview-empty">Import a video to preview it privately on this device.</div>}
        {sourcePreview && <div className="studio-actions studio-player-controls">
          <button onClick={() => { const next = Math.max(.25, playbackRate - .05); if (videoRef.current) videoRef.current.playbackRate = next; setPlaybackRate(next); }}>− 0.05×</button>
          <strong>{playbackRate.toFixed(2)}×</strong>
          <button onClick={() => { const next = Math.min(3, playbackRate + .05); if (videoRef.current) videoRef.current.playbackRate = next; setPlaybackRate(next); }}>+ 0.05×</button>
          <button onClick={savePlayback}>Save position</button>
          <button onClick={restorePlayback}>Restore position</button>
        </div>}
        {sourcePreview && <div className="studio-actions">
          <button onClick={runLocalWasm}>Run local WASM</button>
          <button onClick={exportDocument} disabled={exporting}>{exporting ? "Rendering…" : "Render current graph"}</button>
          {exportUrl && <a className="studio-download" href={exportUrl} download="fresh-web-lite-9x16.webm">Open exported video</a>}
        </div>
        <p className="studio-muted">Browser export: {browserSupport.mediaRecorder && browserSupport.canvasCapture ? "available" : "fallback required"} · WASM: executable · render graph: executable</p>
        <p className="studio-muted">Object URLs stay local to this browser session. Studio does not expose source files to the public feed.</p>
      </article>

      <article className="studio-panel"><div className="studio-panel-heading"><span>02</span><h2>Web NLE render graph</h2></div>
        <p className="studio-muted">Non-destructive edits stay as a portable document until you queue rendering.</p>
        <div className="studio-actions"><label>Trim start <input type="number" min="0" step=".1" value={trimStart} onChange={e => setTrimStart(Number(e.target.value))}/></label><label>Trim end <input type="number" min=".1" step=".1" value={trimEnd} onChange={e => setTrimEnd(Number(e.target.value))}/></label><button onClick={() => add({ type:"trim", start:Math.max(0, trimStart), end:Math.max(trimStart + .05, trimEnd) })}>+ Apply trim</button><button onClick={() => add({ type:"crop", aspect:"9:16", focus:"active-speaker" })}>+ Smart 9:16 crop</button><button onClick={() => add({ type:"grade", preset:"Fresh Clean", intensity:.65 })}>+ Color grade</button><button onClick={() => add({ type:"dub", language:"en", voice:"localized" })}>+ AI dub lane</button></div>
        <div className="studio-stat-row"><strong>{document.edits.length}</strong><span>edits</span><strong>{document.output.width}×{document.output.height}</strong><span>target</span></div>
        <pre className="studio-code">{JSON.stringify(document, null, 2)}</pre>
      </article>

      <article className="studio-panel"><div className="studio-panel-heading"><span>03</span><h2>Execution fabric</h2></div>
        <div className="studio-capabilities">{Object.entries(capabilities).map(([name,ready]) => <span key={name} className={ready ? "ready" : ""}>{name} · {ready ? "ready" : "fallback"}</span>)}</div>
        <div className="studio-route"><b>{compute.target.toUpperCase()}</b><span>{compute.reason}</span></div>
        <p className="studio-muted">Fallback: {compute.fallbacks.join(" → ")}</p>
        <button onClick={queueRender} disabled={!project}>Queue render</button>
        {renderJob && <div className="studio-job"><span>Render</span><b>{renderJob.status}</b><button onClick={exportDocument} disabled={renderJob.status !== "queued" || !sourcePreview}>{exporting ? "Rendering…" : "Render queued graph"}</button></div>}
      </article>

      <article className="studio-panel"><div className="studio-panel-heading"><span>04</span><h2>AI media pipeline</h2></div>
        <p className="studio-muted">The same job contract can feed transcription, stem separation, subject detection, repurposing, translation, synthesis, packaging and publishing workers.</p>
        <div className="studio-pipeline">{(pipelineJob?.stages ?? DEFAULT_MEDIA_PIPELINE).map((stage,i) => <span key={stage}>{i+1}. {stage}</span>)}</div>
        {pipelineJob && <div className="studio-job"><span>Pipeline</span><b>{pipelineJob.status}</b></div>}
      </article>

      <article className="studio-panel"><div className="studio-panel-heading"><span>05</span><h2>User-controlled discovery</h2></div><p className="studio-muted">Live weights become normalized recommendation vectors.</p>
        {Object.entries(weights).map(([key,value]) => <label className="studio-slider" key={key}><span>{key}</span><output>{Math.round(value*100)}%</output><input type="range" min="0" max="1" step=".05" value={value} onChange={e => setWeight(key as keyof typeof weights, Number(e.target.value))}/></label>)}
        <div className="studio-ranking">{ranked.map(({candidate,score},i) => <div key={candidate.id}><b>{i+1}</b><span>{candidate.id}</span><em>{Math.round(score*100)}%</em></div>)}</div>
      </article>

      <article className="studio-panel"><div className="studio-panel-heading"><span>06</span><h2>Creator economy</h2></div>
        <p className="studio-muted">Creator publishing remains the live source of truth for posts and Shorts; Studio hands off instead of duplicating publishing logic.</p>
        <div className="studio-escrow"><b>{escrow.amountMinor.toLocaleString()} {escrow.currency}</b><span>{escrow.status}</span></div>
        <button disabled={escrow.status==="released"} onClick={() => setEscrow(current => releaseEscrow(verifyMilestone(current)))}>{escrow.status==="released" ? "Released" : "Verify milestone & release"}</button>
      </article>
    </section>

    <section className="studio-panel studio-projects-panel">
      <div className="studio-panel-heading"><span>07</span><h2>Recent projects</h2></div>
      {projects.length ? <div className="studio-project-list">{projects.slice(0,8).map((item) => <button key={item.id} onClick={() => { setProject(item); if (item.renderDocument) setDocument(item.renderDocument as RenderDocument); setMessage("Resumed " + item.title + "."); }}><strong>{item.title}</strong><span>{item.sourceName ?? "No source"} · {item.pipelineStatus}</span></button>)}</div> : <p className="studio-muted">No saved projects yet.</p>}
    </section>
  </section>;
}
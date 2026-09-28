import { useEffect, useMemo, useRef, useState } from "react";
import { getComputeCapabilities, planCompute } from "../../core/platform/freshComputeFabric";
import { addEdit, createRenderDocument, createRenderJob, type RenderDocument, type RenderJob } from "../../core/platform/mediaRenderGraph";
import { DEFAULT_RECOMMENDATION_WEIGHTS, normalizeWeights, rerankCandidates } from "../../core/platform/recommendationEngine";
import { DEFAULT_MEDIA_PIPELINE, createMediaPipelineJob, type MediaPipelineJob } from "../../core/platform/mediaPipeline";
import { fundEscrow, releaseEscrow, verifyMilestone } from "../../core/platform/escrowLedger";
import { createMediaProject, listMediaProjects, saveMediaProject, updateMediaProject, type FreshMediaProject } from "../../core/platform/mediaProjectStore";
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
  const [message, setMessage] = useState("Import media to begin a real device-side Studio project.");
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

  const queueRender = () => {
    const execution = compute.target === "device" ? "device" : "cloud";
    const job = createRenderJob(document, execution);
    setRenderJob(job);
    setPipelineJob(createMediaPipelineJob(document.source.id));
    if (project) {
      const updated = updateMediaProject(project.id, { renderDocument: document, pipelineStatus: "queued" });
      if (updated) setProject(updated);
    }
    setMessage("Render queued on " + execution + ". No source media is uploaded by Studio until you explicitly hand it to Creator.");
  };

  const openCreator = () => {
    try {
      sessionStorage.setItem("fresh-studio-handoff", JSON.stringify({ projectId: project?.id, title: project?.title, sourceName: project?.sourceName }));
    } catch { /* ignore */ }
    setActiveRoute("creator");
  };

  const simulateRenderProgress = () => {
    if (!renderJob) return;
    setRenderJob({ ...renderJob, status: "rendering" });
    setPipelineJob((current) => current ? { ...current, status: "running" } : current);
    window.setTimeout(() => {
      setRenderJob((current) => current ? { ...current, status: "complete" } : current);
      setPipelineJob((current) => current ? { ...current, status: "complete" } : current);
      if (project) {
        const updated = updateMediaProject(project.id, { pipelineStatus: "ready" });
        if (updated) {
          setProject(updated);
          setProjects(listMediaProjects());
        }
      }
      setMessage("Local render contract completed. Connect a production worker for actual cloud encoding.");
    }, 700);
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
        {sourcePreview ? <video className="studio-preview" src={sourcePreview} controls playsInline /> : <div className="studio-preview-empty">Import a video to preview it privately on this device.</div>}
        <p className="studio-muted">Object URLs stay local to this browser session. Studio does not expose source files to the public feed.</p>
      </article>

      <article className="studio-panel"><div className="studio-panel-heading"><span>02</span><h2>Web NLE render graph</h2></div>
        <p className="studio-muted">Non-destructive edits stay as a portable document until you queue rendering.</p>
        <div className="studio-actions"><button onClick={() => add({ type:"crop", aspect:"9:16", focus:"active-speaker" })}>+ Smart 9:16 crop</button><button onClick={() => add({ type:"grade", preset:"Fresh Clean", intensity:.65 })}>+ Color grade</button><button onClick={() => add({ type:"dub", language:"en", voice:"localized" })}>+ AI dub lane</button></div>
        <div className="studio-stat-row"><strong>{document.edits.length}</strong><span>edits</span><strong>{document.output.width}×{document.output.height}</strong><span>target</span></div>
        <pre className="studio-code">{JSON.stringify(document, null, 2)}</pre>
      </article>

      <article className="studio-panel"><div className="studio-panel-heading"><span>03</span><h2>Execution fabric</h2></div>
        <div className="studio-capabilities">{Object.entries(capabilities).map(([name,ready]) => <span key={name} className={ready ? "ready" : ""}>{name} · {ready ? "ready" : "fallback"}</span>)}</div>
        <div className="studio-route"><b>{compute.target.toUpperCase()}</b><span>{compute.reason}</span></div>
        <p className="studio-muted">Fallback: {compute.fallbacks.join(" → ")}</p>
        <button onClick={queueRender} disabled={!project}>Queue render</button>
        {renderJob && <div className="studio-job"><span>Render</span><b>{renderJob.status}</b><button onClick={simulateRenderProgress} disabled={renderJob.status !== "queued"}>Run local contract</button></div>}
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
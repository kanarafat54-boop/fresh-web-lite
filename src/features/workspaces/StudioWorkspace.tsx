import { useMemo, useState } from "react";
import { getComputeCapabilities, planCompute } from "../../core/platform/freshComputeFabric";
import { addEdit, createRenderDocument } from "../../core/platform/mediaRenderGraph";
import { DEFAULT_RECOMMENDATION_WEIGHTS, normalizeWeights, rerankCandidates } from "../../core/platform/recommendationEngine";
import { DEFAULT_MEDIA_PIPELINE } from "../../core/platform/mediaPipeline";
import { fundEscrow, releaseEscrow, verifyMilestone } from "../../core/platform/escrowLedger";
import "./WorkspacePage.css";
import "./StudioWorkspace.css";

const candidates = [
  { id: "Fresh AI tutorial", subscription: .8, niche: .9, length: .7, freshness: .8 },
  { id: "Termux build guide", subscription: .4, niche: 1, length: .6, freshness: .9 },
  { id: "Creator workflow", subscription: .7, niche: .6, length: .8, freshness: .6 },
];

export default function StudioWorkspace() {
  const capabilities = getComputeCapabilities();
  const [weights, setWeights] = useState(DEFAULT_RECOMMENDATION_WEIGHTS);
  const [document, setDocument] = useState(() => createRenderDocument("demo-media"));
  const [escrow, setEscrow] = useState(() => fundEscrow({ payerId: "brand-demo", payeeId: "creator-demo", amountMinor: 50000, currency: "UGX", milestone: "Deliver final vertical campaign asset" }));
  const normalized = useMemo(() => normalizeWeights(weights), [weights]);
  const ranked = useMemo(() => rerankCandidates(candidates, normalized), [normalized]);
  const compute = planCompute({ capability: "render", gpuRequired: capabilities.webgpu });

  const setWeight = (key: keyof typeof weights, value: number) => setWeights((current) => ({ ...current, [key]: value }));
  const add = (edit: Parameters<typeof addEdit>[1]) => setDocument((current) => addEdit(current, edit));

  return <section className="workspace-page studio-workspace" aria-label="Fresh Creation and Platform Fabric">
    <header className="workspace-hero"><span className="workspace-eyebrow">Creation · Intelligence · Compute</span><h1>Fresh Studio</h1><p>Production, AI repurposing, personalized discovery and scalable execution in one workspace.</p></header>
    <section className="studio-grid">
      <article className="studio-panel"><div className="studio-panel-heading"><span>01</span><h2>Web NLE render graph</h2></div>
        <p className="studio-muted">Non-destructive edits stay as a portable render document; previews can execute locally.</p>
        <div className="studio-actions"><button onClick={() => add({ type:"crop", aspect:"9:16", focus:"active-speaker" })}>+ Smart 9:16 crop</button><button onClick={() => add({ type:"grade", preset:"Fresh Clean", intensity:.65 })}>+ Color grade</button><button onClick={() => add({ type:"dub", language:"en", voice:"localized" })}>+ AI dub lane</button></div>
        <div className="studio-stat-row"><strong>{document.edits.length}</strong><span>edits</span><strong>{document.output.width}×{document.output.height}</strong><span>target</span></div>
        <pre className="studio-code">{JSON.stringify(document, null, 2)}</pre>
      </article>
      <article className="studio-panel"><div className="studio-panel-heading"><span>02</span><h2>Fresh Compute Fabric</h2></div>
        <div className="studio-capabilities">{Object.entries(capabilities).map(([name,ready]) => <span key={name} className={ready ? "ready" : ""}>{name} · {ready ? "ready" : "fallback"}</span>)}</div>
        <div className="studio-route"><b>{compute.target.toUpperCase()}</b><span>{compute.reason}</span></div><p className="studio-muted">Fallback: {compute.fallbacks.join(" → ")}</p>
      </article>
      <article className="studio-panel"><div className="studio-panel-heading"><span>03</span><h2>User-controlled discovery</h2></div><p className="studio-muted">Live weights become normalized recommendation vectors.</p>
        {Object.entries(weights).map(([key,value]) => <label className="studio-slider" key={key}><span>{key}</span><output>{Math.round(value*100)}%</output><input type="range" min="0" max="1" step=".05" value={value} onChange={e => setWeight(key as keyof typeof weights, Number(e.target.value))}/></label>)}
        <div className="studio-ranking">{ranked.map(({candidate,score},i) => <div key={candidate.id}><b>{i+1}</b><span>{candidate.id}</span><em>{Math.round(score*100)}%</em></div>)}</div>
      </article>
      <article className="studio-panel"><div className="studio-panel-heading"><span>04</span><h2>AI media pipeline</h2></div><p className="studio-muted">Distributed contract for transcription, stem separation, subject detection, repurposing, translation, synthesis and publishing.</p><div className="studio-pipeline">{DEFAULT_MEDIA_PIPELINE.map((stage,i) => <span key={stage}>{i+1}. {stage}</span>)}</div></article>
      <article className="studio-panel"><div className="studio-panel-heading"><span>05</span><h2>Creator escrow</h2></div><p className="studio-muted">Milestones remain stateful and auditable.</p><div className="studio-escrow"><b>{escrow.amountMinor.toLocaleString()} {escrow.currency}</b><span>{escrow.status}</span></div><button disabled={escrow.status==="released"} onClick={() => setEscrow(current => releaseEscrow(verifyMilestone(current)))}>{escrow.status==="released" ? "Released" : "Verify milestone & release"}</button></article>
    </section>
  </section>;
}

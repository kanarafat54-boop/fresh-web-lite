import { useMemo, useState } from "react";
import { MEDIA_OPS_FIT } from "../../core/platform/mediaOpsArchitecture";
import { ARCHITECTURE_PILLAR_MAP, UNIFIED_TECH_STACK } from "../../core/platform/unifiedTechStack";
import {
  demoInteractiveManifest,
  isQuizCorrect,
  resolveClientJump,
  type ClientJumpEvent,
  type InteractiveManifest,
} from "../../core/platform/interactiveNodeEngine";
import {
  holdClaimProceeds,
  openCopyrightClaim,
  resolveClaim,
  runFairUseClassifier,
  type CopyrightClaim,
} from "../../core/platform/copyrightArbitration";
import {
  authorizeMicroUnlock,
  createMicroUnlock,
  fulfillMicroUnlock,
  type MicroUnlock,
} from "../../core/platform/microSubscription";

type Props = {
  onAddStemSeparate?: () => void;
  contentId?: string;
};

/**
 * Additive Studio panels — interactive nodes, copyright arbitration, micro-unlocks, architecture fit map.
 * Does not replace existing Studio panels; mount beside them.
 */
export default function StudioMediaOpsPanels({ onAddStemSeparate, contentId = "studio-demo" }: Props) {
  const [manifest, setManifest] = useState<InteractiveManifest>(() => demoInteractiveManifest(contentId));
  const [activeNodeId, setActiveNodeId] = useState(manifest.nodes[0]?.id ?? "");
  const [lastJump, setLastJump] = useState<ClientJumpEvent | null>(null);
  const [quizResult, setQuizResult] = useState<string | null>(null);
  const [claim, setClaim] = useState<CopyrightClaim | null>(null);
  const [unlock, setUnlock] = useState<MicroUnlock | null>(null);

  const activeNode = useMemo(
    () => manifest.nodes.find((n) => n.id === activeNodeId) ?? manifest.nodes[0] ?? null,
    [manifest, activeNodeId],
  );

  const byPillar = useMemo(() => {
    const groups: Record<string, typeof MEDIA_OPS_FIT> = {};
    for (const row of MEDIA_OPS_FIT) {
      (groups[row.pillar] ??= []).push(row);
    }
    return groups;
  }, []);

  function choose(optionId: string) {
    if (!activeNode) return;
    const jump = resolveClientJump(manifest, activeNode.id, optionId);
    if (!jump) return;
    setLastJump(jump);
    const correct = isQuizCorrect(activeNode, optionId);
    if (correct === true) setQuizResult("Correct — signal recorded.");
    else if (correct === false) setQuizResult("Not the marked answer — still jumped.");
    else setQuizResult(null);
    setActiveNodeId(jump.toNodeId);
  }

  function openClaim() {
    const next = openCopyrightClaim({
      contentId,
      claimantId: "rights-holder-demo",
      creatorId: "creator-demo",
      reason: "Manual Content ID style claim (demo)",
      heldAmountMinor: 25000,
      currency: "UGX",
    });
    setClaim(holdClaimProceeds(next));
  }

  function startMicroUnlock() {
    const next = createMicroUnlock({
      buyerId: "viewer-demo",
      sellerId: "creator-demo",
      assetId: contentId,
      assetKind: "video",
      amountMinor: 1500,
      currency: "UGX",
      provider: "sandbox",
    });
    setUnlock(authorizeMicroUnlock(next));
  }

  return (
    <>
      <article className="studio-panel">
        <div className="studio-panel-heading">
          <span>07</span>
          <h2>Interactive nodes</h2>
        </div>
        <p className="studio-muted">
          Branching & quiz nodes live in the media manifest. Client jump switches segments without resetting the player pipeline.
        </p>
        {activeNode ? (
          <div className="studio-escrow" style={{ flexDirection: "column", alignItems: "stretch", gap: 10 }}>
            <div>
              <span>{activeNode.kind.toUpperCase()} · @{activeNode.atSeconds}s</span>
              <strong style={{ display: "block", marginTop: 6 }}>{activeNode.prompt}</strong>
            </div>
            <div className="studio-actions">
              {activeNode.options.map((opt) => (
                <button key={opt.id} type="button" onClick={() => choose(opt.id)}>
                  {opt.label}
                </button>
              ))}
              {activeNode.kind === "end" && (
                <button
                  type="button"
                  onClick={() => {
                    setManifest(demoInteractiveManifest(contentId));
                    setActiveNodeId("n-intro");
                    setLastJump(null);
                    setQuizResult(null);
                  }}
                >
                  Restart demo tree
                </button>
              )}
            </div>
            {quizResult && <p className="studio-muted">{quizResult}</p>}
            {lastJump && (
              <p className="studio-muted">
                Jump: {lastJump.fromNodeId} → {lastJump.toNodeId}
                {lastJump.segmentStartSeconds != null ? ` · seek ${lastJump.segmentStartSeconds}s` : ""}
              </p>
            )}
          </div>
        ) : (
          <p className="studio-muted">No interactive nodes in manifest.</p>
        )}
      </article>

      <article className="studio-panel">
        <div className="studio-panel-heading">
          <span>08</span>
          <h2>Stem · Copyright · Micro-unlock</h2>
        </div>
        <p className="studio-muted">
          Stem-separate is a render-graph edit. Copyright holds proceeds neutrally. Micro-unlocks are sandbox state machines until Stripe/treasury adapters connect.
        </p>
        <div className="studio-actions">
          <button type="button" onClick={() => onAddStemSeparate?.()}>
            + Stem-separate edit
          </button>
          <button type="button" onClick={openClaim}>
            Open claim + hold
          </button>
          <button type="button" onClick={startMicroUnlock}>
            Micro-unlock series
          </button>
          {claim && (
            <>
              <button type="button" onClick={() => setClaim((c) => (c ? runFairUseClassifier(c, 0.28) : c))}>
                Fair-use (low)
              </button>
              <button type="button" onClick={() => setClaim((c) => (c ? runFairUseClassifier(c, 0.91) : c))}>
                Similarity (high)
              </button>
              <button type="button" onClick={() => setClaim((c) => (c ? resolveClaim(c, "creator") : c))}>
                Resolve → creator
              </button>
              <button type="button" onClick={() => setClaim((c) => (c ? resolveClaim(c, "claimant") : c))}>
                Resolve → claimant
              </button>
            </>
          )}
          {unlock && unlock.status === "authorized" && (
            <button type="button" onClick={() => setUnlock((u) => (u ? fulfillMicroUnlock(u) : u))}>
              Fulfill unlock
            </button>
          )}
        </div>
        {claim && (
          <div className="studio-job">
            <span>Claim {claim.status}</span>
            <b>
              {claim.currency} {(claim.heldAmountMinor / 100).toFixed(2)}
              {claim.similarityScore != null ? ` · sim ${claim.similarityScore.toFixed(2)}` : ""}
            </b>
          </div>
        )}
        {unlock && (
          <div className="studio-job">
            <span>Unlock {unlock.status}</span>
            <b>
              {unlock.currency} {(unlock.amountMinor / 100).toFixed(2)} · {unlock.provider}
            </b>
          </div>
        )}
      </article>

      <article className="studio-panel" style={{ gridColumn: "1 / -1" }}>
        <div className="studio-panel-heading">
          <span>09</span>
          <h2>Media ops fit map</h2>
        </div>
        <p className="studio-muted">
          How the high-concurrency / WASM / ML stack maps onto Fresh Web Lite — existing surfaces only; adapters pending where marked.
        </p>
        <div className="studio-ranking">
          {Object.entries(byPillar).map(([pillar, rows]) => (
            <div key={pillar} style={{ display: "block", gridColumn: "1 / -1" }}>
              <strong style={{ textTransform: "uppercase", fontSize: 11, letterSpacing: "0.08em" }}>{pillar}</strong>
              {rows.map((row) => (
                <div key={row.id} style={{ marginTop: 6 }}>
                  <span>{row.status}</span>
                  <span>
                    <b>{row.title}</b>
                    <br />
                    <small style={{ opacity: 0.7 }}>
                      {row.fwlSurface} · {row.coreModule}
                    </small>
                  </span>
                  <em>{row.status}</em>
                </div>
              ))}
            </div>
          ))}
        </div>
      </article>

      <article className="studio-panel" style={{ gridColumn: "1 / -1" }}>
        <div className="studio-panel-heading">
          <span>10</span>
          <h2>Unified tech stack · pillar map</h2>
        </div>
        <p className="studio-muted">Your architecture sections mapped to FWL homes — nothing removed, only fitted.</p>
        <div className="studio-ranking">
          {ARCHITECTURE_PILLAR_MAP.map((row) => (
            <div key={row.pillar} style={{ display: "block", gridColumn: "1 / -1", marginTop: 8 }}>
              <strong>{row.pillar}</strong>
              <p className="studio-muted" style={{ margin: "4px 0" }}>
                Spec: {row.userSpec}
              </p>
              <p className="studio-muted" style={{ margin: 0 }}>
                FWL: {row.fwlHome}
              </p>
            </div>
          ))}
        </div>
        <div className="studio-ranking" style={{ marginTop: 16 }}>
          {UNIFIED_TECH_STACK.map((layer) => (
            <div key={layer.layer} style={{ marginTop: 6 }}>
              <span>{layer.status}</span>
              <span>
                <b>{layer.layer}</b>
                <br />
                <small style={{ opacity: 0.7 }}>{layer.technologies.join(" · ")}</small>
                <br />
                <small style={{ opacity: 0.55 }}>{layer.fwlModules.join(" · ")}</small>
              </span>
              <em>{layer.status}</em>
            </div>
          ))}
        </div>
      </article>
    </>
  );
}

import { useMemo, useState } from "react";
import { MEDIA_OPS_FIT } from "../../core/platform/mediaOpsArchitecture";
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

type Props = {
  onAddStemSeparate?: () => void;
  contentId?: string;
};

/**
 * Additive Studio panels — interactive nodes, copyright arbitration, architecture fit map.
 * Does not replace existing Studio panels; mount beside them.
 */
export default function StudioMediaOpsPanels({ onAddStemSeparate, contentId = "studio-demo" }: Props) {
  const [manifest, setManifest] = useState<InteractiveManifest>(() => demoInteractiveManifest(contentId));
  const [activeNodeId, setActiveNodeId] = useState(manifest.nodes[0]?.id ?? "");
  const [lastJump, setLastJump] = useState<ClientJumpEvent | null>(null);
  const [quizResult, setQuizResult] = useState<string | null>(null);
  const [claim, setClaim] = useState<CopyrightClaim | null>(null);

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
                <button type="button" onClick={() => { setManifest(demoInteractiveManifest(contentId)); setActiveNodeId("n-intro"); setLastJump(null); setQuizResult(null); }}>
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
          <h2>Stem separation · Copyright hold</h2>
        </div>
        <p className="studio-muted">
          Stem-separate is a first-class render-graph edit. Copyright claims hold proceeds neutrally until resolved — no invented balances.
        </p>
        <div className="studio-actions">
          <button type="button" onClick={() => onAddStemSeparate?.()}>
            + Stem-separate edit
          </button>
          <button type="button" onClick={openClaim}>
            Open claim + hold
          </button>
          {claim && (
            <>
              <button type="button" onClick={() => setClaim((c) => (c ? runFairUseClassifier(c, 0.28) : c))}>
                Run fair-use check (low)
              </button>
              <button type="button" onClick={() => setClaim((c) => (c ? runFairUseClassifier(c, 0.91) : c))}>
                Run similarity (high)
              </button>
              <button type="button" onClick={() => setClaim((c) => (c ? resolveClaim(c, "creator") : c))}>
                Resolve → creator
              </button>
              <button type="button" onClick={() => setClaim((c) => (c ? resolveClaim(c, "claimant") : c))}>
                Resolve → claimant
              </button>
            </>
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
    </>
  );
}

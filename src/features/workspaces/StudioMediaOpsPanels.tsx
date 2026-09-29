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
  /** Business tab: interactive + copyright + micro only */
  compact?: boolean;
  /** System tab: fit map + stack only */
  showMapOnly?: boolean;
};

export default function StudioMediaOpsPanels({
  onAddStemSeparate,
  contentId = "studio-demo",
  compact = false,
  showMapOnly = false,
}: Props) {
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

  if (showMapOnly) {
    return (
      <>
        <article className="studio-panel" style={{ gridColumn: "1 / -1" }}>
          <div className="studio-panel-heading">
            <span>Map</span>
            <h2>Media ops fit</h2>
          </div>
          <p className="studio-muted">Architecture under the surface — status only.</p>
          <div className="studio-ranking studio-fit-compact">
            {Object.entries(byPillar).map(([pillar, rows]) => (
              <div key={pillar} className="studio-fit-pillar">
                <strong>{pillar}</strong>
                {rows.map((row) => (
                  <div key={row.id} className="studio-fit-row">
                    <em>{row.status}</em>
                    <span>{row.title}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </article>
        <article className="studio-panel" style={{ gridColumn: "1 / -1" }}>
          <div className="studio-panel-heading">
            <span>Stack</span>
            <h2>Unified tech · pillars</h2>
          </div>
          <div className="studio-ranking">
            {ARCHITECTURE_PILLAR_MAP.map((row) => (
              <div key={row.pillar} className="studio-fit-pillar">
                <strong>{row.pillar}</strong>
                <span className="studio-muted">{row.fwlHome}</span>
              </div>
            ))}
          </div>
          <div className="studio-ranking" style={{ marginTop: 12 }}>
            {UNIFIED_TECH_STACK.map((layer) => (
              <div key={layer.layer}>
                <span>{layer.status}</span>
                <span>
                  <b>{layer.layer}</b>
                  <br />
                  <small style={{ opacity: 0.7 }}>{layer.technologies.join(" · ")}</small>
                </span>
                <em>{layer.status}</em>
              </div>
            ))}
          </div>
        </article>
      </>
    );
  }

  return (
    <>
      {!compact && null}
      <article className="studio-panel">
        <div className="studio-panel-heading">
          <span>Live</span>
          <h2>Interactive nodes</h2>
        </div>
        <p className="studio-muted">Branching choices jump segments without resetting the player.</p>
        {activeNode ? (
          <div className="studio-escrow" style={{ flexDirection: "column", alignItems: "stretch", gap: 10 }}>
            <div>
              <span>
                {activeNode.kind.toUpperCase()} · @{activeNode.atSeconds}s
              </span>
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
                  Restart
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
          <p className="studio-muted">No nodes.</p>
        )}
      </article>

      <article className="studio-panel">
        <div className="studio-panel-heading">
          <span>Rights</span>
          <h2>Copyright · Micro-unlock</h2>
        </div>
        <div className="studio-actions">
          <button type="button" onClick={() => onAddStemSeparate?.()}>
            + Stem edit
          </button>
          <button type="button" onClick={openClaim}>
            Open claim + hold
          </button>
          <button type="button" onClick={startMicroUnlock}>
            Micro-unlock
          </button>
          {claim && (
            <>
              <button type="button" onClick={() => setClaim((c) => (c ? runFairUseClassifier(c, 0.28) : c))}>
                Fair-use
              </button>
              <button type="button" onClick={() => setClaim((c) => (c ? runFairUseClassifier(c, 0.91) : c))}>
                High similarity
              </button>
              <button type="button" onClick={() => setClaim((c) => (c ? resolveClaim(c, "creator") : c))}>
                Resolve creator
              </button>
            </>
          )}
          {unlock?.status === "authorized" && (
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
            </b>
          </div>
        )}
        {unlock && (
          <div className="studio-job">
            <span>Unlock {unlock.status}</span>
            <b>
              {unlock.currency} {(unlock.amountMinor / 100).toFixed(2)}
            </b>
          </div>
        )}
      </article>
    </>
  );
}

import { useMemo, useState } from "react";
import {
  buildRetentionCurve,
  defaultAudioLanes,
  defaultLiveControl,
  enqueueSchedule,
  loadAbVariants,
  loadBrandKit,
  loadDistributionTargets,
  loadScheduleQueue,
  predictViralPerformance,
  saveAbVariants,
  saveBrandKit,
  saveDistributionTargets,
  suggestSearchGaps,
  type AbVariant,
  type BrandKit,
  type DistributionTarget,
  type LiveControlState,
  type ScheduleItem,
} from "../../core/platform/creatorProductionSuite";
import {
  fundEscrow,
  releaseEscrow,
  verifyMilestone,
  type EscrowRecord,
} from "../../core/platform/escrowLedger";
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

type Analytics = Record<string, number | null | undefined>;

type Props = {
  tab: "analytics" | "distribute" | "design" | "audio" | "monetize";
  analytics: Analytics;
  caption: string;
  hasMedia: boolean;
  isShort: boolean;
  onOpenStudio: () => void;
  onApplyCaption?: (text: string) => void;
};

export default function CreatorProductionPanels({
  tab,
  analytics,
  caption,
  hasMedia,
  isShort,
  onOpenStudio,
  onApplyCaption,
}: Props) {
  if (tab === "analytics") return <AnalyticsPanel analytics={analytics} caption={caption} hasMedia={hasMedia} isShort={isShort} onApplyCaption={onApplyCaption} />;
  if (tab === "distribute") return <DistributePanel caption={caption} isShort={isShort} />;
  if (tab === "design") return <DesignPanel />;
  if (tab === "audio") return <AudioPanel onOpenStudio={onOpenStudio} />;
  return <MonetizePanel />;
}

function AnalyticsPanel({
  analytics,
  caption,
  hasMedia,
  isShort,
  onApplyCaption,
}: {
  analytics: Analytics;
  caption: string;
  hasMedia: boolean;
  isShort: boolean;
  onApplyCaption?: (text: string) => void;
}) {
  const curve = useMemo(() => buildRetentionCurve(analytics), [analytics]);
  const prediction = useMemo(
    () =>
      predictViralPerformance({
        caption,
        hasMedia,
        isShort,
        followerCount: Number(analytics.follower_count ?? 0),
      }),
    [caption, hasMedia, isShort, analytics],
  );
  const gaps = useMemo(() => suggestSearchGaps(caption, analytics), [caption, analytics]);
  const [variants, setVariants] = useState<AbVariant[]>(() => loadAbVariants());

  function updateVariant(id: string, patch: Partial<AbVariant>) {
    setVariants((list) => {
      const next = list.map((v) => (v.id === id ? { ...v, ...patch } : v));
      saveAbVariants(next);
      return next;
    });
  }

  return (
    <div className="creator-prod-grid">
      <section className="creator-panel">
        <div className="creator-section-heading">
          <div>
            <span className="workspace-eyebrow">RETENTION</span>
            <h2>Drop-off curve</h2>
          </div>
        </div>
        <p className="creator-muted">Estimated from your live views / likes until full player telemetry is connected.</p>
        <div className="creator-retention">
          {curve.map((p) => (
            <div key={p.second} className="creator-retention-bar" title={`${p.second}s · ${Math.round(p.retained * 100)}%`}>
              <div style={{ height: `${Math.max(8, p.retained * 100)}%` }} />
              <span>{p.second}s</span>
            </div>
          ))}
        </div>
        <div className="creator-metric-row">
          <div>
            <strong>{Number(analytics.short_views ?? 0)}</strong>
            <span>Short views</span>
          </div>
          <div>
            <strong>{Number(analytics.short_likes ?? analytics.post_likes ?? 0)}</strong>
            <span>Likes</span>
          </div>
          <div>
            <strong>{Number(analytics.follower_count ?? 0)}</strong>
            <span>Followers</span>
          </div>
          <div>
            <strong>{Number(analytics.short_reposts ?? 0)}</strong>
            <span>Reposts</span>
          </div>
        </div>
      </section>
      <section className="creator-panel">
        <div className="creator-section-heading">
          <div>
            <span className="workspace-eyebrow">20× PREDICT</span>
            <h2>Viral & retention simulator</h2>
          </div>
        </div>
        <div className="creator-metric-row">
          <div>
            <strong>{Math.round(prediction.viralProbability * 100)}%</strong>
            <span>Viral probability</span>
          </div>
          <div>
            <strong>
              {prediction.ctrRange[0]}–{prediction.ctrRange[1]}%
            </strong>
            <span>CTR range</span>
          </div>
          <div>
            <strong>{Math.round(prediction.dropOffRisk * 100)}%</strong>
            <span>Drop-off risk</span>
          </div>
        </div>
        <ul className="creator-note-list">
          {prediction.notes.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
        <p className="creator-muted">Regions: {prediction.regionHints.join(" · ")}</p>
      </section>
      <section className="creator-panel">
        <div className="creator-section-heading">
          <div>
            <span className="workspace-eyebrow">RESEARCH</span>
            <h2>Search-gap ideas</h2>
          </div>
        </div>
        <div className="creator-suggestion-grid">
          {gaps.map((g) => (
            <article className="creator-suggestion-card" key={g.topic}>
              <div>
                <strong>{g.topic}</strong>
                <p>
                  {g.format} · gap {Math.round(g.gapScore * 100)}% — {g.reason}
                </p>
              </div>
              {onApplyCaption && (
                <button type="button" onClick={() => onApplyCaption(g.topic)}>
                  Use
                </button>
              )}
            </article>
          ))}
        </div>
      </section>
      <section className="creator-panel">
        <div className="creator-section-heading">
          <div>
            <span className="workspace-eyebrow">A/B/C</span>
            <h2>Title · hook · thumbnail variants</h2>
          </div>
        </div>
        <div className="creator-ab-grid">
          {variants.map((v) => (
            <div className="creator-ab-card" key={v.id}>
              <strong>Variant {v.label}</strong>
              <label>
                Title
                <input value={v.title} onChange={(e) => updateVariant(v.id, { title: e.target.value })} placeholder="Title variation" />
              </label>
              <label>
                Opening hook
                <input value={v.hook} onChange={(e) => updateVariant(v.id, { hook: e.target.value })} placeholder="First 3 seconds" />
              </label>
              <label>
                Thumbnail URL
                <input
                  value={v.thumbnailUrl ?? ""}
                  onChange={(e) => updateVariant(v.id, { thumbnailUrl: e.target.value || null })}
                  placeholder="https://…"
                />
              </label>
            </div>
          ))}
        </div>
        <p className="creator-muted">Variants save on this device. Live multi-arm tests connect when the experiment rail is online.</p>
      </section>
    </div>
  );
}

function DistributePanel({ caption, isShort }: { caption: string; isShort: boolean }) {
  const [targets, setTargets] = useState<DistributionTarget[]>(() => loadDistributionTargets());
  const [scheduleAt, setScheduleAt] = useState("");
  const [queue, setQueue] = useState<ScheduleItem[]>(() => loadScheduleQueue());
  const [live, setLive] = useState<LiveControlState>(() => defaultLiveControl());
  const [msg, setMsg] = useState<string | null>(null);

  function toggle(channel: DistributionTarget["channel"]) {
    setTargets((list) => {
      const next = list.map((t) => (t.channel === channel ? { ...t, enabled: !t.enabled } : t));
      saveDistributionTargets(next);
      return next;
    });
  }

  function queueSchedule() {
    const channels = targets.filter((t) => t.enabled).map((t) => t.channel);
    if (!channels.length) {
      setMsg("Enable at least one channel.");
      return;
    }
    const when = scheduleAt || new Date(Date.now() + 3600_000).toISOString().slice(0, 16);
    const item = enqueueSchedule({
      title: caption.trim() || (isShort ? "Scheduled Short" : "Scheduled post"),
      channels,
      scheduledAt: new Date(when).toISOString(),
    });
    setQueue(loadScheduleQueue());
    setMsg(`Queued “${item.title}” for ${channels.length} channel(s).`);
  }

  return (
    <div className="creator-prod-grid">
      <section className="creator-panel">
        <div className="creator-section-heading">
          <div>
            <span className="workspace-eyebrow">DISTRIBUTE</span>
            <h2>Multi-platform targets</h2>
          </div>
        </div>
        <div className="creator-channel-list">
          {targets.map((t) => (
            <label key={t.channel} className={t.enabled ? "on" : ""}>
              <input type="checkbox" checked={t.enabled} onChange={() => toggle(t.channel)} />
              <span>{t.label}</span>
            </label>
          ))}
        </div>
        <div className="creator-editor-actions">
          <label className="creator-inline-label">
            Schedule
            <input type="datetime-local" value={scheduleAt} onChange={(e) => setScheduleAt(e.target.value)} />
          </label>
          <button type="button" className="publish" onClick={queueSchedule}>
            Queue release
          </button>
        </div>
        {msg && <p className="creator-message">{msg}</p>}
        {queue.length > 0 && (
          <div className="creator-schedule-list">
            {queue.slice(0, 8).map((q) => (
              <article key={q.id}>
                <strong>{q.title}</strong>
                <span>
                  {q.status} · {new Date(q.scheduledAt).toLocaleString()} · {q.channels.join(", ")}
                </span>
              </article>
            ))}
          </div>
        )}
      </section>
      <section className="creator-panel">
        <div className="creator-section-heading">
          <div>
            <span className="workspace-eyebrow">LIVE</span>
            <h2>Control room</h2>
          </div>
          <span>{live.status}</span>
        </div>
        <div className="creator-channel-list">
          <label className={live.streamKeySet ? "on" : ""}>
            <input
              type="checkbox"
              checked={live.streamKeySet}
              onChange={() => setLive((s) => ({ ...s, streamKeySet: !s.streamKeySet, status: !s.streamKeySet ? "ready" : "idle" }))}
            />
            <span>Stream key configured</span>
          </label>
          <label className={live.chatModeration ? "on" : ""}>
            <input type="checkbox" checked={live.chatModeration} onChange={() => setLive((s) => ({ ...s, multiHost: !s.multiHost }))} />
            <span>Chat moderation</span>
          </label>
          <label className={live.multiHost ? "on" : ""}>
            <input type="checkbox" checked={live.multiHost} onChange={() => setLive((s) => ({ ...s, multiHost: !s.multiHost }))} />
            <span>Multi-host guests</span>
          </label>
          <label className={live.gifting ? "on" : ""}>
            <input type="checkbox" checked={live.gifting} onChange={() => setLive((s) => ({ ...s, gifting: !s.gifting }))} />
            <span>Live gifting</span>
          </label>
        </div>
        <div className="creator-editor-actions">
          <button
            type="button"
            className="publish"
            disabled={!live.streamKeySet}
            onClick={() => setLive((s) => ({ ...s, status: s.status === "live" ? "ready" : "live" }))}
          >
            {live.status === "live" ? "End live" : "Go live (local ready)"}
          </button>
        </div>
        <p className="creator-muted">Ingest keys and RTMP workers attach when the Live rail is connected. Controls are real state on this device.</p>
      </section>
    </div>
  );
}

function DesignPanel() {
  const [kit, setKit] = useState<BrandKit>(() => loadBrandKit());
  const [saved, setSaved] = useState(false);
  function patch(p: Partial<BrandKit>) {
    setKit((k) => ({ ...k, ...p }));
    setSaved(false);
  }
  function persist() {
    saveBrandKit(kit);
    setSaved(true);
  }
  return (
    <div className="creator-prod-grid">
      <section className="creator-panel">
        <div className="creator-section-heading">
          <div>
            <span className="workspace-eyebrow">BRAND KIT</span>
            <h2>Channel identity</h2>
          </div>
        </div>
        <div className="creator-brand-grid">
          <label>
            Name
            <input value={kit.name} onChange={(e) => patch({ name: e.target.value })} />
          </label>
          <label>
            Primary
            <input type="color" value={kit.primaryColor} onChange={(e) => patch({ primaryColor: e.target.value })} />
          </label>
          <label>
            Secondary
            <input type="color" value={kit.secondaryColor} onChange={(e) => patch({ secondaryColor: e.target.value })} />
          </label>
          <label>
            Accent
            <input type="color" value={kit.accentColor} onChange={(e) => patch({ accentColor: e.target.value })} />
          </label>
          <label>
            Heading font
            <input value={kit.fontHeading} onChange={(e) => patch({ fontHeading: e.target.value })} />
          </label>
          <label>
            Body font
            <input value={kit.fontBody} onChange={(e) => patch({ fontBody: e.target.value })} />
          </label>
          <label className="span-2">
            Logo URL
            <input value={kit.logoUrl} onChange={(e) => patch({ logoUrl: e.target.value })} placeholder="https://…" />
          </label>
          <label className="span-2">
            Watermark
            <input value={kit.watermarkText} onChange={(e) => patch({ watermarkText: e.target.value })} />
          </label>
        </div>
        <div
          className="creator-brand-preview"
          style={{
            background: `linear-gradient(135deg, ${kit.primaryColor}, ${kit.secondaryColor})`,
            color: "#fff",
            fontFamily: kit.fontHeading,
          }}
        >
          <strong>{kit.name || "Channel"}</strong>
          <span style={{ fontFamily: kit.fontBody }}>{kit.watermarkText || "Thumbnail / banner preview"}</span>
        </div>
        <div className="creator-editor-actions">
          <button type="button" className="publish" onClick={persist}>
            Save brand kit
          </button>
          {saved && <span className="creator-message">Saved on this device.</span>}
        </div>
      </section>
      <section className="creator-panel">
        <div className="creator-section-heading">
          <div>
            <span className="workspace-eyebrow">CANVAS</span>
            <h2>Thumbnails & graphics</h2>
          </div>
        </div>
        <p className="creator-muted">
          Drag-and-drop canvas, stock library, and text-to-image adapters plug into this workspace. Brand colors and type above feed every asset.
        </p>
        <div className="creator-brand-preview" style={{ minHeight: 140, background: kit.secondaryColor }}>
          <span style={{ color: kit.accentColor }}>CTR thumbnail frame</span>
          <strong style={{ color: "#fff", fontFamily: kit.fontHeading }}>Hook line here</strong>
        </div>
      </section>
    </div>
  );
}

function AudioPanel({ onOpenStudio }: { onOpenStudio: () => void }) {
  const [lanes, setLanes] = useState(() => defaultAudioLanes());
  const [tts, setTts] = useState("");
  const [ttsMsg, setTtsMsg] = useState<string | null>(null);
  function speak() {
    if (!tts.trim() || typeof window === "undefined" || !window.speechSynthesis) {
      setTtsMsg("Speech synthesis unavailable on this device.");
      return;
    }
    const u = new SpeechSynthesisUtterance(tts.trim());
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
    setTtsMsg("Playing local TTS preview.");
  }
  return (
    <div className="creator-prod-grid">
      <section className="creator-panel">
        <div className="creator-section-heading">
          <div>
            <span className="workspace-eyebrow">STEMS</span>
            <h2>Audio lanes</h2>
          </div>
        </div>
        <div className="creator-audio-lanes">
          {lanes.map((lane) => (
            <div key={lane.id} className="creator-audio-lane">
              <strong>{lane.name}</strong>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(lane.gain * 100)}
                onChange={(e) =>
                  setLanes((list) =>
                    list.map((l) => (l.id === lane.id ? { ...l, gain: Number(e.target.value) / 100 } : l)),
                  )
                }
              />
              <button
                type="button"
                onClick={() => setLanes((list) => list.map((l) => (l.id === lane.id ? { ...l, muted: !l.muted } : l)))}
              >
                {lane.muted ? "Unmute" : "Mute"}
              </button>
            </div>
          ))}
        </div>
        <p className="creator-muted">AI stem isolation runs in Studio (stem-separate edit + pipeline). Open Studio to attach to a timeline.</p>
        <button type="button" className="publish" onClick={onOpenStudio}>
          Open Studio for stems / NLE
        </button>
      </section>
      <section className="creator-panel">
        <div className="creator-section-heading">
          <div>
            <span className="workspace-eyebrow">VOICE</span>
            <h2>Text-to-speech preview</h2>
          </div>
        </div>
        <textarea value={tts} onChange={(e) => setTts(e.target.value)} placeholder="Script line for narration or fix-ups…" rows={4} />
        <div className="creator-editor-actions">
          <button type="button" onClick={speak} disabled={!tts.trim()}>
            Play local TTS
          </button>
        </div>
        {ttsMsg && <p className="creator-message">{ttsMsg}</p>}
        <p className="creator-muted">Voice cloning, lip-sync dubbing, and pro FX stack attach as adapters. Local TTS works now.</p>
      </section>
    </div>
  );
}

function MonetizePanel() {
  const [escrow, setEscrow] = useState<EscrowRecord>(() =>
    fundEscrow({
      payerId: "brand-demo",
      payeeId: "creator-demo",
      amountMinor: 120000,
      currency: "UGX",
      milestone: "Deliver campaign cut + 10k views",
    }),
  );
  const [claim, setClaim] = useState<CopyrightClaim | null>(null);
  const [unlock, setUnlock] = useState<MicroUnlock | null>(null);
  const [membership, setMembership] = useState({ tier: "Supporter", priceMinor: 5000, enabled: false });
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  function doVerify() {
    setEscrow((e) => {
      const next = verifyMilestone(e);
      setActionMsg(
        next.status === "milestone-pending"
          ? "Milestone verified — ready to release."
          : `Escrow is ${next.status}; verify only applies while funded.`,
      );
      return next;
    });
  }

  function doRelease() {
    setEscrow((e) => {
      const next = releaseEscrow(e);
      if (next.status === "released" && e.status !== "released") {
        setActionMsg("Funds released to creator (local contract). Treasury settlement attaches when Wallet rail is live.");
      } else if (next.status === "released") {
        setActionMsg("Already released.");
      } else {
        setActionMsg(`Cannot release while status is ${e.status}.`);
      }
      return next;
    });
  }

  function doOpenClaim() {
    try {
      const c = openCopyrightClaim({
        contentId: "creator-asset",
        claimantId: "rights-holder",
        creatorId: "creator-demo",
        reason: "Content ID style claim",
        heldAmountMinor: 18000,
        currency: "UGX",
      });
      setClaim(holdClaimProceeds(c));
      setActionMsg("Claim opened — revenue held pending resolution.");
    } catch (err: unknown) {
      setActionMsg(err instanceof Error ? err.message : "Could not open claim.");
    }
  }

  return (
    <div className="creator-prod-grid">
      <section className="creator-panel">
        <div className="creator-section-heading">
          <div>
            <span className="workspace-eyebrow">ESCROW</span>
            <h2>Sponsor deals</h2>
          </div>
        </div>
        <div className="creator-metric-row">
          <div>
            <strong>
              {escrow.currency} {(escrow.amountMinor / 100).toFixed(2)}
            </strong>
            <span>{escrow.status}</span>
          </div>
        </div>
        <p className="creator-muted">{escrow.milestone}</p>
        <div className="creator-editor-actions">
          <button type="button" onClick={doVerify}>
            Verify milestone
          </button>
          <button type="button" className="publish" onClick={doRelease}>
            Release funds
          </button>
        </div>
        {actionMsg && <p className="creator-message">{actionMsg}</p>}
      </section>

      <section className="creator-panel">
        <div className="creator-section-heading">
          <div>
            <span className="workspace-eyebrow">RIGHTS</span>
            <h2>Copyright arbitration</h2>
          </div>
        </div>
        <div className="creator-editor-actions">
          <button type="button" onClick={doOpenClaim}>
            Open claim + hold revenue
          </button>
          {claim && (
            <>
              <button type="button" onClick={() => setClaim((c) => (c ? runFairUseClassifier(c, 0.3) : c))}>
                Fair-use check
              </button>
              <button type="button" onClick={() => setClaim((c) => (c ? resolveClaim(c, "creator") : c))}>
                Resolve → creator
              </button>
            </>
          )}
        </div>
        {claim && (
          <p className="creator-message">
            Claim {claim.status} · held {claim.currency} {(claim.heldAmountMinor / 100).toFixed(2)}
          </p>
        )}
      </section>

      <section className="creator-panel">
        <div className="creator-section-heading">
          <div>
            <span className="workspace-eyebrow">PAYWALL</span>
            <h2>Memberships & unlocks</h2>
          </div>
        </div>
        <label className="creator-inline-label">
          Tier name
          <input value={membership.tier} onChange={(e) => setMembership((m) => ({ ...m, tier: e.target.value }))} />
        </label>
        <label className="creator-inline-label">
          Price (UGX minor/100)
          <input
            type="number"
            value={membership.priceMinor / 100}
            onChange={(e) => setMembership((m) => ({ ...m, priceMinor: Math.round(Number(e.target.value) * 100) }))}
          />
        </label>
        <div className="creator-editor-actions">
          <button type="button" onClick={() => setMembership((m) => ({ ...m, enabled: !m.enabled }))}>
            {membership.enabled ? "Disable tier" : "Enable tier"}
          </button>
          <button
            type="button"
            className="publish"
            onClick={() => {
              const u = createMicroUnlock({
                buyerId: "fan-demo",
                sellerId: "creator-demo",
                assetId: "series-1",
                assetKind: "series",
                amountMinor: membership.priceMinor,
                currency: "UGX",
              });
              setUnlock(authorizeMicroUnlock(u));
              setActionMsg("Micro-unlock authorized (sandbox).");
            }}
          >
            Demo micro-unlock
          </button>
          {unlock?.status === "authorized" && (
            <button
              type="button"
              onClick={() => {
                setUnlock((u) => (u ? fulfillMicroUnlock(u) : u));
                setActionMsg("Unlock fulfilled.");
              }}
            >
              Fulfill
            </button>
          )}
        </div>
        {unlock && (
          <p className="creator-message">
            Unlock {unlock.status} · {unlock.currency} {(unlock.amountMinor / 100).toFixed(2)}
          </p>
        )}
        <p className="creator-muted">Ad mid-rolls, CPM, Super Thanks, and gifts connect through Wallet/Live rails without inventing balances.</p>
      </section>
    </div>
  );
}

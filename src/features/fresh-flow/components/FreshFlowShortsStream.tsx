import { useEffect, useRef, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { useFreshId } from "../../fresh-id/context/FreshIdContext";
import { CommentPanel } from "../../comments/components/CommentPanel";
import { ReactionPicker } from "../../reactions/components/ReactionPicker";
import { loadFreshFlowShorts, type FreshFlowLoadOptions } from "../core/loadFreshFlowShorts";
import { rankFreshFlow, rankTrending } from "../core/FreshFlowRanking";
import { rankForYou } from "../../shorts/core/ForYouRanking";
import { sendGift, getGiftTotals, type GiftTotal } from "../core/giftService";
import { interactWithShort, removeShortInteraction } from "../../shorts/core/ShortsUniversalInteractionAdapter";
import { getEcosystemProfile, upsertEcosystemProfile, FRESH_FLOW_FEED_MODES } from "../../profile/services/ecosystemProfileService";
import type { UniversalReactionKind } from "../../../core/interactions/FreshReactionModel";
import type { Short } from "../../shorts/types/short";
import "./FreshFlow.css";

type SubTab = "for-you" | "trending" | "following" | "fresh-picks";
type FilterMode = "all" | "social" | "learn" | "relax";
type AdvancedAction = "quote" | "remix" | "duet" | "collaborate";

// The visible Short Flow row is locked to the supplied reference image.
const SUB_TABS: Array<{ id: SubTab; label: string; icon: string }> = [
  { id: "for-you", label: "For You", icon: "☆" },
  { id: "trending", label: "Trending", icon: "↗" },
  { id: "following", label: "Following", icon: "♧" },
  { id: "fresh-picks", label: "Fresh Picks", icon: "◇" },
];

const FILTERS: Array<{ id: FilterMode; label: string }> = [
  { id: "all", label: "All" },
  { id: "social", label: "Social" },
  { id: "learn", label: "Learn" },
  { id: "relax", label: "Relax" },
];

const ADVANCED_ACTIONS: Array<{ id: AdvancedAction; label: string; icon: string; description: string }> = [
  { id: "quote", label: "Quote", icon: "❝", description: "Create a quoted response to this Short." },
  { id: "remix", label: "Remix", icon: "✦", description: "Start a remix using this Short as the source." },
  { id: "duet", label: "Duet", icon: "◫", description: "Start a side-by-side duet with this Short." },
  { id: "collaborate", label: "Collaborate", icon: "♧", description: "Invite this creator into a collaboration." },
];

const GIFT_PRESETS: Array<{ label: string; amountMinor: string }> = [
  { label: "1", amountMinor: "100" },
  { label: "5", amountMinor: "500" },
  { label: "10", amountMinor: "1000" },
  { label: "50", amountMinor: "5000" },
];

type ConnectionQuality = "fast" | "slow";

/** Uses the Network Information API where available; assumes "fast" if unsupported. */
function getConnectionQuality(): ConnectionQuality {
  const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
  if (!connection) return "fast";
  if (connection.saveData) return "slow";
  if (typeof connection.effectiveType === "string" && ["slow-2g", "2g", "3g"].includes(connection.effectiveType)) return "slow";
  return "fast";
}

type PreloadPlan = { hasSrc: boolean; preload: "auto" | "metadata" | "none" };

/**
 * Video preload strategy, distance = index - currentIndex:
 *  0 (current): aggressive preload, plays immediately.
 *  1 (next): preload in the background before the swipe.
 *  2 (following): warm up only when bandwidth allows (skipped on slow connections).
 *  anything else (already watched, or further ahead): release media resources.
 * Slow connections get a lighter strategy at every tier that still preloads.
 */
function getPreloadPlan(distance: number, quality: ConnectionQuality): PreloadPlan {
  if (distance === 0) return { hasSrc: true, preload: "auto" };
  if (distance === 1) return quality === "fast" ? { hasSrc: true, preload: "auto" } : { hasSrc: true, preload: "metadata" };
  if (distance === 2) return quality === "fast" ? { hasSrc: true, preload: "auto" } : { hasSrc: false, preload: "none" };
  return { hasSrc: false, preload: "none" };
}

/** Real union of who you follow and who follows you (no "friends" table exists). */
async function getSocialAuthorIds(userId: string): Promise<string[]> {
  const [{ data: following }, { data: followers }] = await Promise.all([
    supabase.from("follows").select("followed_id").eq("follower_id", userId),
    supabase.from("follows").select("follower_id").eq("followed_id", userId),
  ]);
  const ids = new Set<string>();
  (following ?? []).forEach((row: any) => ids.add(row.followed_id));
  (followers ?? []).forEach((row: any) => ids.add(row.follower_id));
  return Array.from(ids);
}

type FreshFlowShortsStreamProps = {
  onImmersiveChange?: (immersive: boolean) => void;
};

export default function FreshFlowShortsStream({ onImmersiveChange }: FreshFlowShortsStreamProps = {}) {
  const { user, isGuest } = useFreshId();
  const [subTab, setSubTab] = useState<SubTab>("for-you");
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [shorts, setShorts] = useState<Short[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [giftTotals, setGiftTotals] = useState<Map<string, GiftTotal>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openCommentsFor, setOpenCommentsFor] = useState<string | null>(null);
  const [giftTargetId, setGiftTargetId] = useState<string | null>(null);
  const [advancedTargetId, setAdvancedTargetId] = useState<string | null>(null);
  const [giftError, setGiftError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [giftSending, setGiftSending] = useState(false);
  const [actionSending, setActionSending] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  const viewedRef = useRef<Set<string>>(new Set());
  const [immersive, setImmersive] = useState(false);
  const immersiveTriggeredRef = useRef(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [connectionQuality, setConnectionQuality] = useState<ConnectionQuality>(() => getConnectionQuality());

  useEffect(() => {
    const connection = (navigator as any).connection;
    if (!connection || typeof connection.addEventListener !== "function") return;
    const handler = () => setConnectionQuality(getConnectionQuality());
    connection.addEventListener("change", handler);
    return () => connection.removeEventListener("change", handler);
  }, []);

  // Once per session: 5 seconds after Fresh Flow's Home tab mounts, the
  // chrome (sub-tabs + the six-ecosystem top nav) collapses into a compact
  // TikTok-style overlay so the video fills the screen. Confirmed decision:
  // fires once only, not per-video. Tapping the video (not a button) exits
  // back to full chrome.
  useEffect(() => {
    if (immersiveTriggeredRef.current) return;
    const timer = setTimeout(() => {
      if (immersiveTriggeredRef.current) return;
      immersiveTriggeredRef.current = true;
      setImmersive(true);
      onImmersiveChange?.(true);
    }, 5000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const exitImmersive = () => {
    if (!immersive) return;
    setImmersive(false);
    onImmersiveChange?.(false);
  };

  // Background sync only: ensures a real ecosystem_profiles row exists for
  // this user's Fresh Flow feed. Does NOT currently drive the visible tab
  // list (SUB_TABS/FILTERS below are locked to the reference design) --
  // reconciling them is a deliberate follow-up, not forced into this merge.
  useEffect(() => {
    if (!user || isGuest) return;
    (async () => {
      try {
        const existing = await getEcosystemProfile(user.id, "fresh-flow");
        if (!existing) {
          await upsertEcosystemProfile({
            freshId: user.id,
            ecosystemId: "fresh-flow",
            title: "Fresh Flow",
            description: "Personalized · Intelligent · Yours",
            enabled: true,
            level: 1,
            feedModes: FRESH_FLOW_FEED_MODES,
            metadata: {},
          });
        }
      } catch {
        // Non-blocking: Fresh Flow still works from local state if this fails.
      }
    })();
  }, [user, isGuest]);

  const load = async (tab: SubTab, selectedFilter: FilterMode = filterMode) => {
    if (tab === "fresh-picks") {
      setShorts([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const options: FreshFlowLoadOptions = selectedFilter === "learn"
        ? { category: "learn" }
        : selectedFilter === "relax"
          ? { category: "relax" }
          : {};
      const result = await loadFreshFlowShorts(user?.id ?? null, isGuest, options);
      let candidates = result.shorts;

      if (tab === "following") {
        candidates = candidates.filter((s) => s.isFollowingAuthor);
      } else if (selectedFilter === "social") {
        if (!user || isGuest) {
          candidates = [];
        } else {
          const socialIds = new Set(await getSocialAuthorIds(user.id));
          candidates = candidates.filter((s) => socialIds.has(s.authorId));
        }
      }

      const ranked = tab === "trending"
        ? rankTrending(candidates)
        : tab === "for-you"
          ? rankForYou(candidates, new Set())
          : rankFreshFlow(candidates);

      setShorts(ranked);
      setSavedIds(result.savedIds);
      setGiftTotals(await getGiftTotals(ranked.map((s) => s.id)));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load Fresh Flow.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(subTab, filterMode);
  }, [subTab, filterMode, user?.id, isGuest]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const video = entry.target as HTMLVideoElement;
        const shortId = video.dataset.shortId!;
        if (entry.isIntersecting && entry.intersectionRatio > 0.6) {
          video.play().catch(() => {});
          const index = shorts.findIndex((s) => s.id === shortId);
          if (index >= 0) setCurrentIndex(index);
          if (!viewedRef.current.has(shortId)) {
            viewedRef.current.add(shortId);
            void supabase.rpc("increment_short_views", { short_id_input: shortId });
          }
        } else video.pause();
      });
    }, { root: container, threshold: [0, 0.6, 1] });
    videoRefs.current.forEach((video) => observer.observe(video));
    return () => observer.disconnect();
  }, [shorts]);

  // These update local state directly instead of re-fetching and re-ranking
  // the whole feed. A full reload on every tap was reordering the carousel
  // under the user\'s finger -- the write always succeeded, but it looked
  // broken because the item they just tapped could move or disappear.
  const react = async (short: Short, type: string) => {
    if (!user || isGuest) return;
    setActionError(null);
    const previous = short.myReaction;
    try {
      if (previous === type) await removeShortInteraction(user.id, short.id, "react");
      else await interactWithShort(user.id, short.id, "react", { reaction: type as UniversalReactionKind });
      setShorts((current) => current.map((s) => {
        if (s.id !== short.id) return s;
        if (previous === type) return { ...s, myReaction: null, likeCount: Math.max(0, s.likeCount - 1) };
        if (previous === null) return { ...s, myReaction: type, likeCount: s.likeCount + 1 };
        return { ...s, myReaction: type };
      }));
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : "Unable to react.");
    }
  };

  const toggleSave = async (short: Short) => {
    if (!user || isGuest) return;
    setActionError(null);
    const wasSaved = savedIds.has(short.id);
    try {
      if (wasSaved) await removeShortInteraction(user.id, short.id, "save");
      else await interactWithShort(user.id, short.id, "save");
      setSavedIds((current) => {
        const next = new Set(current);
        if (wasSaved) next.delete(short.id);
        else next.add(short.id);
        return next;
      });
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : "Unable to save.");
    }
  };

  const toggleRepost = async (short: Short) => {
    if (!user || isGuest) return;
    setActionError(null);
    const wasReposted = short.repostedByMe;
    try {
      if (wasReposted) await removeShortInteraction(user.id, short.id, "repost");
      else await interactWithShort(user.id, short.id, "repost");
      setShorts((current) => current.map((s) =>
        s.id === short.id ? { ...s, repostedByMe: !wasReposted, repostCount: Math.max(0, s.repostCount + (wasReposted ? -1 : 1)) } : s,
      ));
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : "Unable to repost.");
    }
  };

  const toggleFollow = async (short: Short) => {
    if (!user || isGuest || short.authorId === user.id) return;
    setActionError(null);
    const wasFollowing = short.isFollowingAuthor;
    try {
      if (wasFollowing) await supabase.from("follows").delete().eq("follower_id", user.id).eq("followed_id", short.authorId);
      else await supabase.from("follows").insert({ follower_id: user.id, followed_id: short.authorId });
      setShorts((current) => current.map((s) => (s.authorId === short.authorId ? { ...s, isFollowingAuthor: !wasFollowing } : s)));
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : "Unable to follow.");
    }
  };

  const share = async (short: Short) => {
    if (user && !isGuest) {
      try { await interactWithShort(user.id, short.id, "share", { payload: { channel: "native-or-clipboard" } }); } catch { /* sharing remains usable if persistence is temporarily unavailable */ }
    }
    const shareData = { title: `Fresh Short by ${short.authorName}`, text: short.caption ?? "Fresh Flow", url: short.videoUrl };
    try {
      if (navigator.share) await navigator.share(shareData);
      else await navigator.clipboard.writeText(short.videoUrl);
    } catch { /* user cancelled share */ }
  };

  const advancedAction = async (short: Short, action: AdvancedAction) => {
    if (!user || isGuest) return;
    setActionSending(true); setActionError(null);
    try {
      await interactWithShort(user.id, short.id, action, {
        payload: { sourceShortId: short.id, sourceAuthorId: short.authorId, sourceVideoUrl: short.videoUrl, requestedAt: new Date().toISOString() },
      });
      setAdvancedTargetId(null);
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : `Unable to start ${action}.`);
    } finally { setActionSending(false); }
  };

  const gift = async (short: Short, amountMinor: string) => {
    if (!user || isGuest || short.authorId === user.id) return;
    setGiftError(null); setGiftSending(true);
    try {
      await sendGift(short.id, short.authorId, amountMinor);
      setGiftTotals(await getGiftTotals(shorts.map((s) => s.id)));
      setGiftTargetId(null);
    } catch (cause) {
      setGiftError(cause instanceof Error ? cause.message : "Gift failed.");
    } finally { setGiftSending(false); }
  };

  const formatCount = (n: number) => n >= 1_000_000 ? (n / 1_000_000).toFixed(1) + "M" : n >= 1_000 ? (n / 1_000).toFixed(1) + "K" : String(n);

  return (
    <div className="fresh-flow-vertical">
      <nav className={`fresh-flow-subtabs${immersive ? " hidden-immersive" : ""}`} aria-label="Fresh Flow Shorts discovery modes">
        {SUB_TABS.map((item) => <button key={item.id} className={subTab === item.id ? "fresh-flow-subtab active" : "fresh-flow-subtab"} onClick={() => { setSubTab(item.id); setFilterOpen(false); }} aria-pressed={subTab === item.id}><span aria-hidden="true">{item.icon}</span>{item.label}</button>)}
        <button className={filterOpen ? "fresh-flow-subtab filter active" : "fresh-flow-subtab filter"} onClick={() => setFilterOpen((open) => !open)} aria-label="Open Fresh Flow filters and models" aria-expanded={filterOpen}>⚙ Filters / Models</button>
      </nav>

      {filterOpen && <div className="fresh-flow-filter-panel" aria-label="Fresh Flow filters and models"><span className="fresh-flow-filter-title">Refine this Short Flow</span>{FILTERS.map((item) => <button key={item.id} className={filterMode === item.id ? "fresh-flow-filter-chip active" : "fresh-flow-filter-chip"} onClick={() => { setFilterMode(item.id); setFilterOpen(false); }} aria-pressed={filterMode === item.id}>{item.label}</button>)}<span className="fresh-flow-filter-title">Models: adaptive ranking • interest signals • social graph</span></div>}

      {subTab === "fresh-picks" ? (
        <p className="fresh-flow-empty">Fresh Picks is scoped but not built yet — it needs a real editorial curation system, which doesn't exist on the platform yet.</p>
      ) : loading ? (
        <p className="fresh-flow-empty">Loading Fresh Flow…</p>
      ) : error ? (
        <p className="fresh-flow-empty" role="alert">{error}</p>
      ) : shorts.length === 0 ? (
        <p className="fresh-flow-empty">{filterMode === "social" ? "Follow or connect with people to see their Shorts here." : "Nothing here yet."}</p>
      ) : (
        <div className="fresh-flow-stream" ref={containerRef}>
          {shorts.map((short, index) => {
            const totals = giftTotals.get(short.id);
            const distance = index - currentIndex;
            const preloadPlan = getPreloadPlan(distance, connectionQuality);
            return (
              <div key={short.id} className="fresh-flow-item">
                <video ref={(el) => { if (el) videoRefs.current.set(short.id, el); else videoRefs.current.delete(short.id); }} data-short-id={short.id} src={preloadPlan.hasSrc ? short.videoUrl : undefined} preload={preloadPlan.preload} loop playsInline className="fresh-flow-video" onClick={exitImmersive} />
                <div className="fresh-flow-overlay"><div className="fresh-flow-author-row"><span className="fresh-flow-author">{short.authorName}</span>{!isGuest && user && short.authorId !== user.id && <button className={short.isFollowingAuthor ? "fresh-flow-chip following" : "fresh-flow-chip"} onClick={() => void toggleFollow(short)}>{short.isFollowingAuthor ? "Following" : "Follow"}</button>}</div>{short.caption && <p className="fresh-flow-caption">{short.caption}</p>}</div>

                <div className="fresh-flow-actions">
                  <ReactionPicker myReaction={short.myReaction} count={short.likeCount} disabled={isGuest} variant="short" onReact={(type) => void react(short, type)} />
                  <button className="fresh-flow-action-btn" onClick={() => setOpenCommentsFor(short.id)} aria-label="Comments"><span>💬</span><span>{formatCount(short.commentCount)}</span></button>
                  <button className={short.repostedByMe ? "fresh-flow-action-btn reposted" : "fresh-flow-action-btn"} onClick={() => void toggleRepost(short)} disabled={isGuest} aria-label="Repost"><span>↻</span><span>{formatCount(short.repostCount)}</span></button>
                  <button className="fresh-flow-action-btn" onClick={() => void share(short)} aria-label="Share"><span>↗</span><span>Share</span></button>
                  <button className={savedIds.has(short.id) ? "fresh-flow-action-btn saved" : "fresh-flow-action-btn"} onClick={() => void toggleSave(short)} disabled={isGuest} aria-label="Save"><span>🔖</span><span>{savedIds.has(short.id) ? "Saved" : "Save"}</span></button>
                  <button className="fresh-flow-action-btn" onClick={() => { setAdvancedTargetId(short.id); setActionError(null); }} aria-label="More creation and collaboration actions"><span>•••</span><span>More</span></button>
                  {!isGuest && user && short.authorId !== user.id && <button className="fresh-flow-action-btn gift" onClick={() => { setGiftTargetId(short.id); setGiftError(null); }} aria-label="Send gift"><span>🎁</span><span>{totals ? formatCount(totals.count) : 0}</span></button>}
                </div>

                {advancedTargetId === short.id && <div className="fresh-flow-advanced-panel" role="dialog" aria-label="Short creation and collaboration actions" onClick={(e) => e.stopPropagation()}><div className="fresh-flow-advanced-header"><strong>Do more with this Short</strong><button onClick={() => setAdvancedTargetId(null)} aria-label="Close">×</button></div>{ADVANCED_ACTIONS.map((item) => <button key={item.id} className="fresh-flow-advanced-action" disabled={actionSending || isGuest} onClick={() => void advancedAction(short, item.id)}><span className="fresh-flow-advanced-icon">{item.icon}</span><span><strong>{item.label}</strong><small>{item.description}</small></span></button>)}{actionError && <p className="fresh-flow-inline-error" role="alert">{actionError}</p>}</div>}

                {actionError && !advancedTargetId && giftTargetId !== short.id && <p className="fresh-flow-inline-error" role="alert" style={{ position: "absolute", left: 12, bottom: 12, zIndex: 5 }}>{actionError}</p>}
                {giftTargetId === short.id && <div className="fresh-flow-gift-panel" onClick={(e) => e.stopPropagation()}><strong>Gift Fresh Coin to {short.authorName}</strong><div className="fresh-flow-gift-presets">{GIFT_PRESETS.map((preset) => <button key={preset.amountMinor} disabled={giftSending} onClick={() => void gift(short, preset.amountMinor)}>{preset.label} FRESH</button>)}</div>{giftError && <p role="alert">{giftError}</p>}<button className="fresh-flow-gift-cancel" onClick={() => setGiftTargetId(null)}>Cancel</button></div>}
              </div>
            );
          })}
        </div>
      )}

      {openCommentsFor && <CommentPanel targetType="short" targetId={openCommentsFor} onClose={() => setOpenCommentsFor(null)} />}
    </div>
  );
}

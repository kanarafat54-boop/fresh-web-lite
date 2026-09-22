import { useEffect, useRef, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { useFreshId } from "../../fresh-id/context/FreshIdContext";
import { CommentPanel } from "../../comments/components/CommentPanel";
import { ReactionPicker } from "../../reactions/components/ReactionPicker";
import { loadFreshFlowShorts, FRESH_FLOW_SHORTS_PAGE_SIZE, type FreshFlowLoadOptions } from "../core/loadFreshFlowShorts";
import { rankFreshFlow, rankTrending } from "../core/FreshFlowRanking";
import { rankForYou } from "../../shorts/core/ForYouRanking";
import {
  FRESH_SHORTS_PREFETCH_RADIUS,
  getActiveIndex,
  getMediaWindow,
  releaseDistantMedia,
  retryVideo,
  shouldFetchNextPage,
  syncVideoPlayback,
} from "../../shorts/core/FreshShortsRuntime";
import { sendGift, getGiftTotals, type GiftTotal } from "../core/giftService";
import { interactWithShort, removeShortInteraction } from "../../shorts/core/ShortsUniversalInteractionAdapter";
import { getEcosystemProfile, upsertEcosystemProfile, FRESH_FLOW_FEED_MODES } from "../../profile/services/ecosystemProfileService";
import type { UniversalReactionKind } from "../../../core/interactions/FreshReactionModel";
import type { Short } from "../../shorts/types/short";
import { getSocialAuthorIds } from "../core/social";
import "./FreshFlow.css";

type SubTab = "for-you" | "trending" | "following" | "fresh-picks";
type FilterMode = "all" | "social" | "learn" | "relax";
type AdvancedAction = "quote" | "remix" | "duet" | "collaborate";

const SUB_TABS: Array<{ id: SubTab; label: string; icon: string }> = [
  { id: "for-you", label: "For You", icon: "★" },
  { id: "trending", label: "Trending", icon: "↗" },
  { id: "following", label: "Following", icon: "👤" },
  { id: "fresh-picks", label: "Fresh Picks", icon: "✦" },
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

function getConnectionQuality(): ConnectionQuality {
  const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
  if (!connection) return "fast";
  if (connection.saveData) return "slow";
  if (typeof connection.effectiveType === "string" && ["slow-2g", "2g", "3g"].includes(connection.effectiveType)) return "slow";
  return "fast";
}

function captureFrame(shortId: string, video: HTMLVideoElement, cache: Map<string, string>) {
  if (cache.has(shortId)) return;
  try {
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 360;
    canvas.height = video.videoHeight || 640;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    cache.set(shortId, canvas.toDataURL("image/jpeg", 0.6));
  } catch {
    // ignore CORS poster failures
  }
}

type FreshFlowShortsStreamProps = { onImmersiveChange?: (immersive: boolean) => void; onOpenTopic?: (tag: string) => void };

const FRESH_FLOW_POSITION_KEY = "fresh-flow-shorts-position";

function readSavedPosition(): { subTab?: SubTab; filterMode?: FilterMode; currentIndex?: number } {
  try {
    return JSON.parse(sessionStorage.getItem(FRESH_FLOW_POSITION_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function renderCaptionWithTags(caption: string, onTagTap?: (tag: string) => void) {
  return caption.split(/(\s+)/).map((part, i) => {
    if (part.startsWith("#") && part.length > 1 && onTagTap) {
      return (
        <span key={i} className="fresh-flow-hashtag" onClick={(e) => { e.stopPropagation(); onTagTap(part.slice(1)); }}>
          {part}
        </span>
      );
    }
    return part;
  });
}

export default function FreshFlowShortsStream({ onImmersiveChange, onOpenTopic }: FreshFlowShortsStreamProps = {}) {
  const { user, isGuest } = useFreshId();
  const [subTab, setSubTab] = useState<SubTab>(() => readSavedPosition().subTab ?? "for-you");
  const [filterOpen, setFilterOpen] = useState(false);
  const [filterMode, setFilterMode] = useState<FilterMode>(() => readSavedPosition().filterMode ?? "all");
  const restoreIndexRef = useRef<number | null>(readSavedPosition().currentIndex ?? null);
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
  const videoRefs = useRef<Map<number, HTMLVideoElement>>(new Map());
  const retryCountsRef = useRef<Map<number, number>>(new Map());
  const viewedRef = useRef<Set<string>>(new Set());
  const posterCacheRef = useRef<Map<string, string>>(new Map());
  const loadMoreInFlightRef = useRef(false);
  const pageRef = useRef(0);
  const [hasMore, setHasMore] = useState(true);
  const [immersive, setImmersive] = useState(false);
  const immersiveTriggeredRef = useRef(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [connectionQuality, setConnectionQuality] = useState<ConnectionQuality>(() => getConnectionQuality());
  const [muted, setMuted] = useState(true);
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [loadedIndices, setLoadedIndices] = useState<Set<number>>(new Set());

  useEffect(() => {
    const connection = (navigator as any).connection;
    if (!connection || typeof connection.addEventListener !== "function") return;
    const handler = () => setConnectionQuality(getConnectionQuality());
    connection.addEventListener("change", handler);
    return () => connection.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  // Immersive mode is driven by FreshFlowShortsExperience (5s continuous watch).
  // Do not auto-enter on mount so landing matches the reference shell.

  const exitImmersive = () => {
    if (!immersive) return;
    immersiveTriggeredRef.current = false;
    setImmersive(false);
    onImmersiveChange?.(false);
  };

  // Silence noUnusedLocals: Experience owns immersive; keep helpers wired.
  void connectionQuality;
  void exitImmersive;
  void loadedIndices;

  useEffect(() => {
    if (!user || isGuest) return;
    (async () => {
      try {
        const existing = await getEcosystemProfile(user.id, "fresh-flow");
        if (!existing) {
          await upsertEcosystemProfile({ freshId: user.id, ecosystemId: "fresh-flow", title: "Fresh Flow", description: "Personalized · Intelligent · Yours", enabled: true, level: 1, feedModes: FRESH_FLOW_FEED_MODES, metadata: {} });
        }
      } catch {
        // Non-blocking.
      }
    })();
  }, [user, isGuest]);

  const load = async (tab: SubTab, selectedFilter: FilterMode = filterMode) => {
    setLoading(true); setError(null); pageRef.current = 0; setHasMore(true); setCurrentIndex(0); retryCountsRef.current.clear();
    try {
      const options: FreshFlowLoadOptions = selectedFilter === "learn" ? { category: "learn", limit: FRESH_FLOW_SHORTS_PAGE_SIZE, offset: 0 } : selectedFilter === "relax" ? { category: "relax", limit: FRESH_FLOW_SHORTS_PAGE_SIZE, offset: 0 } : { limit: FRESH_FLOW_SHORTS_PAGE_SIZE, offset: 0 };
      const result = await loadFreshFlowShorts(user?.id ?? null, isGuest, options);
      let candidates = result.shorts;
      if (tab === "following") candidates = candidates.filter((s) => s.isFollowingAuthor);
      else if (selectedFilter === "social") {
        if (!user || isGuest) candidates = [];
        else { const socialIds = new Set(await getSocialAuthorIds(user.id)); candidates = candidates.filter((s) => socialIds.has(s.authorId)); }
      }
      const ranked = tab === "trending" ? rankTrending(candidates) : tab === "for-you" ? rankForYou(candidates, viewedRef.current) : rankFreshFlow(candidates);
      setShorts(ranked); setSavedIds(result.savedIds); setGiftTotals(await getGiftTotals(ranked.map((s) => s.id))); setHasMore(result.shorts.length >= FRESH_FLOW_SHORTS_PAGE_SIZE);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load Fresh Flow.");
    } finally { setLoading(false); }
  };

  const loadMore = async () => {
    if (loadMoreInFlightRef.current || !hasMore || !navigator.onLine) return;
    loadMoreInFlightRef.current = true;
    const nextPage = pageRef.current + 1;
    try {
      const options: FreshFlowLoadOptions = { limit: FRESH_FLOW_SHORTS_PAGE_SIZE, offset: nextPage * FRESH_FLOW_SHORTS_PAGE_SIZE };
      if (filterMode === "learn" || filterMode === "relax") options.category = filterMode;
      const result = await loadFreshFlowShorts(user?.id ?? null, isGuest, options);
      let candidates = result.shorts;
      if (subTab === "following") candidates = candidates.filter((s) => s.isFollowingAuthor);
      else if (filterMode === "social") {
        if (!user || isGuest) candidates = [];
        else { const socialIds = new Set(await getSocialAuthorIds(user.id)); candidates = candidates.filter((s) => socialIds.has(s.authorId)); }
      }
      const ranked = subTab === "trending" ? rankTrending(candidates) : subTab === "for-you" ? rankForYou(candidates, viewedRef.current) : rankFreshFlow(candidates);
      setShorts((current) => { const existing = new Set(current.map((s) => s.id)); return [...current, ...ranked.filter((s) => !existing.has(s.id))]; });
      pageRef.current = nextPage; setHasMore(result.shorts.length >= FRESH_FLOW_SHORTS_PAGE_SIZE);
    } catch {
      // Keep current feed usable.
    } finally { loadMoreInFlightRef.current = false; }
  };

  useEffect(() => { void load(subTab, filterMode); }, [subTab, filterMode, user?.id, isGuest]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || shorts.length === 0) return;
    const observer = new IntersectionObserver((entries) => {
      const candidates = entries.map((entry) => ({ index: Number((entry.target as HTMLElement).dataset.index), ratio: entry.intersectionRatio })).filter((candidate) => Number.isFinite(candidate.index));
      const activeIndex = getActiveIndex(candidates);
      if (activeIndex < 0) return;
      setCurrentIndex((previous) => previous === activeIndex ? previous : activeIndex);
    }, { root: container, threshold: [0, 0.6, 1] });
    container.querySelectorAll<HTMLElement>(".fresh-flow-item").forEach((item) => observer.observe(item));
    return () => observer.disconnect();
  }, [shorts.length]);

  useEffect(() => {
    try {
      sessionStorage.setItem(FRESH_FLOW_POSITION_KEY, JSON.stringify({ subTab, filterMode, currentIndex }));
    } catch {
      // ignore
    }
  }, [subTab, filterMode, currentIndex]);

  useEffect(() => {
    if (restoreIndexRef.current === null || shorts.length === 0) return;
    const target = restoreIndexRef.current;
    restoreIndexRef.current = null;
    if (target > 0 && target < shorts.length) {
      requestAnimationFrame(() => {
        containerRef.current?.querySelector(`[data-index="${target}"]`)?.scrollIntoView({ block: "start" });
      });
    }
  }, [shorts.length]);

  const mediaWindow = getMediaWindow(currentIndex, shorts.length);

  useEffect(() => {
    const videos = new Map<number, HTMLVideoElement>();
    videoRefs.current.forEach((video, index) => videos.set(index, video));
    syncVideoPlayback(videos, currentIndex);
    releaseDistantMedia(videos, currentIndex, FRESH_SHORTS_PREFETCH_RADIUS);
    const activeShort = shorts[currentIndex];
    if (activeShort && !viewedRef.current.has(activeShort.id)) {
      viewedRef.current.add(activeShort.id);
      void supabase.rpc("increment_short_views", { short_id_input: activeShort.id });
    }
    if (isOnline && shouldFetchNextPage(currentIndex, shorts.length, hasMore)) void loadMore();
  }, [currentIndex, shorts.length, hasMore, isOnline]);

  const handleVideoError = (index: number) => {
    const video = videoRefs.current.get(index);
    if (!video) return;
    const count = retryCountsRef.current.get(index) ?? 0;
    if (retryVideo(video, count)) retryCountsRef.current.set(index, count + 1);
  };

  const react = async (short: Short, type: string) => {
    if (!user || isGuest) return;
    setActionError(null);
    const previous = short.myReaction;
    try {
      if (previous === type) await removeShortInteraction(user.id, short.id, "react");
      else await interactWithShort(user.id, short.id, "react", { reaction: type as UniversalReactionKind });
      setShorts((current) => current.map((s) => s.id !== short.id ? s : previous === type ? { ...s, myReaction: null, likeCount: Math.max(0, s.likeCount - 1) } : previous === null ? { ...s, myReaction: type, likeCount: s.likeCount + 1 } : { ...s, myReaction: type }));
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
      setShorts((current) => current.map((s) => s.id === short.id ? { ...s, repostedByMe: !wasReposted, repostCount: Math.max(0, s.repostCount + (wasReposted ? -1 : 1)) } : s));
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
      setShorts((current) => current.map((s) => s.authorId === short.authorId ? { ...s, isFollowingAuthor: !wasFollowing } : s));
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : "Unable to follow.");
    }
  };

  const share = async (short: Short) => {
    if (user && !isGuest) {
      try { await interactWithShort(user.id, short.id, "share", { payload: { channel: "native-or-clipboard" } }); } catch { /* ignore */ }
    }
    const shareData = { title: `Fresh Short by ${short.authorName}`, text: short.caption ?? "Fresh Flow", url: short.videoUrl };
    try {
      if (navigator.share) await navigator.share(shareData);
      else await navigator.clipboard.writeText(short.videoUrl);
    } catch { /* cancelled */ }
  };

  const advancedAction = async (short: Short, action: AdvancedAction) => {
    if (!user || isGuest) return;
    setActionSending(true);
    setActionError(null);
    try {
      await interactWithShort(user.id, short.id, action, {
        payload: { sourceShortId: short.id, sourceAuthorId: short.authorId, sourceVideoUrl: short.videoUrl, requestedAt: new Date().toISOString() },
      });
      setAdvancedTargetId(null);
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : `Unable to start ${action}.`);
    } finally {
      setActionSending(false);
    }
  };

  const gift = async (short: Short, amountMinor: string) => {
    if (!user || isGuest || short.authorId === user.id) return;
    setGiftError(null);
    setGiftSending(true);
    try {
      await sendGift(short.id, short.authorId, amountMinor);
      setGiftTotals(await getGiftTotals(shorts.map((s) => s.id)));
      setGiftTargetId(null);
    } catch (cause) {
      setGiftError(cause instanceof Error ? cause.message : "Gift failed.");
    } finally {
      setGiftSending(false);
    }
  };

  const formatCount = (n: number) => n >= 1_000_000 ? (n / 1_000_000).toFixed(1) + "M" : n >= 1_000 ? (n / 1_000).toFixed(1) + "K" : String(n);

  return (
    <div className="fresh-flow-vertical">
      <nav className={`fresh-flow-subtabs${immersive ? " hidden-immersive" : ""}`} aria-label="Fresh Flow Shorts discovery modes">
        {SUB_TABS.map((item) => (
          <button key={item.id} className={subTab === item.id ? "fresh-flow-subtab active" : "fresh-flow-subtab"} onClick={() => { setSubTab(item.id); setFilterOpen(false); }}>
            <span>{item.icon}</span>{item.label}
          </button>
        ))}
        <button className={filterOpen ? "fresh-flow-subtab filter active" : "fresh-flow-subtab filter"} onClick={() => setFilterOpen((open) => !open)} aria-label="Open Fresh Flow filters and models" aria-expanded={filterOpen}>
          ⚙
        </button>
      </nav>
      {filterOpen && (
        <div className="fresh-flow-filter-panel" role="group" aria-label="Fresh Flow filters">
          <span className="fresh-flow-filter-title">Filter</span>
          {FILTERS.map((item) => (
            <button key={item.id} className={filterMode === item.id ? "fresh-flow-filter-chip active" : "fresh-flow-filter-chip"} onClick={() => setFilterMode(item.id)}>
              {item.label}
            </button>
          ))}
        </div>
      )}
      {!isOnline && <div className="fresh-flow-offline-banner">Offline — showing cached Shorts</div>}
      {loading && shorts.length === 0 && <div className="fresh-flow-empty">Loading Fresh Flow…</div>}
      {error && <div className="fresh-flow-empty">{error}</div>}
      {!loading && !error && shorts.length === 0 && <div className="fresh-flow-empty">No Shorts yet. Be the first to post.</div>}
      {shorts.length > 0 && (
        <div className="fresh-flow-stream" ref={containerRef}>
          {shorts.map((short, index) => {
            const inWindow = mediaWindow.has(index);
            const giftTotal = giftTotals.get(short.id);
            return (
              <article key={short.id} className="fresh-flow-item" data-index={index}>
                <span className="fresh-flow-short-badge"><span className="fresh-flow-live-dot" /> FRESH SHORT</span>
                <button type="button" className="fresh-flow-item-more" aria-label="More actions" onClick={() => setAdvancedTargetId(short.id)}>···</button>
                {inWindow ? (
                  <video
                    ref={(el) => { if (el) videoRefs.current.set(index, el); else videoRefs.current.delete(index); }}
                    className="fresh-flow-video"
                    src={short.videoUrl}
                    playsInline
                    muted={muted}
                    loop
                    preload={index === currentIndex ? "auto" : "metadata"}
                    onError={() => handleVideoError(index)}
                    onLoadedData={(e) => {
                      setLoadedIndices((s) => new Set(s).add(index));
                      captureFrame(short.id, e.currentTarget, posterCacheRef.current);
                    }}
                    poster={posterCacheRef.current.get(short.id)}
                  />
                ) : (
                  <div className="fresh-flow-video-skeleton" />
                )}
                <div className="fresh-flow-overlay">
                  {short.caption && <p className="fresh-flow-caption">{renderCaptionWithTags(short.caption, onOpenTopic)}</p>}
                  <div className="fresh-flow-author-row">
                    <span className="fresh-flow-author-avatar" aria-hidden="true">{(short.authorName || "?").slice(0, 1).toUpperCase()}</span>
                    <span className="fresh-flow-author">@{short.authorUsername || short.authorName?.replace(/\s+/g, "").toLowerCase() || "creator"}</span>
                    {!isGuest && user && short.authorId !== user.id && (
                      <button className={short.isFollowingAuthor ? "fresh-flow-chip following" : "fresh-flow-chip"} onClick={() => void toggleFollow(short)}>
                        {short.isFollowingAuthor ? "Following" : "Follow"}
                      </button>
                    )}
                  </div>
                  {(() => {
                    const tags = (short.caption || "").match(/#[\w]+/g)?.slice(0, 3) ?? [];
                    if (tags.length === 0) return null;
                    return (
                      <div className="fresh-flow-topic-chips">
                        {tags.map((tag) => (
                          <button key={tag} type="button" className="fresh-flow-topic-chip" onClick={(e) => { e.stopPropagation(); onOpenTopic?.(tag.slice(1)); }}>
                            {tag.slice(1)}
                          </button>
                        ))}
                      </div>
                    );
                  })()}
                  <p className="fresh-flow-sound-line">
                    <span aria-hidden="true">♪</span>
                    {short.soundName || `Original sound – ${short.authorUsername || short.authorName || "Fresh"}`}
                  </p>
                </div>
                <div className="fresh-flow-actions">
                  <ReactionPicker
                    myReaction={short.myReaction}
                    count={short.likeCount}
                    variant="short"
                    onReact={(kind) => void react(short, kind)}
                  />
                  <button className="fresh-flow-action-btn" onClick={() => setOpenCommentsFor(short.id)} aria-label="Comments">💬<span>{formatCount(short.commentCount)}</span></button>
                  <button className={short.repostedByMe ? "fresh-flow-action-btn reposted" : "fresh-flow-action-btn"} onClick={() => void toggleRepost(short)} aria-label="Repost">🔁<span>{formatCount(short.repostCount)}</span></button>
                  <button className={savedIds.has(short.id) ? "fresh-flow-action-btn saved" : "fresh-flow-action-btn"} onClick={() => void toggleSave(short)} aria-label="Save">🔖</button>
                  <button className="fresh-flow-action-btn" onClick={() => void share(short)} aria-label="Share">↗</button>
                  <button className="fresh-flow-action-btn gift" onClick={() => setGiftTargetId(short.id)} aria-label="Gift">🎁{giftTotal ? <span>{giftTotal.count}</span> : null}</button>
                  <button className="fresh-flow-action-btn" onClick={() => setMuted((m) => !m)} aria-label={muted ? "Unmute" : "Mute"}>{muted ? "🔇" : "🔊"}</button>
                </div>
                {giftTargetId === short.id && (
                  <div className="fresh-flow-gift-panel">
                    <strong>Send a gift</strong>
                    <div className="fresh-flow-gift-presets">
                      {GIFT_PRESETS.map((g) => (
                        <button key={g.amountMinor} disabled={giftSending} onClick={() => void gift(short, g.amountMinor)}>{g.label}</button>
                      ))}
                    </div>
                    {giftError && <p className="fresh-flow-inline-error">{giftError}</p>}
                    <button className="fresh-flow-gift-cancel" onClick={() => setGiftTargetId(null)}>Cancel</button>
                  </div>
                )}
                {advancedTargetId === short.id && (
                  <div className="fresh-flow-advanced-panel">
                    <div className="fresh-flow-advanced-header">
                      <strong>Create from this Short</strong>
                      <button type="button" onClick={() => setAdvancedTargetId(null)} aria-label="Close">×</button>
                    </div>
                    {ADVANCED_ACTIONS.map((action) => (
                      <button key={action.id} className="fresh-flow-advanced-action" disabled={actionSending} onClick={() => void advancedAction(short, action.id)}>
                        <span className="fresh-flow-advanced-icon">{action.icon}</span>
                        <span><strong>{action.label}</strong><small>{action.description}</small></span>
                      </button>
                    ))}
                    {actionError && <p className="fresh-flow-inline-error">{actionError}</p>}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
      {shorts.length > 0 && (
        <section className="fresh-flow-picks" aria-label="Fresh Picks for You">
          <div className="fresh-flow-picks-header">
            <h2>✦ Fresh Picks for You</h2>
            <button type="button" className="fresh-flow-picks-see-all" onClick={() => setSubTab("fresh-picks")}>See all</button>
          </div>
          <div className="fresh-flow-picks-rail">
            {["AI Live", "Travel", "Podcast", "VR", "Hub"].map((label, i) => (
              <div key={label} className={`fresh-flow-pick-card tone-${["ai", "travel", "pod", "vr", "hub"][i]}`}>
                {i === 0 && <span className="fresh-flow-pick-live">LIVE</span>}
                <strong>{label}</strong>
                <small>Discover</small>
              </div>
            ))}
          </div>
        </section>
      )}
      {openCommentsFor && <CommentPanel targetType="short" targetId={openCommentsFor} onClose={() => setOpenCommentsFor(null)} />}
    </div>
  );
}

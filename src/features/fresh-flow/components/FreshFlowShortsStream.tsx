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
import { useFreshFlowFeedRefresh } from "../core/useFreshFlowFeedRefresh";
import "./FreshFlow.css";

type SubTab = "for-you" | "trending" | "following" | "fresh-picks";
type FilterMode = "all" | "social" | "learn" | "relax";
type AdvancedAction = "quote" | "remix" | "duet" | "collaborate" | "edit" | "captions" | "effects";

type FreshFlowShortsStreamProps = {
  onImmersiveChange?: (immersive: boolean) => void;
  onOpenTopic?: (topic: string) => void;
  immersive?: boolean;
  onOpenCreate?: (intent?: { action?: string; sourceShortId?: string; sourceVideoUrl?: string }) => void;
};

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
  { id: "remix", label: "Remix", icon: "✦", description: "Open Creator Studio to remix this Short." },
  { id: "duet", label: "Duet", icon: "◫", description: "Open Creator Studio for a side-by-side duet." },
  { id: "collaborate", label: "Collaborate", icon: "♧", description: "Invite this creator into a collaboration." },
  { id: "edit", label: "Edit tools", icon: "✂", description: "Rotate, speed, text overlay and True Mode editor tools." },
  { id: "captions", label: "Captions", icon: "CC", description: "Generate or edit captions for this Short." },
  { id: "effects", label: "Effects", icon: "✧", description: "Apply effects and filters in Creator Studio." },
];

const FRESH_FLOW_POSITION_KEY = "fresh-flow-position";

function readSavedPosition(): { subTab?: SubTab; filterMode?: FilterMode; currentIndex?: number } {
  try {
    const raw = sessionStorage.getItem(FRESH_FLOW_POSITION_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export default function FreshFlowShortsStream({
  onImmersiveChange,
  onOpenTopic,
  immersive: immersiveProp,
  onOpenCreate,
}: FreshFlowShortsStreamProps = {}) {
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
  const [hasMore, setHasMore] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [openCommentsFor, setOpenCommentsFor] = useState<string | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const pageRef = useRef(0);
  const loadMoreInFlightRef = useRef(false);
  const viewedRef = useRef<Set<string>>(new Set());

  const load = async (tab: SubTab, mode: FilterMode) => {
    setLoading(true);
    setError(null);
    pageRef.current = 0;
    try {
      const options: FreshFlowLoadOptions = { limit: FRESH_FLOW_SHORTS_PAGE_SIZE, offset: 0 };
      if (mode === "learn" || mode === "relax") options.category = mode;
      const result = await loadFreshFlowShorts(user?.id ?? null, isGuest, options);
      let candidates = result.shorts;
      if (tab === "following") candidates = candidates.filter((s) => s.isFollowingAuthor);
      else if (mode === "social") {
        if (!user || isGuest) candidates = [];
        else {
          const socialIds = new Set(await getSocialAuthorIds(user.id));
          candidates = candidates.filter((s) => socialIds.has(s.authorId));
        }
      }
      const ranked =
        tab === "trending"
          ? rankTrending(candidates)
          : tab === "for-you"
            ? rankForYou(candidates, viewedRef.current)
            : rankFreshFlow(candidates);
      setShorts(ranked);
      setSavedIds(result.savedIds);
      setHasMore(result.shorts.length >= FRESH_FLOW_SHORTS_PAGE_SIZE);
      if (user && !isGuest) {
        try {
          setGiftTotals(await getGiftTotals(ranked.map((s) => s.id)));
        } catch {
          /* ignore */
        }
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load Fresh Flow.");
    } finally {
      setLoading(false);
    }
  };

  const loadMore = async () => {
    if (loadMoreInFlightRef.current || !hasMore || !navigator.onLine) return;
    loadMoreInFlightRef.current = true;
    const nextPage = pageRef.current + 1;
    try {
      const options: FreshFlowLoadOptions = {
        limit: FRESH_FLOW_SHORTS_PAGE_SIZE,
        offset: nextPage * FRESH_FLOW_SHORTS_PAGE_SIZE,
      };
      if (filterMode === "learn" || filterMode === "relax") options.category = filterMode;
      const result = await loadFreshFlowShorts(user?.id ?? null, isGuest, options);
      let candidates = result.shorts;
      if (subTab === "following") candidates = candidates.filter((s) => s.isFollowingAuthor);
      else if (filterMode === "social") {
        if (!user || isGuest) candidates = [];
        else {
          const socialIds = new Set(await getSocialAuthorIds(user.id));
          candidates = candidates.filter((s) => socialIds.has(s.authorId));
        }
      }
      const ranked =
        subTab === "trending"
          ? rankTrending(candidates)
          : subTab === "for-you"
            ? rankForYou(candidates, viewedRef.current)
            : rankFreshFlow(candidates);
      setShorts((current) => {
        const existing = new Set(current.map((s) => s.id));
        return [...current, ...ranked.filter((s) => !existing.has(s.id))];
      });
      pageRef.current = nextPage;
      setHasMore(result.shorts.length >= FRESH_FLOW_SHORTS_PAGE_SIZE);
    } catch {
      /* keep current feed */
    } finally {
      loadMoreInFlightRef.current = false;
    }
  };

  useEffect(() => {
    void load(subTab, filterMode);
  }, [subTab, filterMode, user?.id, isGuest]);

  useFreshFlowFeedRefresh(() => {
    void load(subTab, filterMode);
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container || shorts.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const candidates = entries
          .map((entry) => ({
            index: Number((entry.target as HTMLElement).dataset.index),
            ratio: entry.intersectionRatio,
          }))
          .filter((candidate) => Number.isFinite(candidate.index));
        const activeIndex = getActiveIndex(candidates);
        if (activeIndex < 0) return;
        setCurrentIndex((previous) => (previous === activeIndex ? previous : activeIndex));
        if (shorts[activeIndex]) viewedRef.current.add(shorts[activeIndex].id);
      },
      { root: container, threshold: [0, 0.6, 1] },
    );
    container.querySelectorAll<HTMLElement>(".fresh-flow-item").forEach((item) => observer.observe(item));
    return () => observer.disconnect();
  }, [shorts.length]);

  useEffect(() => {
    try {
      sessionStorage.setItem(FRESH_FLOW_POSITION_KEY, JSON.stringify({ subTab, filterMode, currentIndex }));
    } catch {
      /* ignore */
    }
  }, [subTab, filterMode, currentIndex]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const onScroll = () => {
      if (shouldFetchNextPage(container, currentIndex, shorts.length) && hasMore) {
        void loadMore();
      }
    };
    container.addEventListener("scroll", onScroll, { passive: true });
    return () => container.removeEventListener("scroll", onScroll);
  }, [currentIndex, shorts.length, hasMore, subTab, filterMode]);

  useEffect(() => {
    const videos = containerRef.current?.querySelectorAll<HTMLVideoElement>("video[data-short-id]") ?? [];
    syncVideoPlayback(videos, currentIndex, FRESH_SHORTS_PREFETCH_RADIUS);
    releaseDistantMedia(videos, currentIndex, FRESH_SHORTS_PREFETCH_RADIUS + 2);
  }, [currentIndex, shorts]);

  useEffect(() => {
    if (restoreIndexRef.current != null && shorts.length > restoreIndexRef.current) {
      const idx = restoreIndexRef.current;
      restoreIndexRef.current = null;
      setCurrentIndex(idx);
      const el = containerRef.current?.querySelector(`[data-index="${idx}"]`);
      el?.scrollIntoView({ block: "nearest" });
    }
  }, [shorts.length]);

  async function handleReaction(shortId: string, kind: UniversalReactionKind) {
    if (!user || isGuest) return;
    try {
      await interactWithShort(shortId, kind, user.id);
      setShorts((prev) =>
        prev.map((s) =>
          s.id === shortId
            ? {
                ...s,
                myReaction: kind,
                reactionBreakdown: {
                  ...s.reactionBreakdown,
                  [kind]: (s.reactionBreakdown[kind] ?? 0) + 1,
                },
              }
            : s,
        ),
      );
    } catch {
      /* ignore */
    }
  }

  async function handleGift(short: Short, amountMinor: number) {
    if (!user || isGuest || short.authorId === user.id) return;
    try {
      await sendGift(short.id, short.authorId, amountMinor);
      const totals = await getGiftTotals([short.id]);
      setGiftTotals((prev) => {
        const next = new Map(prev);
        const t = totals.get(short.id);
        if (t) next.set(short.id, t);
        return next;
      });
    } catch {
      /* ignore */
    }
  }

  function openAdvanced(action: AdvancedAction, short: Short) {
    setAdvancedOpen(false);
    const intent = {
      action,
      sourceShortId: short.id,
      sourceAuthorId: short.authorId,
      sourceVideoUrl: short.videoUrl,
      sourceCaption: short.caption,
      requestedAt: new Date().toISOString(),
    };
    try {
      sessionStorage.setItem("fresh-flow-create-intent", JSON.stringify(intent));
    } catch {
      /* ignore */
    }
    onOpenCreate?.({ action, sourceShortId: short.id, sourceVideoUrl: short.videoUrl });
    window.dispatchEvent(new CustomEvent("fresh-open-creator", { detail: intent }));
  }

  if (loading && shorts.length === 0) {
    return (
      <div className="fresh-flow-stream fresh-flow-loading">
        <p>Loading Fresh Flow…</p>
      </div>
    );
  }

  if (error && shorts.length === 0) {
    return (
      <div className="fresh-flow-stream fresh-flow-error">
        <p>{error}</p>
        <button type="button" onClick={() => void load(subTab, filterMode)}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="fresh-flow-stream">
      <header className="fresh-flow-tabs" role="tablist" aria-label="Fresh Flow modes">
        {SUB_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={subTab === tab.id}
            className={subTab === tab.id ? "active" : ""}
            onClick={() => setSubTab(tab.id)}
          >
            <span aria-hidden>{tab.icon}</span> {tab.label}
          </button>
        ))}
        <button type="button" className="fresh-flow-filter-toggle" onClick={() => setFilterOpen((v) => !v)} aria-expanded={filterOpen}>
          Filter
        </button>
      </header>

      {filterOpen && (
        <div className="fresh-flow-filters" role="group" aria-label="Content filters">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              className={filterMode === f.id ? "active" : ""}
              onClick={() => setFilterMode(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      <div className="fresh-flow-viewport" ref={containerRef}>
        {shorts.length === 0 ? (
          <div className="fresh-flow-empty">
            <p>No Shorts yet. Be the first to publish from Creator Studio.</p>
          </div>
        ) : (
          shorts.map((short, index) => (
            <article
              key={short.id}
              className="fresh-flow-item"
              data-index={index}
              data-short-id={short.id}
            >
              <video
                data-short-id={short.id}
                src={short.videoUrl}
                playsInline
                muted={index !== currentIndex}
                loop
                preload={Math.abs(index - currentIndex) <= FRESH_SHORTS_PREFETCH_RADIUS ? "auto" : "none"}
                onError={(e) => retryVideo(e.currentTarget)}
              />
              <div className="fresh-flow-overlay">
                <div className="fresh-flow-meta">
                  <strong>@{short.authorUsername}</strong>
                  <p>{short.caption}</p>
                </div>
                <div className="fresh-flow-actions">
                  <ReactionPicker
                    onSelect={(kind) => void handleReaction(short.id, kind)}
                    counts={short.reactionBreakdown}
                  />
                  <button type="button" onClick={() => setOpenCommentsFor(short.id)} aria-label="Comments">
                    💬 {short.commentCount}
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleGift(short, 100)}
                    aria-label="Send gift"
                  >
                    🎁 {giftTotals.get(short.id)?.total ?? 0}
                  </button>
                  <button type="button" onClick={() => setAdvancedOpen((v) => !v)} aria-label="More">
                    ⋯
                  </button>
                </div>
                {advancedOpen && index === currentIndex && (
                  <div className="fresh-flow-advanced">
                    {ADVANCED_ACTIONS.map((a) => (
                      <button key={a.id} type="button" onClick={() => openAdvanced(a.id, short)} title={a.description}>
                        <span>{a.icon}</span> {a.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </article>
          ))
        )}
      </div>

      {subTab === "fresh-picks" && (
        <section className="fresh-flow-picks" aria-label="Fresh Picks for You">
          <div className="fresh-flow-picks-header">
            <h2>✦ Fresh Picks for You</h2>
            <button type="button" className="fresh-flow-picks-see-all" onClick={() => setSubTab("fresh-picks")}>
              See all
            </button>
          </div>
          <div className="fresh-flow-picks-rail">
            {["AI Live", "Travel", "Podcast", "VR", "Hub"].map((label, i) => (
              <button
                key={label}
                type="button"
                className={`fresh-flow-pick-card tone-${["ai", "travel", "pod", "vr", "hub"][i]}`}
                onClick={() => onOpenTopic?.(label)}
                aria-label={`Discover ${label} in Fresh Flow`}
              >
                {i === 0 && <span className="fresh-flow-pick-live">LIVE</span>}
                <strong>{label}</strong>
                <small>Discover</small>
              </button>
            ))}
          </div>
        </section>
      )}
      {openCommentsFor && (
        <CommentPanel targetType="short" targetId={openCommentsFor} onClose={() => setOpenCommentsFor(null)} />
      )}
    </div>
  );
}

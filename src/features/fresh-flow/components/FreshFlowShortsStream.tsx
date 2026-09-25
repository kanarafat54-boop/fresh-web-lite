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

export default function FreshFlowShortsStream({
  onOpenTopic,
}: {
  onOpenTopic?: (topic: string) => void;
}) {
  const { user, isGuest } = useFreshId();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [shorts, setShorts] = useState<Short[]>([]);
  const [subTab, setSubTab] = useState<SubTab>("for-you");
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [openCommentsFor, setOpenCommentsFor] = useState<string | null>(null);
  const [giftTotals, setGiftTotals] = useState<Record<string, GiftTotal>>({});
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const loadMoreInFlightRef = useRef(false);
  const cursorRef = useRef<string | null>(null);

  async function load(tab: SubTab, filter: FilterMode, append = false) {
    if (!append) {
      setLoading(true);
      cursorRef.current = null;
    }
    try {
      const options: FreshFlowLoadOptions = {
        limit: FRESH_FLOW_SHORTS_PAGE_SIZE,
        cursor: append ? cursorRef.current : null,
        followingOnly: tab === "following",
        category: filter === "all" ? null : filter,
      };
      if (user?.id && !isGuest) {
        options.viewerId = user.id;
      }
      const result = await loadFreshFlowShorts(options);
      let ranked = result.shorts;
      if (tab === "for-you") {
        ranked = rankForYou(ranked, user?.id);
      } else if (tab === "trending") {
        ranked = rankTrending(ranked);
      } else if (tab === "fresh-picks") {
        ranked = rankFreshFlow(ranked);
      }
      if (append) {
        setShorts((prev) => {
          const seen = new Set(prev.map((s) => s.id));
          return [...prev, ...ranked.filter((s) => !seen.has(s.id))];
        });
      } else {
        setShorts(ranked);
        setCurrentIndex(0);
      }
      cursorRef.current = result.nextCursor;
      setHasMore(result.shorts.length >= FRESH_FLOW_SHORTS_PAGE_SIZE);
    } catch {
      /* keep current feed */
    } finally {
      setLoading(false);
      loadMoreInFlightRef.current = false;
    }
  }

  async function loadMore() {
    if (loadMoreInFlightRef.current || !hasMore) return;
    loadMoreInFlightRef.current = true;
    try {
      const options: FreshFlowLoadOptions = {
        limit: FRESH_FLOW_SHORTS_PAGE_SIZE,
        cursor: cursorRef.current,
        followingOnly: subTab === "following",
        category: filterMode === "all" ? null : filterMode,
      };
      if (user?.id && !isGuest) options.viewerId = user.id;
      const result = await loadFreshFlowShorts(options);
      let ranked = result.shorts;
      if (subTab === "for-you") ranked = rankForYou(ranked, user?.id);
      else if (subTab === "trending") ranked = rankTrending(ranked);
      else if (subTab === "fresh-picks") ranked = rankFreshFlow(ranked);
      setShorts((prev) => {
        const seen = new Set(prev.map((s) => s.id));
        return [...prev, ...ranked.filter((s) => !seen.has(s.id))];
      });
      cursorRef.current = result.nextCursor;
      setHasMore(result.shorts.length >= FRESH_FLOW_SHORTS_PAGE_SIZE);
    } catch {
      /* keep current feed */
    } finally {
      loadMoreInFlightRef.current = false;
    }
  }

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
    if (!shorts[currentIndex]?.id) return;
    void getGiftTotals(shorts[currentIndex].id).then((totals) => {
      setGiftTotals((prev) => ({ ...prev, [shorts[currentIndex].id]: totals }));
    });
  }, [currentIndex, shorts]);

  async function handleReaction(shortId: string, kind: UniversalReactionKind) {
    if (!user || isGuest) return;
    try {
      await interactWithShort(shortId, kind, user.id);
      setShorts((prev) =>
        prev.map((s) =>
          s.id === shortId
            ? {
                ...s,
                reaction_counts: {
                  ...(s.reaction_counts ?? {}),
                  [kind]: ((s.reaction_counts as Record<string, number> | undefined)?.[kind] ?? 0) + 1,
                },
              }
            : s,
        ),
      );
    } catch {
      /* ignore */
    }
  }

  async function handleGift(shortId: string, amount: number) {
    if (!user || isGuest) return;
    try {
      await sendGift(shortId, user.id, amount);
      const totals = await getGiftTotals(shortId);
      setGiftTotals((prev) => ({ ...prev, [shortId]: totals }));
    } catch {
      /* ignore */
    }
  }

  function openAdvanced(action: AdvancedAction, short: Short) {
    setAdvancedOpen(false);
    const intent = {
      action,
      sourceShortId: short.id,
      sourceAuthorId: short.author_id,
      sourceVideoUrl: short.video_url,
      sourceCaption: short.caption,
      requestedAt: new Date().toISOString(),
    };
    try {
      sessionStorage.setItem("fresh-flow-create-intent", JSON.stringify(intent));
    } catch {
      /* ignore */
    }
    window.dispatchEvent(new CustomEvent("fresh-open-creator", { detail: intent }));
  }

  if (loading && shorts.length === 0) {
    return (
      <div className="fresh-flow-stream fresh-flow-loading">
        <p>Loading Fresh Flow…</p>
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
      </header>

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
                src={short.video_url}
                playsInline
                muted={index !== currentIndex}
                loop
                preload={Math.abs(index - currentIndex) <= FRESH_SHORTS_PREFETCH_RADIUS ? "auto" : "none"}
                onError={(e) => retryVideo(e.currentTarget)}
              />
              <div className="fresh-flow-overlay">
                <div className="fresh-flow-meta">
                  <strong>@{short.author_handle ?? short.author_id?.slice(0, 8)}</strong>
                  <p>{short.caption}</p>
                </div>
                <div className="fresh-flow-actions">
                  <ReactionPicker
                    onSelect={(kind) => void handleReaction(short.id, kind)}
                    counts={short.reaction_counts as Record<string, number> | undefined}
                  />
                  <button type="button" onClick={() => setOpenCommentsFor(short.id)} aria-label="Comments">
                    💬
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleGift(short.id, 1)}
                    aria-label="Send gift"
                  >
                    🎁 {giftTotals[short.id]?.total ?? 0}
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

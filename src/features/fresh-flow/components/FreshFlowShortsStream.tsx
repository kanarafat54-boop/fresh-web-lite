import { useEffect, useRef, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { useFreshId } from "../../fresh-id/context/FreshIdContext";
import { CommentPanel } from "../../comments/components/CommentPanel";
import { ReactionPicker } from "../../reactions/components/ReactionPicker";
import { loadFreshFlowShorts } from "../core/loadFreshFlowShorts";
import { rankFreshFlow } from "../core/FreshFlowRanking";
import { rankForYou } from "../../shorts/core/ForYouRanking";
import { sendGift, getGiftTotals, type GiftTotal } from "../core/giftService";
import { interactWithShort, removeShortInteraction } from "../../shorts/core/ShortsUniversalInteractionAdapter";
import type { UniversalReactionKind } from "../../../core/interactions/FreshReactionModel";
import type { Short } from "../../shorts/types/short";
import "./FreshFlow.css";

type SubTab = "for-you" | "social" | "trending" | "fresh-picks" | "learn" | "relax";

type FilterMode = "all" | "following" | "learn" | "relax";

const SUB_TABS: Array<{ id: SubTab; label: string; icon: string }> = [
  { id: "for-you", label: "For You", icon: "☆" },
  { id: "social", label: "Social", icon: "♧" },
  { id: "trending", label: "Trending", icon: "↗" },
  { id: "fresh-picks", label: "Fresh Picks", icon: "◇" },
  { id: "learn", label: "Learn", icon: "◎" },
  { id: "relax", label: "Relax", icon: "◌" },
];

const FILTERS: Array<{ id: FilterMode; label: string }> = [
  { id: "all", label: "All" },
  { id: "following", label: "Following" },
  { id: "learn", label: "Learn" },
  { id: "relax", label: "Relax" },
];

const GIFT_PRESETS: Array<{ label: string; amountMinor: string }> = [
  { label: "1", amountMinor: "100" },
  { label: "5", amountMinor: "500" },
  { label: "10", amountMinor: "1000" },
  { label: "50", amountMinor: "5000" },
];

export default function FreshFlowShortsStream() {
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
  const [giftError, setGiftError] = useState<string | null>(null);
  const [giftSending, setGiftSending] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  const viewedRef = useRef<Set<string>>(new Set());

  const load = async (tab: SubTab, selectedFilter: FilterMode = filterMode) => {
    setLoading(true);
    setError(null);
    try {
      const options = tab === "learn" || selectedFilter === "learn"
        ? { category: "learn" }
        : tab === "relax" || selectedFilter === "relax"
          ? { category: "relax" }
          : {};

      const result = await loadFreshFlowShorts(user?.id ?? null, isGuest, options);
      let candidates = result.shorts;

      if (tab === "social" || selectedFilter === "following") {
        candidates = candidates.filter((s) => s.isFollowingAuthor);
      }

      let ranked: Short[];
      if (tab === "trending") {
        ranked = rankForYou(candidates, new Set());
      } else {
        ranked = rankFreshFlow(candidates);
      }

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
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const video = entry.target as HTMLVideoElement;
          const shortId = video.dataset.shortId!;
          if (entry.isIntersecting && entry.intersectionRatio > 0.6) {
            video.play().catch(() => {});
            if (!viewedRef.current.has(shortId)) {
              viewedRef.current.add(shortId);
              void supabase.rpc("increment_short_views", { short_id_input: shortId });
            }
          } else {
            video.pause();
          }
        });
      },
      { root: container, threshold: [0, 0.6, 1] },
    );
    videoRefs.current.forEach((video) => observer.observe(video));
    return () => observer.disconnect();
  }, [shorts]);

  const react = async (short: Short, type: string) => {
    if (!user || isGuest) return;
    if (short.myReaction === type) await removeShortInteraction(user.id, short.id, "react");
    else await interactWithShort(user.id, short.id, "react", { reaction: type as UniversalReactionKind });
    await load(subTab, filterMode);
  };

  const toggleSave = async (short: Short) => {
    if (!user || isGuest) return;
    if (savedIds.has(short.id)) await removeShortInteraction(user.id, short.id, "save");
    else await interactWithShort(user.id, short.id, "save");
    await load(subTab, filterMode);
  };

  const toggleRepost = async (short: Short) => {
    if (!user || isGuest) return;
    if (short.repostedByMe) await removeShortInteraction(user.id, short.id, "repost");
    else await interactWithShort(user.id, short.id, "repost");
    await load(subTab, filterMode);
  };

  const toggleFollow = async (short: Short) => {
    if (!user || isGuest || short.authorId === user.id) return;
    if (short.isFollowingAuthor) {
      await supabase.from("follows").delete().eq("follower_id", user.id).eq("followed_id", short.authorId);
    } else {
      await supabase.from("follows").insert({ follower_id: user.id, followed_id: short.authorId });
    }
    await load(subTab, filterMode);
  };

  const share = async (short: Short) => {
    const shareData = { title: `Fresh Short by ${short.authorName}`, text: short.caption ?? "Fresh Flow", url: short.videoUrl };
    try {
      if (navigator.share) await navigator.share(shareData);
      else await navigator.clipboard.writeText(short.videoUrl);
    } catch {
      // User cancelled the native share sheet; nothing to persist.
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
      <nav className="fresh-flow-subtabs" aria-label="Fresh Flow Shorts discovery modes">
        {SUB_TABS.map((item) => (
          <button
            key={item.id}
            className={subTab === item.id ? "fresh-flow-subtab active" : "fresh-flow-subtab"}
            onClick={() => { setSubTab(item.id); setFilterOpen(false); }}
            aria-pressed={subTab === item.id}
          >
            <span aria-hidden="true">{item.icon}</span>{item.label}
          </button>
        ))}
        <button
          className={filterOpen ? "fresh-flow-subtab filter active" : "fresh-flow-subtab filter"}
          onClick={() => setFilterOpen((open) => !open)}
          aria-label="Open Fresh Flow filters and models"
          aria-expanded={filterOpen}
        >
          ⚙ Filters / Models
        </button>
      </nav>

      {filterOpen && (
        <div className="fresh-flow-filter-panel" aria-label="Fresh Flow filters and models">
          <span className="fresh-flow-filter-title">Refine this Short Flow</span>
          {FILTERS.map((item) => (
            <button
              key={item.id}
              className={filterMode === item.id ? "fresh-flow-filter-chip active" : "fresh-flow-filter-chip"}
              onClick={() => { setFilterMode(item.id); setFilterOpen(false); }}
              aria-pressed={filterMode === item.id}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <p className="fresh-flow-empty">Loading Fresh Flow…</p>
      ) : error ? (
        <p className="fresh-flow-empty" role="alert">{error}</p>
      ) : shorts.length === 0 ? (
        <p className="fresh-flow-empty">Nothing here yet.</p>
      ) : (
        <div className="fresh-flow-stream" ref={containerRef}>
          {shorts.map((short) => {
            const totals = giftTotals.get(short.id);
            return (
              <div key={short.id} className="fresh-flow-item">
                <video
                  ref={(el) => { if (el) videoRefs.current.set(short.id, el); else videoRefs.current.delete(short.id); }}
                  data-short-id={short.id}
                  src={short.videoUrl}
                  loop
                  playsInline
                  className="fresh-flow-video"
                />

                <div className="fresh-flow-overlay">
                  <div className="fresh-flow-author-row">
                    <span className="fresh-flow-author">{short.authorName}</span>
                    {!isGuest && user && short.authorId !== user.id && (
                      <button className={short.isFollowingAuthor ? "fresh-flow-chip following" : "fresh-flow-chip"} onClick={() => void toggleFollow(short)}>
                        {short.isFollowingAuthor ? "Following" : "Follow"}
                      </button>
                    )}
                  </div>
                  {short.caption && <p className="fresh-flow-caption">{short.caption}</p>}
                </div>

                <div className="fresh-flow-actions">
                  <ReactionPicker myReaction={short.myReaction} count={short.likeCount} disabled={isGuest} variant="short" onReact={(type) => void react(short, type)} />
                  <button className="fresh-flow-action-btn" onClick={() => setOpenCommentsFor(short.id)} aria-label="Comments"><span>💬</span><span>{formatCount(short.commentCount)}</span></button>
                  <button className={short.repostedByMe ? "fresh-flow-action-btn reposted" : "fresh-flow-action-btn"} onClick={() => void toggleRepost(short)} disabled={isGuest} aria-label="Repost"><span>↻</span><span>{formatCount(short.repostCount)}</span></button>
                  <button className="fresh-flow-action-btn" onClick={() => void share(short)} aria-label="Share"><span>↗</span><span>Share</span></button>
                  <button className={savedIds.has(short.id) ? "fresh-flow-action-btn saved" : "fresh-flow-action-btn"} onClick={() => void toggleSave(short)} disabled={isGuest} aria-label="Save"><span>🔖</span><span>{savedIds.has(short.id) ? "Saved" : "Save"}</span></button>
                  {!isGuest && user && short.authorId !== user.id && (
                    <button className="fresh-flow-action-btn gift" onClick={() => { setGiftTargetId(short.id); setGiftError(null); }} aria-label="Send gift"><span>🎁</span><span>{totals ? formatCount(totals.count) : 0}</span></button>
                  )}
                </div>

                {giftTargetId === short.id && (
                  <div className="fresh-flow-gift-panel" onClick={(e) => e.stopPropagation()}>
                    <strong>Gift Fresh Coin to {short.authorName}</strong>
                    <div className="fresh-flow-gift-presets">
                      {GIFT_PRESETS.map((preset) => <button key={preset.amountMinor} disabled={giftSending} onClick={() => void gift(short, preset.amountMinor)}>{preset.label} FRESH</button>)}
                    </div>
                    {giftError && <p role="alert">{giftError}</p>}
                    <button className="fresh-flow-gift-cancel" onClick={() => setGiftTargetId(null)}>Cancel</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {openCommentsFor && <CommentPanel targetType="short" targetId={openCommentsFor} onClose={() => setOpenCommentsFor(null)} />}
    </div>
  );
}

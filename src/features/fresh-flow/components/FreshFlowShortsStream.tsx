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

type SubTab = "for-you" | "trending" | "following" | "learn" | "relax" | "fresh-picks";

const SUB_TABS: Array<{ id: SubTab; label: string }> = [
  { id: "for-you", label: "For You" },
  { id: "trending", label: "Trending" },
  { id: "following", label: "Following" },
  { id: "learn", label: "Learn" },
  { id: "relax", label: "Relax" },
  { id: "fresh-picks", label: "Fresh Picks" },
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

  const load = async (tab: SubTab) => {
    if (tab === "fresh-picks") {
      setShorts([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      let result;
      if (tab === "learn") result = await loadFreshFlowShorts(user?.id ?? null, isGuest, { category: "learn" });
      else if (tab === "relax") result = await loadFreshFlowShorts(user?.id ?? null, isGuest, { category: "relax" });
      else result = await loadFreshFlowShorts(user?.id ?? null, isGuest, {});

      let ranked: Short[];
      if (tab === "trending") {
        ranked = rankForYou(result.shorts, new Set());
      } else if (tab === "following") {
        ranked = rankFreshFlow(result.shorts.filter((s) => s.isFollowingAuthor));
      } else {
        ranked = rankFreshFlow(result.shorts);
      }

      setShorts(ranked);
      setSavedIds(result.savedIds);

      const totals = await getGiftTotals(ranked.map((s) => s.id));
      setGiftTotals(totals);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load Fresh Flow.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(subTab);
  }, [subTab, user?.id, isGuest]);

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
    if (short.myReaction === type) {
      await removeShortInteraction(user.id, short.id, "react");
    } else {
      await interactWithShort(user.id, short.id, "react", { reaction: type as UniversalReactionKind });
    }
    await load(subTab);
  };

  const toggleSave = async (short: Short) => {
    if (!user || isGuest) return;
    if (savedIds.has(short.id)) {
      await removeShortInteraction(user.id, short.id, "save");
    } else {
      await interactWithShort(user.id, short.id, "save");
    }
    await load(subTab);
  };

  const toggleRepost = async (short: Short) => {
    if (!user || isGuest) return;
    if (short.repostedByMe) {
      await removeShortInteraction(user.id, short.id, "repost");
    } else {
      await interactWithShort(user.id, short.id, "repost");
    }
    await load(subTab);
  };

  const toggleFollow = async (short: Short) => {
    if (!user || isGuest || short.authorId === user.id) return;
    if (short.isFollowingAuthor) {
      await supabase.from("follows").delete().eq("follower_id", user.id).eq("followed_id", short.authorId);
    } else {
      await supabase.from("follows").insert({ follower_id: user.id, followed_id: short.authorId });
    }
    await load(subTab);
  };

  const gift = async (short: Short, amountMinor: string) => {
    if (!user || isGuest || short.authorId === user.id) return;
    setGiftError(null);
    setGiftSending(true);
    try {
      await sendGift(short.id, short.authorId, amountMinor);
      const totals = await getGiftTotals(shorts.map((s) => s.id));
      setGiftTotals(totals);
      setGiftTargetId(null);
    } catch (cause) {
      setGiftError(cause instanceof Error ? cause.message : "Gift failed.");
    } finally {
      setGiftSending(false);
    }
  };

  function formatCount(n: number) {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
    if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
    return String(n);
  }

  return (
    <div className="fresh-flow-vertical">
      <nav className="fresh-flow-subtabs" aria-label="Fresh Flow feed filters">
        {SUB_TABS.map((item) => (
          <button
            key={item.id}
            className={subTab === item.id ? "fresh-flow-subtab active" : "fresh-flow-subtab"}
            onClick={() => setSubTab(item.id)}
            aria-pressed={subTab === item.id}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {subTab === "fresh-picks" ? (
        <p className="fresh-flow-empty">Fresh Picks is scoped but not built yet — it needs a real editorial curation system, which doesn't exist on the platform yet.</p>
      ) : loading ? (
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
                  ref={(el) => {
                    if (el) videoRefs.current.set(short.id, el);
                    else videoRefs.current.delete(short.id);
                  }}
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
                      <button
                        className={short.isFollowingAuthor ? "fresh-flow-chip following" : "fresh-flow-chip"}
                        onClick={() => void toggleFollow(short)}
                      >
                        {short.isFollowingAuthor ? "Following" : "Follow"}
                      </button>
                    )}
                  </div>
                  {short.caption && <p className="fresh-flow-caption">{short.caption}</p>}
                </div>

                <div className="fresh-flow-actions">
                  <ReactionPicker
                    myReaction={short.myReaction}
                    count={short.likeCount}
                    disabled={isGuest}
                    variant="short"
                    onReact={(type) => void react(short, type)}
                  />
                  <button className="fresh-flow-action-btn" onClick={() => setOpenCommentsFor(short.id)}>
                    <span>{short.commentCount}</span>
                  </button>
                  <button
                    className={short.repostedByMe ? "fresh-flow-action-btn reposted" : "fresh-flow-action-btn"}
                    onClick={() => void toggleRepost(short)}
                    disabled={isGuest}
                  >
                    <span>{formatCount(short.repostCount)}</span>
                  </button>
                  <button
                    className={savedIds.has(short.id) ? "fresh-flow-action-btn saved" : "fresh-flow-action-btn"}
                    onClick={() => void toggleSave(short)}
                    disabled={isGuest}
                  >
                    <span>{savedIds.has(short.id) ? "Saved" : "Save"}</span>
                  </button>
                  {!isGuest && user && short.authorId !== user.id && (
                    <button className="fresh-flow-action-btn gift" onClick={() => { setGiftTargetId(short.id); setGiftError(null); }}>
                      <span>🎁 {totals ? formatCount(totals.count) : 0}</span>
                    </button>
                  )}
                </div>

                {giftTargetId === short.id && (
                  <div className="fresh-flow-gift-panel" onClick={(e) => e.stopPropagation()}>
                    <strong>Gift Fresh Coin to {short.authorName}</strong>
                    <div className="fresh-flow-gift-presets">
                      {GIFT_PRESETS.map((preset) => (
                        <button key={preset.amountMinor} disabled={giftSending} onClick={() => void gift(short, preset.amountMinor)}>
                          {preset.label} FRESH
                        </button>
                      ))}
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

      {openCommentsFor && (
        <CommentPanel targetType="short" targetId={openCommentsFor} onClose={() => setOpenCommentsFor(null)} />
      )}
    </div>
  );
}

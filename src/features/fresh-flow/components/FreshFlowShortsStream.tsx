import { useEffect, useRef, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { useFreshId } from "../../fresh-id/context/FreshIdContext";
import { CommentPanel } from "../../comments/components/CommentPanel";
import { ReactionPicker } from "../../reactions/components/ReactionPicker";
import { loadFreshFlowShorts } from "../core/loadFreshFlowShorts";
import { rankFreshFlow } from "../core/FreshFlowRanking";
import { interactWithShort, removeShortInteraction } from "../../shorts/core/ShortsUniversalInteractionAdapter";
import type { UniversalReactionKind } from "../../../core/interactions/FreshReactionModel";
import type { Short } from "../../shorts/types/short";
import "./FreshFlow.css";

export default function FreshFlowShortsStream() {
  const { user, isGuest } = useFreshId();
  const [shorts, setShorts] = useState<Short[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openCommentsFor, setOpenCommentsFor] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  const viewedRef = useRef<Set<string>>(new Set());

  const refresh = async () => {
    const result = await loadFreshFlowShorts(user?.id ?? null, isGuest);
    setShorts(rankFreshFlow(result.shorts));
    setSavedIds(result.savedIds);
  };

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await loadFreshFlowShorts(user?.id ?? null, isGuest);
        if (active) {
          setShorts(rankFreshFlow(result.shorts));
          setSavedIds(result.savedIds);
        }
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : "Unable to load Fresh Flow.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [user?.id, isGuest]);

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
    await refresh();
  };

  const toggleSave = async (short: Short) => {
    if (!user || isGuest) return;
    if (savedIds.has(short.id)) {
      await removeShortInteraction(user.id, short.id, "save");
    } else {
      await interactWithShort(user.id, short.id, "save");
    }
    await refresh();
  };

  const toggleRepost = async (short: Short) => {
    if (!user || isGuest) return;
    if (short.repostedByMe) {
      await removeShortInteraction(user.id, short.id, "repost");
    } else {
      await interactWithShort(user.id, short.id, "repost");
    }
    await refresh();
  };

  const toggleFollow = async (short: Short) => {
    if (!user || isGuest || short.authorId === user.id) return;
    if (short.isFollowingAuthor) {
      await supabase.from("follows").delete().eq("follower_id", user.id).eq("followed_id", short.authorId);
    } else {
      await supabase.from("follows").insert({ follower_id: user.id, followed_id: short.authorId });
    }
    await refresh();
  };

  function formatCount(n: number) {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
    if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
    return String(n);
  }

  if (loading) return <p className="fresh-flow-empty">Loading Fresh Flow…</p>;
  if (error) return <p className="fresh-flow-empty" role="alert">{error}</p>;
  if (shorts.length === 0) return <p className="fresh-flow-empty">No content yet. Be the first to post a Short.</p>;

  return (
    <div className="fresh-flow-stream" ref={containerRef}>
      {shorts.map((short) => (
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
          </div>
        </div>
      ))}

      {openCommentsFor && (
        <CommentPanel targetType="short" targetId={openCommentsFor} onClose={() => setOpenCommentsFor(null)} />
      )}
    </div>
  );
}

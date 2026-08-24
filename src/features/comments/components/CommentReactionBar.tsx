import { useEffect, useState } from "react";
import { useFreshId } from "../../fresh-id/context/FreshIdContext";
import {
  getCommentReactionState,
  toggleCommentReaction,
  type CommentReactionState,
  type ShortCommentReaction,
  SHORT_COMMENT_REACTIONS,
} from "../services/ShortsCommentReactionService";

const REACTION_LABELS: Record<ShortCommentReaction, string> = {
  like: "👍",
  dislike: "👎",
  love: "❤️",
  laugh: "😂",
  wow: "😮",
  sad: "😢",
  angry: "😡",
  fire: "🔥",
  clap: "👏",
  support: "🙌",
};

interface CommentReactionBarProps {
  commentId: string;
}

export function CommentReactionBar({ commentId }: CommentReactionBarProps) {
  const { user, isGuest } = useFreshId();
  const [state, setState] = useState<CommentReactionState>({ reaction: null, counts: {} });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void getCommentReactionState(commentId, user?.id).then((next) => {
      if (active) setState(next);
    }).catch((reason: unknown) => {
      if (active) setError(reason instanceof Error ? reason.message : "Couldn't load reactions");
    });
    return () => { active = false; };
  }, [commentId, user?.id]);

  async function react(reaction: ShortCommentReaction) {
    if (!user || isGuest || busy) return;
    setBusy(true);
    setError(null);
    try {
      setState(await toggleCommentReaction(commentId, user.id, reaction));
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : "Couldn't update reaction");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="comment-reaction-bar" aria-label="Comment reactions">
      {SHORT_COMMENT_REACTIONS.map((reaction) => {
        const active = state.reaction === reaction;
        const count = state.counts[reaction] ?? 0;
        return (
          <button
            key={reaction}
            type="button"
            className={`comment-reaction-button${active ? " is-active" : ""}`}
            aria-pressed={active}
            aria-label={`${reaction}${count ? `, ${count}` : ""}`}
            disabled={busy || !user || isGuest}
            onClick={() => void react(reaction)}
          >
            <span aria-hidden="true">{REACTION_LABELS[reaction]}</span>
            {count > 0 && <span aria-hidden="true">{count}</span>}
          </button>
        );
      })}
      {error && <span className="auth-error" role="status">{error}</span>}
    </div>
  );
}

import { useState } from "react";
import type {
  CommentReactionState,
  ShortsCommentReaction,
} from "../services/ShortsCommentReactionService";
import { setCommentReaction } from "../services/ShortsCommentReactionService";

const REACTIONS: Array<{ type: ShortsCommentReaction; label: string; icon: string }> = [
  { type: "like", label: "Like", icon: "👍" },
  { type: "dislike", label: "Dislike", icon: "👎" },
  { type: "love", label: "Love", icon: "❤️" },
  { type: "laugh", label: "Laugh", icon: "😂" },
  { type: "wow", label: "Wow", icon: "😮" },
  { type: "sad", label: "Sad", icon: "😢" },
  { type: "angry", label: "Angry", icon: "😡" },
  { type: "fire", label: "Fire", icon: "🔥" },
  { type: "clap", label: "Clap", icon: "👏" },
  { type: "support", label: "Support", icon: "🙌" },
];

interface CommentReactionBarProps {
  commentId: string;
  userId: string;
  state?: CommentReactionState;
  onCommitted: () => void;
}

export function CommentReactionBar({
  commentId,
  userId,
  state,
  onCommitted,
}: CommentReactionBarProps) {
  const [busy, setBusy] = useState<ShortsCommentReaction | null>(null);

  async function react(reaction: ShortsCommentReaction) {
    if (busy) return;
    setBusy(reaction);
    try {
      await setCommentReaction(commentId, userId, reaction);
      onCommitted();
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="comment-reaction-bar" aria-label="Comment reactions">
      {REACTIONS.map(({ type, label, icon }) => {
        const count = state?.counts[type] ?? 0;
        const active = state?.mine === type;
        return (
          <button
            key={type}
            type="button"
            className="quick-reaction-chip"
            aria-label={`${label}${count ? `, ${count}` : ""}`}
            aria-pressed={active}
            disabled={busy !== null}
            onClick={() => void react(type)}
            style={{ opacity: active ? 1 : 0.82, fontWeight: active ? 700 : 400 }}
          >
            {icon}{count > 0 ? ` ${count}` : ""}
            {busy === type ? " …" : ""}
          </button>
        );
      })}
    </div>
  );
}

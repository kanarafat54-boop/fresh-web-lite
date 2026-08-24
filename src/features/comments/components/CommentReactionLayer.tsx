import { useEffect, useMemo, useState } from "react";
import { useFreshId } from "../../fresh-id/context/FreshIdContext";
import {
  getShortCommentReactionStateBatch,
  subscribeToShortCommentReactions,
  toggleCommentReaction,
} from "../services/ShortsCommentReactionService";
import { CommentReactionBar } from "./CommentReactionBar";

export interface CommentReactionLayerProps {
  commentIds: string[];
}

/**
 * Scalable reaction-state adapter for comment trees.
 *
 * It deliberately owns hydration and realtime reconciliation while leaving
 * the existing CommentPanel responsible for comments, replies and media.
 */
export function CommentReactionLayer({ commentIds }: CommentReactionLayerProps) {
  const { user, isGuest } = useFreshId();
  const ids = useMemo(() => [...new Set(commentIds.filter(Boolean))], [commentIds]);
  const [state, setState] = useState<Record<string, { counts: Record<string, number>; reaction: string | null }>>({});

  useEffect(() => {
    let cancelled = false;
    if (!ids.length || !user?.id || isGuest) {
      setState({});
      return;
    }

    void getShortCommentReactionStateBatch(ids, user.id).then((next) => {
      if (!cancelled) setState(next);
    });

    const unsubscribe = subscribeToShortCommentReactions(ids, (commentId) => {
      void getShortCommentReactionStateBatch([commentId], user.id).then((next) => {
        if (cancelled) return;
        setState((current) => ({ ...current, ...next }));
      });
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [ids, user?.id, isGuest]);

  if (!user?.id || isGuest) return null;

  return (
    <>
      {ids.map((commentId) => {
        const item = state[commentId];
        return (
          <CommentReactionBar
            key={commentId}
            commentId={commentId}
            counts={item?.counts}
            activeReaction={item?.reaction}
            onReactionChange={(next) => {
              setState((current) => ({
                ...current,
                [commentId]: next,
              }));
            }}
            onToggleReaction={async (reaction) => {
              const next = await toggleCommentReaction(commentId, user.id, reaction as never);
              setState((current) => ({ ...current, [commentId]: next }));
              return next;
            }}
          />
        );
      })}
    </>
  );
}

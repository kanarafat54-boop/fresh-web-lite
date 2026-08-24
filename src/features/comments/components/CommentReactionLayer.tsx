import { useEffect, useMemo, useState } from "react";
import { useFreshId } from "../../fresh-id/context/FreshIdContext";
import {
  getCommentReactionStates,
  subscribeToShortCommentReactions,
  type CommentReactionStateMap,
} from "../services/ShortsCommentReactionService";
import { CommentReactionBar } from "./CommentReactionBar";

export interface CommentReactionLayerProps {
  commentIds: string[];
}

/**
 * Scalable reaction-state adapter for comment trees.
 *
 * It hydrates all visible comment reactions in one query and then reconciles
 * individual comment changes through Supabase Realtime. The existing
 * CommentPanel remains responsible for comment/reply/media rendering.
 */
export function CommentReactionLayer({ commentIds }: CommentReactionLayerProps) {
  const { user, isGuest } = useFreshId();
  const ids = useMemo(() => [...new Set(commentIds.filter(Boolean))], [commentIds]);
  const [state, setState] = useState<CommentReactionStateMap>({});

  useEffect(() => {
    let cancelled = false;
    if (!ids.length || !user?.id || isGuest) {
      setState({});
      return;
    }

    const hydrate = async (idsToLoad: string[]) => {
      const next = await getCommentReactionStates(idsToLoad, user.id);
      if (!cancelled) setState((current) => ({ ...current, ...next }));
    };

    void hydrate(ids);

    const unsubscribe = subscribeToShortCommentReactions(ids, (commentId) => {
      void hydrate([commentId]);
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [ids, user?.id, isGuest]);

  if (!user?.id || isGuest) return null;

  return (
    <>
      {ids.map((commentId) => (
        <CommentReactionBar
          key={commentId}
          commentId={commentId}
          initialState={state[commentId]}
          onStateChange={(next) => {
            setState((current) => ({ ...current, [commentId]: next }));
          }}
        />
      ))}
    </>
  );
}

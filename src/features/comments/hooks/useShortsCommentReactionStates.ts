import { useEffect, useState } from "react";
import { useFreshId } from "../../fresh-id/context/FreshIdContext";
import {
  getCommentReactionStates,
  type CommentReactionStateMap,
} from "../services/ShortsCommentReactionService";

/**
 * Loads reaction state for an entire visible comment tree in one request.
 * Keeping this hook separate from CommentPanel lets every comment surface
 * reuse the same batched state contract without introducing N+1 queries.
 */
export function useShortsCommentReactionStates(commentIds: string[]) {
  const { user, isGuest } = useFreshId();
  const [states, setStates] = useState<CommentReactionStateMap>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const key = [...new Set(commentIds.filter(Boolean))].sort().join(",");

  useEffect(() => {
    let active = true;
    const ids = key ? key.split(",") : [];

    if (!ids.length) {
      setStates({});
      setLoading(false);
      setError(null);
      return () => {
        active = false;
      };
    }

    setLoading(true);
    setError(null);

    void getCommentReactionStates(ids, isGuest ? null : user?.id)
      .then((next) => {
        if (!active) return;
        setStates(next);
      })
      .catch((reason: unknown) => {
        if (!active) return;
        setError(reason instanceof Error ? reason.message : "Couldn't load comment reactions");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [key, user?.id, isGuest]);

  return { states, loading, error };
}

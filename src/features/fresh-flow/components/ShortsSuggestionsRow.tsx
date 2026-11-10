import { useCallback, useEffect, useState } from "react";
import { useFreshId } from "../../fresh-id/context/FreshIdContext";
import { formatCount } from "../core/shortsExplore";
import { loadShortsSuggestions } from "../core/shortsSuggestionsService";
import type { Short } from "../../shorts/types/short";
import "./shortsSuggestions.css";

type Props = {
  /** Opens the Short in the Shorts feed. The caller hands over to the Shorts route. */
  onOpen: (shortId: string) => void;
  onSeeAll?: () => void;
  heading?: string;
};

/** A row of live Shorts suggestions, shared by the Fresh Web Lite Home and the Fresh Flow Home. */
export default function ShortsSuggestionsRow({ onOpen, onSeeAll, heading = "Suggested Shorts" }: Props) {
  const { user, isGuest } = useFreshId();
  const [shorts, setShorts] = useState<Short[] | null>(null);
  const [failed, setFailed] = useState(false);
  const userId = user?.id ?? null;

  const load = useCallback(() => {
    let cancelled = false;
    setFailed(false);
    loadShortsSuggestions(userId, Boolean(isGuest))
      .then((result) => { if (!cancelled) setShorts(result); })
      .catch(() => { if (!cancelled) { setFailed(true); setShorts([]); } });
    return () => { cancelled = true; };
  }, [userId, isGuest]);

  useEffect(() => load(), [load]);

  return (
    <section className="shorts-suggest" aria-label={heading}>
      <div className="shorts-suggest-heading">
        <h3>{heading}</h3>
        {onSeeAll ? <button type="button" onClick={onSeeAll}>Open Shorts →</button> : null}
      </div>
      {shorts === null ? <p className="shorts-suggest-note">Loading Shorts…</p> : null}
      {failed ? <p className="shorts-suggest-note" role="alert">Fresh could not load Shorts right now. <button type="button" onClick={() => void load()}>Try again</button></p> : null}
      {shorts && !failed && shorts.length === 0 ? <p className="shorts-suggest-note">No Shorts to suggest yet. New Shorts will appear here as creators post them.</p> : null}
      {shorts && shorts.length > 0 ? (
        <ul className="shorts-suggest-list">
          {shorts.map((short) => (
            <li key={short.id}>
              <button type="button" className="shorts-suggest-card" onClick={() => onOpen(short.id)} aria-label={`Open Short by @${short.authorUsername}: ${short.caption || "Untitled"}`}>
                <span className="shorts-suggest-frame" aria-hidden="true">
                  <video src={`${short.videoUrl}#t=0.1`} muted playsInline preload="metadata" tabIndex={-1} />
                  {short.durationSeconds ? <b>{Math.floor(short.durationSeconds / 60)}:{String(Math.round(short.durationSeconds % 60)).padStart(2, "0")}</b> : null}
                </span>
                <strong>{short.caption || "Untitled Short"}</strong>
                <small>@{short.authorUsername} · {formatCount(short.viewCount)} views</small>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

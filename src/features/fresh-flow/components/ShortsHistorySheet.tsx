import { useEffect, useRef, useState } from "react";
import { dayLabel, progressLabel } from "../core/shortsHistory";
import { clearWatchHistory, loadWatchHistory, removeFromHistory, type HistoryItem } from "../core/shortsHistoryService";
import { shortWatchPath } from "../core/shortsLinks";
import "./shortsContextPanel.css";

type Props = { userId: string; onClose: () => void };

/** Watch history: the Shorts this viewer really watched, with remove and clear controls. */
export default function ShortsHistorySheet({ userId, onClose }: Props) {
  const [items, setItems] = useState<HistoryItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const closeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    loadWatchHistory(userId).then((rows) => { if (!cancelled) setItems(rows); }).catch(() => { if (!cancelled) setError("Fresh could not load your watch history. Check your connection and try again."); });
    return () => { cancelled = true; };
  }, [userId]);

  async function remove(mediaId: string) {
    setNote(null);
    if (await removeFromHistory(userId, mediaId)) setItems((current) => (current ?? []).filter((item) => item.mediaId !== mediaId));
    else setNote("Fresh could not remove that. Try again.");
  }
  async function clearAll() {
    setNote(null);
    if (await clearWatchHistory(userId)) { setItems([]); setConfirmClear(false); setNote("Watch history cleared."); }
    else setNote("Fresh could not clear your history. Try again.");
  }

  let lastDay = "";
  return (
    <div className="shorts-sheet-backdrop" onClick={onClose}>
      <div className="shorts-sheet" role="dialog" aria-modal="true" aria-label="Watch history" onClick={(event) => event.stopPropagation()}>
        <div className="shorts-sheet-header">
          <h3>Watch history</h3>
          <button ref={closeRef} type="button" className="shorts-sheet-close" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <p className="shorts-why-note">Shorts you watched at least a quarter of. Removing or clearing also removes them from what your recommendations learn from.</p>
        {error ? <p role="alert">{error}</p> : null}
        {!error && items === null ? <p>Loading…</p> : null}
        {items && items.length === 0 && !error ? <p>Nothing here yet. Shorts you watch will appear in this list.</p> : null}
        {items && items.length > 0 ? (
          <ul className="shorts-history-list">
            {items.map((item) => {
              const day = dayLabel(item.lastWatchedAt);
              const heading = day !== lastDay ? day : null;
              lastDay = day;
              return (
                <li key={item.mediaId}>
                  {heading ? <h4>{heading}</h4> : null}
                  <div className="shorts-history-row">
                    {item.available ? (
                      <a href={shortWatchPath(item.mediaId)} onClick={onClose}>
                        <strong>{item.caption?.trim() || "Untitled Short"}</strong>
                        <span>{item.creator} · {progressLabel(item.furthest)}{item.sessions > 1 ? ` · ${item.sessions} times` : ""}</span>
                      </a>
                    ) : (
                      <div><strong>No longer available</strong><span>{progressLabel(item.furthest)}</span></div>
                    )}
                    <button type="button" aria-label="Remove from watch history" onClick={() => void remove(item.mediaId)}>✕</button>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : null}
        {note ? <p role="status">{note}</p> : null}
        {items && items.length > 0 ? (
          confirmClear ? (
            <div className="shorts-history-confirm">
              <span>Clear all watch history?</span>
              <button type="button" onClick={() => void clearAll()}>Clear</button>
              <button type="button" onClick={() => setConfirmClear(false)}>Cancel</button>
            </div>
          ) : <button type="button" className="shorts-why-controls" onClick={() => setConfirmClear(true)}>Clear watch history</button>
        ) : null}
      </div>
    </div>
  );
}

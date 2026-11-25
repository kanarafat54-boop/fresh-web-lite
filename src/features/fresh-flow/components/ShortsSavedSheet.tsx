import { useEffect, useRef, useState } from "react";
import { removeShortInteraction } from "../../shorts/core/ShortsUniversalInteractionAdapter";
import { dayLabel } from "../core/shortsHistory";
import { filterSaved, type SavedItem } from "../core/shortsSaved";
import { loadSavedShorts } from "../core/shortsSavedService";
import { shortWatchPath } from "../core/shortsLinks";
import { loadCreatorReposts, loadLikedShorts, type CreatorRepost } from "../core/creatorReposts";
import "./shortsContextPanel.css";

type ListTab = "saved" | "liked" | "reposted";
const TAB_LABELS: Record<ListTab, string> = { saved: "Saved", liked: "Liked", reposted: "Reposted" };

type Props = { userId: string; onClose: () => void; onUnsaved: (shortId: string) => void };

/** The viewer's saved Shorts, with search and unsave. */
export default function ShortsSavedSheet({ userId, onClose, onUnsaved }: Props) {
  const [items, setItems] = useState<SavedItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<ListTab>("saved");
  const [others, setOthers] = useState<CreatorRepost[] | null>(null);
  const [othersError, setOthersError] = useState<string | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    let cancelled = false;
    loadSavedShorts(userId).then((rows) => { if (!cancelled) setItems(rows); }).catch(() => { if (!cancelled) setError("Fresh could not load your saved Shorts. Check your connection and try again."); });
    return () => { cancelled = true; };
  }, [userId]);

  useEffect(() => {
    if (tab === "saved") return undefined;
    let cancelled = false;
    setOthers(null); setOthersError(null);
    (tab === "liked" ? loadLikedShorts(userId) : loadCreatorReposts(userId))
      .then((rows) => { if (!cancelled) setOthers(rows); })
      .catch(() => { if (!cancelled) setOthersError(`Fresh could not load your ${TAB_LABELS[tab].toLowerCase()} Shorts. Check your connection and try again.`); });
    return () => { cancelled = true; };
  }, [tab, userId]);

  async function unsave(shortId: string) {
    setNote(null);
    try {
      await removeShortInteraction(userId, shortId, "save");
      setItems((current) => (current ?? []).filter((item) => item.shortId !== shortId));
      onUnsaved(shortId);
    } catch { setNote("Fresh could not remove that. Try again."); }
  }

  const visible = items ? filterSaved(items, query) : [];
  let lastDay = "";
  return (
    <div className="shorts-sheet-backdrop" onClick={onClose}>
      <div className="shorts-sheet" role="dialog" aria-modal="true" aria-label="Saved Shorts" onClick={(event) => event.stopPropagation()}>
        <div className="shorts-sheet-header">
          <h3>Saved Shorts</h3>
          <button ref={closeRef} type="button" className="shorts-sheet-close" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div role="tablist" aria-label="Your Shorts lists" className="shorts-sheet-tabs">
          {(Object.keys(TAB_LABELS) as ListTab[]).map((id) => (
            <button key={id} type="button" role="tab" id={`shorts-list-tab-${id}`} aria-selected={tab === id} aria-controls="shorts-list-panel" onClick={() => setTab(id)}>{TAB_LABELS[id]}</button>
          ))}
        </div>
        <div id="shorts-list-panel" role="tabpanel" aria-labelledby={`shorts-list-tab-${tab}`}>
        {tab !== "saved" ? (
          othersError ? <p role="alert">{othersError}</p>
          : others === null ? <p>Loading…</p>
          : others.length === 0 ? <p>{tab === "liked" ? "Nothing liked yet. Like a Short and it will appear here." : "Nothing reposted yet. Repost a Short and it will appear here."}</p>
          : (
            <ul className="shorts-history-list" aria-label={`${TAB_LABELS[tab]} Shorts`}>
              {others.map((item) => (
                <li key={item.id}>
                  <div className="shorts-history-row">
                    <a href={shortWatchPath(item.id)} onClick={onClose}><strong>{item.caption.trim() || "Untitled Short"}</strong></a>
                  </div>
                </li>
              ))}
            </ul>
          )
        ) : (<>
        {error ? <p role="alert">{error}</p> : null}
        {!error && items === null ? <p>Loading…</p> : null}
        {items && items.length === 0 && !error ? <p>Nothing saved yet. Use Save on a Short and it will appear here.</p> : null}
        {items && items.length > 3 ? <input className="shorts-saved-search" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search saved Shorts" aria-label="Search saved Shorts" /> : null}
        {items && items.length > 0 && visible.length === 0 ? <p>No saved Short matches “{query.trim()}”.</p> : null}
        {visible.length > 0 ? (
          <ul className="shorts-history-list">
            {visible.map((item) => {
              const day = dayLabel(item.savedAt);
              const heading = day !== lastDay ? day : null;
              lastDay = day;
              return (
                <li key={item.shortId}>
                  {heading ? <h4>{`Saved ${/^(today|yesterday)$/i.test(heading) ? heading.toLowerCase() : heading}`}</h4> : null}
                  <div className="shorts-history-row">
                    {item.available ? (
                      <a href={shortWatchPath(item.shortId)} onClick={onClose}>
                        <strong>{item.caption?.trim() || "Untitled Short"}</strong>
                        <span>{item.creator}</span>
                      </a>
                    ) : (
                      <div><strong>No longer available</strong><span>This Short can no longer be shown. You can remove it from your saved list.</span></div>
                    )}
                    <button type="button" aria-label="Remove from saved" onClick={() => void unsave(item.shortId)}>✕</button>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : null}
        {note ? <p role="status">{note}</p> : null}
        </>)}
        </div>
      </div>
    </div>
  );
}

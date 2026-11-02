import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { EMPTY_PREFS, loadShortPrefs, removeValue, saveShortPrefs, type ShortPrefs } from "../core/shortsPreferences";

type Props = { userId: string; onClose: () => void; onChanged: () => void };

/** Recommendation controls (spec section 7 / screens 25-26): manage interests, hidden topics and creators, reset. */
export default function ShortsRecommendationControls({ userId, onClose, onChanged }: Props) {
  const [prefs, setPrefs] = useState<ShortPrefs | null>(null);
  const [names, setNames] = useState<Record<string, string>>({});
  const [note, setNote] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadShortPrefs(userId).then(async (loaded) => {
      if (cancelled) return;
      setPrefs(loaded);
      if (loaded.mutedCreators.length > 0) {
        const { data } = await supabase.from("user_public_profiles").select("id, username, full_name").in("id", loaded.mutedCreators);
        if (!cancelled) setNames(Object.fromEntries(((data ?? []) as any[]).map((row) => [row.id, row.username ? `@${row.username}` : row.full_name || "Creator"])));
      }
    }).catch(() => { if (!cancelled) setPrefs({ ...EMPTY_PREFS }); });
    return () => { cancelled = true; };
  }, [userId]);

  const commit = async (next: ShortPrefs, message: string) => {
    setNote(null);
    try { await saveShortPrefs(userId, next); setPrefs(next); setNote(message); onChanged(); }
    catch { setNote("Fresh could not save that change. Try again."); }
  };

  const group = (title: string, hint: string, list: string[], key: keyof ShortPrefs, label: (value: string) => string) => (
    <section aria-label={title}>
      <h4>{title}</h4>
      {list.length === 0 ? <p>{hint}</p> : (
        <ul className="shorts-reco-chips">
          {list.map((value) => (
            <li key={value}>
              <span>{label(value)}</span>
              <button type="button" aria-label={`Remove ${label(value)}`} onClick={() => prefs && void commit({ ...prefs, [key]: removeValue(list, value) }, "Updated.")}>✕</button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );

  return (
    <div className="comment-panel-backdrop" onClick={onClose}>
      <div className="comment-panel post-menu-sheet shorts-reco" role="dialog" aria-modal="true" aria-label="Recommendation controls" onClick={(event) => event.stopPropagation()}>
        <div className="comment-panel-header"><h3>Your recommendations</h3><button type="button" className="back-btn" onClick={onClose} aria-label="Close">✕</button></div>
        {!prefs && <p>Loading…</p>}
        {prefs && (
          <>
            {group("Show more of", "Use “Show more like this” on a Short with hashtags and it appears here.", prefs.interests, "interests", (v) => `#${v}`)}
            {group("Show less of", "Nothing yet.", prefs.showLessTopics, "showLessTopics", (v) => `#${v}`)}
            {group("Hidden topics", "No hidden topics.", prefs.mutedTopics, "mutedTopics", (v) => `#${v}`)}
            {group("Muted creators", "No muted creators.", prefs.mutedCreators, "mutedCreators", (v) => names[v] ?? "Creator")}
            <section aria-label="Reset recommendations">
              <h4>Reset recommendations</h4>
              <p>Clears the lists above and stops your past watching from shaping For You and Fresh Picks. Your history is kept, not deleted.</p>
              {!confirmReset
                ? <button type="button" onClick={() => setConfirmReset(true)}>Reset recommendations…</button>
                : <button type="button" className="danger" onClick={() => { setConfirmReset(false); void commit({ ...EMPTY_PREFS, tasteResetAt: new Date().toISOString() }, "Recommendations reset. Your feed will start fresh."); }}>Yes, reset now</button>}
            </section>
          </>
        )}
        {note && <p role="status">{note}</p>}
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { loadSoundOverview, loadTopicShorts, type SoundOverview, type TopicKind, type TopicShort } from "../core/shortsTopics";
import ShortsReportSheet from "./ShortsReportSheet";
import { useFreshId } from "../../fresh-id/context/FreshIdContext";
import { creatorsLabel, sortTopicShorts, type TopicSort } from "../core/shortsSound";
import { formatCount, requestOpenShort } from "../core/shortsExplore";
import "./ShortsCreatorProfile.css";

type Props = { kind: TopicKind; value: string; onClose: () => void; onOpenShort: (shortId: string) => void };

/** Hashtag / sound page (screens 11 and 12). Lists real Shorts only. */
export default function ShortsTopicPage({ kind, value, onClose, onOpenShort }: Props) {
  const [shorts, setShorts] = useState<TopicShort[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [overview, setOverview] = useState<SoundOverview | null>(null);
  const [sort, setSort] = useState<TopicSort>("popular");
  const { user, isGuest } = useFreshId();
  const [reporting, setReporting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setShorts(null); setError(null);
    loadTopicShorts(kind, value).then((rows) => { if (!cancelled) setShorts(rows); }).catch((cause) => { if (!cancelled) setError(cause instanceof Error ? cause.message : "Could not load this page."); });
    setOverview(null);
    if (kind === "sound") loadSoundOverview(value).then((result) => { if (!cancelled) setOverview(result); }).catch(() => { /* the list still works; counts fall back to what is loaded */ });
    return () => { cancelled = true; };
  }, [kind, value]);

  const title = kind === "hashtag" ? `#${value}` : `♪ ${value}`;
  const views = (shorts ?? []).reduce((total, short) => total + short.viewCount, 0);

  return (
    <div className="shorts-profile" role="dialog" aria-modal="true" aria-label={kind === "hashtag" ? "Hashtag page" : "Sound page"}>
      <header className="shorts-profile-bar">
        <button type="button" onClick={onClose} aria-label="Back to Shorts">←</button>
        <strong>{title}</strong>
        <span aria-hidden="true" />
      </header>
      {error && <p className="shorts-profile-note" role="alert">{error}</p>}
      {!shorts && !error && <p className="shorts-profile-note">Loading…</p>}
      {shorts && (
        <div className="shorts-profile-body">
          <dl className="shorts-profile-stats">
            <div><dd>{formatCount(overview ? overview.total : shorts.length)}</dd><dt>Shorts</dt></div>
            <div><dd>{formatCount(views)}</dd><dt>{kind === "sound" && overview && overview.total > shorts.length ? `Views (top ${shorts.length})` : "Views"}</dt></div>
            {kind === "sound" && overview ? <div><dd>{creatorsLabel(overview)}</dd><dt>Creators</dt></div> : null}
          </dl>
          {kind === "sound" && (
            <div className="shorts-profile-actions">
              {overview?.firstUse ? <p className="shorts-profile-note">First used {new Date(overview.firstUse.at).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}{overview.firstUseCreator ? ` by ${overview.firstUseCreator}` : ""}.</p> : null}
              <button type="button" disabled title="Reusing a sound in a new Short is not available yet">Use this sound</button>
              {shorts.length > 0 ? <button type="button" onClick={() => setReporting(true)}>Report sound</button> : null}
              <p className="shorts-profile-note">Reusing a sound in a new Short is not available yet. It needs creators' permission settings for their audio first.</p>
            </div>
          )}
          {shorts.length > 1 ? (
            <div className="shorts-profile-actions" role="group" aria-label="Sort Shorts">
              <button type="button" aria-pressed={sort === "popular"} onClick={() => setSort("popular")}>Popular</button>
              <button type="button" aria-pressed={sort === "recent"} onClick={() => setSort("recent")}>Recent</button>
            </div>
          ) : null}
          {shorts.length === 0 ? <p className="shorts-profile-note">No Shorts found.</p> : (
            <ul className="shorts-profile-grid">
              {sortTopicShorts(shorts, sort).map((short) => (
                <li key={short.id}>
                  <button type="button" onClick={() => { requestOpenShort(short.id); onOpenShort(short.id); }} aria-label={`Open Short: ${short.caption || "Fresh Short"}`}>
                    <video src={`${short.videoUrl}#t=0.5`} muted playsInline preload="metadata" />
                    <span>▷ {formatCount(short.viewCount)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {reporting && kind === "sound" && shorts && shorts.length > 0 ? <ShortsReportSheet targetType="sound" targetId={shorts[0].id} soundName={value} userId={user && !isGuest ? user.id : null} onClose={() => setReporting(false)} /> : null}
    </div>
  );
}

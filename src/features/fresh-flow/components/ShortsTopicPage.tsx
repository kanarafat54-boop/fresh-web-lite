import { useEffect, useState } from "react";
import { loadTopicShorts, type TopicKind, type TopicShort } from "../core/shortsTopics";
import { formatCount, requestOpenShort } from "../core/shortsExplore";
import "./ShortsCreatorProfile.css";

type Props = { kind: TopicKind; value: string; onClose: () => void; onOpenShort: (shortId: string) => void };

/** Hashtag / sound page (screens 11 and 12). Lists real Shorts only. */
export default function ShortsTopicPage({ kind, value, onClose, onOpenShort }: Props) {
  const [shorts, setShorts] = useState<TopicShort[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setShorts(null); setError(null);
    loadTopicShorts(kind, value).then((rows) => { if (!cancelled) setShorts(rows); }).catch((cause) => { if (!cancelled) setError(cause instanceof Error ? cause.message : "Could not load this page."); });
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
            <div><dd>{shorts.length}</dd><dt>Shorts</dt></div>
            <div><dd>{formatCount(views)}</dd><dt>Views</dt></div>
          </dl>
          {kind === "sound" && (
            <div className="shorts-profile-actions">
              <button type="button" disabled title="Attaching a sound to a new recording needs the video worker connection">Use this sound</button>
              <p className="shorts-profile-note">Using a sound in a new Short needs the video worker connection.</p>
            </div>
          )}
          {shorts.length === 0 ? <p className="shorts-profile-note">No Shorts found.</p> : (
            <ul className="shorts-profile-grid">
              {shorts.map((short) => (
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
    </div>
  );
}

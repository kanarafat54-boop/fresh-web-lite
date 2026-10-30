import { useEffect, useState } from "react";
import { useFreshId } from "../../fresh-id/context/FreshIdContext";
import { setAuthorFollow } from "../core/social";
import { formatCount, loadCreatorProfile, requestOpenShort, type CreatorProfileData } from "../core/shortsExplore";
import "./ShortsCreatorProfile.css";

type Tab = "shorts" | "playlists" | "about";

type Props = {
  authorId: string;
  onClose: () => void;
  /** Called after the feed has been told which Short to start on. */
  onOpenShort: (shortId: string) => void;
  onMessage?: (authorId: string) => void;
  onSignIn?: () => void;
};

/** Creator profile for Fresh Shorts: stats, Follow / Message, Shorts grid, About. Real data only. */
export default function ShortsCreatorProfile({ authorId, onClose, onOpenShort, onMessage, onSignIn }: Props) {
  const { user, isGuest } = useFreshId();
  const [data, setData] = useState<CreatorProfileData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("shorts");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setData(null); setError(null);
    loadCreatorProfile(authorId, user?.id ?? null).then((result) => { if (!cancelled) setData(result); }).catch((cause) => { if (!cancelled) setError(cause instanceof Error ? cause.message : "Could not load this creator."); });
    return () => { cancelled = true; };
  }, [authorId, user?.id]);

  const isSelf = Boolean(user && user.id === authorId);

  const toggleFollow = async () => {
    if (!data) return;
    if (!user || isGuest) { onSignIn?.(); return; }
    setBusy(true);
    const next = !data.isFollowing;
    try {
      await setAuthorFollow(user.id, authorId, next);
      setData({ ...data, isFollowing: next, followers: Math.max(0, data.followers + (next ? 1 : -1)) });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not update follow.");
    } finally { setBusy(false); }
  };

  return (
    <div className="shorts-profile" role="dialog" aria-modal="true" aria-label="Creator profile">
      <header className="shorts-profile-bar">
        <button type="button" onClick={onClose} aria-label="Back to Shorts">←</button>
        <strong>{data ? `@${data.username}` : "Creator"}</strong>
        <span aria-hidden="true" />
      </header>
      {error && <p className="shorts-profile-note" role="alert">{error}</p>}
      {!data && !error && <p className="shorts-profile-note">Loading creator…</p>}
      {data && (
        <div className="shorts-profile-body">
          <section className="shorts-profile-head">
            <span className="shorts-profile-avatar" aria-hidden="true">{data.avatarUrl ? <img src={data.avatarUrl} alt="" /> : (data.username[0] ?? "F").toUpperCase()}</span>
            <div>
              <h2>{data.fullName}{data.verified && <span className="shorts-profile-verified" title="Verified"> ✔</span>}</h2>
              <p className="shorts-profile-handle">@{data.username}</p>
            </div>
          </section>
          {data.bio && <p className="shorts-profile-bio">{data.bio}</p>}
          <dl className="shorts-profile-stats">
            <div><dd>{formatCount(data.following)}</dd><dt>Following</dt></div>
            <div><dd>{formatCount(data.followers)}</dd><dt>Followers</dt></div>
            <div><dd>{formatCount(data.totalLikes)}</dd><dt>Likes</dt></div>
          </dl>
          {!isSelf && (
            <div className="shorts-profile-actions">
              <button type="button" className="primary" onClick={() => void toggleFollow()} disabled={busy} aria-pressed={data.isFollowing}>{data.isFollowing ? "Following" : "Follow"}</button>
              <button type="button" onClick={() => onMessage?.(authorId)}>Message</button>
            </div>
          )}
          <nav className="shorts-profile-tabs" aria-label="Creator sections">
            {(["shorts", "playlists", "about"] as Tab[]).map((id) => (
              <button key={id} type="button" className={tab === id ? "active" : ""} aria-pressed={tab === id} onClick={() => setTab(id)}>{id === "shorts" ? "Shorts" : id === "playlists" ? "Playlists" : "About"}</button>
            ))}
          </nav>
          {tab === "shorts" && (data.shorts.length === 0 ? <p className="shorts-profile-note">No Shorts yet.</p> : (
            <ul className="shorts-profile-grid">
              {data.shorts.map((short) => (
                <li key={short.id}>
                  <button type="button" onClick={() => { requestOpenShort(short.id); onOpenShort(short.id); }} aria-label={`Open Short: ${short.caption || "Fresh Short"}`}>
                    <video src={`${short.videoUrl}#t=0.5`} muted playsInline preload="metadata" />
                    <span>▷ {formatCount(short.viewCount)}</span>
                  </button>
                </li>
              ))}
            </ul>
          ))}
          {tab === "playlists" && <p className="shorts-profile-note">Playlists aren't available yet. Creators will be able to group their Shorts here once the playlist service is connected.</p>}
          {tab === "about" && (
            <dl className="shorts-profile-about">
              <div><dt>Shorts</dt><dd>{data.shorts.length}</dd></div>
              <div><dt>Total views</dt><dd>{formatCount(data.totalViews)}</dd></div>
              {data.joinedAt && <div><dt>Joined Fresh</dt><dd>{new Date(data.joinedAt).toLocaleDateString(undefined, { year: "numeric", month: "long" })}</dd></div>}
            </dl>
          )}
        </div>
      )}
    </div>
  );
}

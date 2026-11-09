import { useEffect, useState } from "react";
import ShortsReportSheet from "./ShortsReportSheet";
import ShortsBlockedSheet from "./ShortsBlockedSheet";
import { useFreshId } from "../../fresh-id/context/FreshIdContext";
import { setAuthorFollow } from "../core/social";
import { formatCount, loadCreatorProfile, requestOpenShort, type CreatorProfileData } from "../core/shortsExplore";
import { addShortToPlaylist, createShortPlaylist, loadCreatorPlaylists, loadMyShortPlaylists, loadPlaylistShorts, type FreshShortPlaylist } from "../core/shortsPlaylists";
import "./ShortsCreatorProfile.css";

type Tab = "shorts" | "playlists" | "about";
type PlaylistShort = { id: string; caption: string; videoUrl: string; viewCount: number; createdAt: string };

type Props = {
  authorId: string;
  onClose: () => void;
  onOpenShort: (shortId: string) => void;
  onMessage?: (authorId: string) => void;
  onSignIn?: () => void;
};

/** Creator profile with persisted public playlists and owner-only playlist management. */
export default function ShortsCreatorProfile({ authorId, onClose, onOpenShort, onMessage, onSignIn }: Props) {
  const { user, isGuest } = useFreshId();
  const [data, setData] = useState<CreatorProfileData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("shorts");
  const [busy, setBusy] = useState(false);
  const [playlists, setPlaylists] = useState<FreshShortPlaylist[]>([]);
  const [playlistShorts, setPlaylistShorts] = useState<Record<string, PlaylistShort[]>>({});
  const [playlistTitle, setPlaylistTitle] = useState("");
  const [playlistDescription, setPlaylistDescription] = useState("");
  const [playlistBusy, setPlaylistBusy] = useState(false);
  const [addToPlaylist, setAddToPlaylist] = useState<Record<string, string>>({});
  const [playlistNotice, setPlaylistNotice] = useState<string | null>(null);
  const [reporting, setReporting] = useState(false);
  const [blocking, setBlocking] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setData(null); setError(null);
    loadCreatorProfile(authorId, user?.id ?? null).then((result) => { if (!cancelled) setData(result); }).catch((cause) => { if (!cancelled) setError(cause instanceof Error ? cause.message : "Could not load this creator."); });
    return () => { cancelled = true; };
  }, [authorId, user?.id]);

  const isSelf = Boolean(user && user.id === authorId && !isGuest);

  useEffect(() => {
    if (tab !== "playlists") return;
    let cancelled = false;
    const load = isSelf ? loadMyShortPlaylists(authorId) : loadCreatorPlaylists(authorId);
    load.then(async (items) => {
      const entries = await Promise.all(items.map(async (playlist) => [playlist.id, await loadPlaylistShorts(playlist.shortIds)] as const));
      if (!cancelled) {
        setPlaylists(items);
        setPlaylistShorts(Object.fromEntries(entries));
      }
    }).catch((cause) => {
      if (!cancelled) setPlaylistNotice(cause instanceof Error ? cause.message : "Playlists could not be loaded.");
    });
    return () => { cancelled = true; };
  }, [authorId, isSelf, tab]);

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

  const createPlaylist = async () => {
    if (!user || !isSelf) return;
    setPlaylistBusy(true); setPlaylistNotice(null);
    try {
      await createShortPlaylist(user.id, playlistTitle, playlistDescription);
      setPlaylistTitle(""); setPlaylistDescription("");
      setPlaylists(await loadMyShortPlaylists(user.id));
      setPlaylistNotice("Public playlist created.");
    } catch (cause) {
      setPlaylistNotice(cause instanceof Error ? cause.message : "Could not create playlist.");
    } finally { setPlaylistBusy(false); }
  };

  const addShort = async (shortId: string) => {
    const playlistId = addToPlaylist[shortId];
    const playlist = playlists.find((item) => item.id === playlistId);
    if (!playlistId || !playlist) return;
    try {
      await addShortToPlaylist(playlistId, shortId, playlist.shortIds.length);
      const [updated] = await loadPlaylistShorts([...playlist.shortIds.filter((id) => id !== shortId), shortId]);
      setPlaylists((items) => items.map((item) => item.id === playlistId ? { ...item, shortIds: [...item.shortIds.filter((id) => id !== shortId), shortId] } : item));
      if (updated) setPlaylistShorts((current) => ({ ...current, [playlistId]: [...(current[playlistId] ?? []).filter((item) => item.id !== shortId), updated] }));
      setPlaylistNotice("Short added to playlist.");
    } catch (cause) {
      setPlaylistNotice(cause instanceof Error ? cause.message : "Could not add this Short.");
    }
  };

  const openShort = (shortId: string) => { requestOpenShort(shortId); onOpenShort(shortId); };

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
              {!isSelf ? <button type="button" onClick={() => { if (!user || isGuest) { onSignIn?.(); return; } setReporting(true); }}>Report</button> : null}
              {!isSelf ? <button type="button" onClick={() => { if (!user || isGuest) { onSignIn?.(); return; } setBlocking(true); }}>Block</button> : null}
            </div>
          )}
          <nav className="shorts-profile-tabs" aria-label="Creator sections">
            {(["shorts", "playlists", "about"] as Tab[]).map((id) => (
              <button key={id} type="button" className={tab === id ? "active" : ""} aria-pressed={tab === id} onClick={() => { setTab(id); setPlaylistNotice(null); }}>{id === "shorts" ? "Shorts" : id === "playlists" ? "Playlists" : "About"}</button>
            ))}
          </nav>
          {tab === "shorts" && (data.shorts.length === 0 ? <p className="shorts-profile-note">No Shorts yet.</p> : (
            <ul className="shorts-profile-grid">
              {data.shorts.map((short) => (
                <li key={short.id}>
                  <button type="button" onClick={() => openShort(short.id)} aria-label={`Open Short: ${short.caption || "Fresh Short"}`}>
                    <video src={`${short.videoUrl}#t=0.5`} muted playsInline preload="metadata" />
                    <span>▷ {formatCount(short.viewCount)}</span>
                  </button>
                  {isSelf && playlists.length > 0 && (
                    <div className="shorts-profile-add-row">
                      <select aria-label="Choose playlist" value={addToPlaylist[short.id] ?? ""} onChange={(event) => setAddToPlaylist((current) => ({ ...current, [short.id]: event.target.value }))}>
                        <option value="">Add to playlist…</option>
                        {playlists.map((playlist) => <option key={playlist.id} value={playlist.id}>{playlist.title}</option>)}
                      </select>
                      <button type="button" onClick={() => void addShort(short.id)} disabled={!addToPlaylist[short.id]}>Add</button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          ))}
          {tab === "playlists" && (
            <section className="shorts-profile-playlists" aria-label="Creator playlists">
              {isSelf && (
                <form className="shorts-profile-playlist-form" onSubmit={(event) => { event.preventDefault(); void createPlaylist(); }}>
                  <h3>Create a playlist</h3>
                  <input value={playlistTitle} onChange={(event) => setPlaylistTitle(event.target.value)} placeholder="Playlist name" maxLength={80} required aria-label="Playlist name" />
                  <textarea value={playlistDescription} onChange={(event) => setPlaylistDescription(event.target.value)} placeholder="Description (optional)" maxLength={500} rows={2} aria-label="Playlist description" />
                  <button type="submit" disabled={playlistBusy || !playlistTitle.trim()}>{playlistBusy ? "Creating…" : "Create public playlist"}</button>
                </form>
              )}
              {playlistNotice && <p className="shorts-profile-note" role="status">{playlistNotice}</p>}
              {!playlists.length && <p className="shorts-profile-note">{isSelf ? "Create your first playlist, then add Shorts from the Shorts tab." : "This creator hasn't published any playlists yet."}</p>}
              {playlists.map((playlist) => (
                <section className="shorts-profile-playlist" key={playlist.id}>
                  <header><div><h3>{playlist.title}</h3>{playlist.description && <p>{playlist.description}</p>}</div><span>{(playlistShorts[playlist.id] ?? []).length} Shorts</span></header>
                  {!playlistShorts[playlist.id]?.length ? <p className="shorts-profile-note">No Shorts in this playlist yet.</p> : (
                    <ul className="shorts-profile-grid">
                      {playlistShorts[playlist.id].map((short) => <li key={short.id}><button type="button" onClick={() => openShort(short.id)} aria-label={`Play ${short.caption || "Short"}`}><video src={`${short.videoUrl}#t=0.5`} muted playsInline preload="metadata"/><span>▷ {formatCount(short.viewCount)}</span></button></li>)}
                    </ul>
                  )}
                </section>
              ))}
            </section>
          )}
          {tab === "about" && (
            <dl className="shorts-profile-about">
              <div><dt>Shorts</dt><dd>{data.shorts.length}</dd></div>
              <div><dt>Total views</dt><dd>{formatCount(data.totalViews)}</dd></div>
              {data.joinedAt && <div><dt>Joined Fresh</dt><dd>{new Date(data.joinedAt).toLocaleDateString(undefined, { year: "numeric", month: "long" })}</dd></div>}
            </dl>
          )}
        </div>
      )}
      {blocking && user && !isGuest ? <ShortsBlockedSheet userId={user.id} target={{ id: authorId, name: data?.username ? `@${data.username}` : data?.fullName || "this account" }} onClose={() => setBlocking(false)} onChanged={(_, blocked) => { if (blocked) onClose(); }} /> : null}
      {reporting && user && !isGuest ? <ShortsReportSheet targetType="profile" targetId={authorId} userId={user.id} onClose={() => setReporting(false)} /> : null}
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import {
  addShortToCollection,
  createShortCollection,
  loadCollectionCovers,
  loadMyShortCollections,
  inviteToCollection,
  loadSharedCollections,
  type FreshShortPlaylist,
} from "../core/shortsPlaylists";
import ShortThumbnail from "./ShortThumbnail";
import { GlobeIcon, LockIcon } from "./shortsIcons";
import "./shortsContextPanel.css";

type Props = { userId: string; shortId: string; onClose: () => void };

/** Viewer-owned collections. Visibility is enforced by the fresh_short_collections RLS policies. */
export default function ShortsCollectionsSheet({ userId, shortId, onClose }: Props) {
  const [collections, setCollections] = useState<FreshShortPlaylist[] | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<"private" | "public">("private");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [inviteFor, setInviteFor] = useState<string | null>(null);
  const [inviteName, setInviteName] = useState("");
  const [tab, setTab] = useState<"mine" | "shared">("mine");
  const [covers, setCovers] = useState<Record<string, string>>({});
  const [shared, setShared] = useState<{ available: boolean; collections: FreshShortPlaylist[] } | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    closeRef.current?.focus();
    let cancelled = false;
    loadMyShortCollections(userId)
      .then((rows) => { if (!cancelled) { setCollections(rows); void loadCollectionCovers(rows).then((found) => { if (!cancelled) setCovers(found); }); } })
      .catch((cause) => { if (!cancelled) setError(cause instanceof Error ? cause.message : "Your collections could not be loaded."); });
    void loadSharedCollections(userId).then((result) => { if (!cancelled) setShared(result); });
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => { cancelled = true; window.removeEventListener("keydown", onKey); };
  }, [userId, onClose]);

  async function sendInvite(collection: FreshShortPlaylist) {
    if (busy) return;
    setBusy(true); setError(null); setNotice(null);
    const result = await inviteToCollection(collection.id, userId, inviteName);
    setBusy(false);
    if (result.ok) { setNotice(`Shared "${collection.title}" with ${result.name}. They can watch it but not change it.`); setInviteFor(null); setInviteName(""); }
    else setError(result.reason);
  }

  async function addToCollection(collection: FreshShortPlaylist) {
    if (collection.shortIds.includes(shortId)) {
      setNotice("This Short is already in that collection.");
      return;
    }
    setBusy(true); setError(null); setNotice(null);
    try {
      await addShortToCollection(collection.id, shortId, collection.shortIds.length);
      setCollections((current) => (current ?? []).map((item) => item.id === collection.id ? { ...item, shortIds: [...item.shortIds, shortId] } : item));
      setNotice(`Added to “${collection.title}”.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "This Short could not be added.");
    } finally { setBusy(false); }
  }

  async function createCollection(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError(null); setNotice(null);
    try {
      const id = await createShortCollection(userId, title, description, visibility);
      await addShortToCollection(id, shortId, 0);
      const rows = await loadMyShortCollections(userId);
      setCollections(rows);
      setTitle(""); setDescription("");
      setNotice(`Collection created and Short added. It is ${visibility}.`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The collection could not be created.");
    } finally { setBusy(false); }
  }

  return (
    <div className="shorts-sheet-backdrop" onClick={onClose}>
      <section className="shorts-sheet shorts-collections-sheet" role="dialog" aria-modal="true" aria-label="Add Short to a collection" onClick={(event) => event.stopPropagation()}>
        <div className="shorts-sheet-header">
          <h3>My Collections</h3>
          <button ref={closeRef} type="button" className="shorts-sheet-close" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <p className="shorts-why-note">Organize this Short in a collection you own. Private collections are only visible to you; public collections can appear on your creator profile.</p>
        <div className="shorts-collection-tabs" role="tablist" aria-label="Collections">
          <button type="button" role="tab" aria-selected={tab === "mine"} className={tab === "mine" ? "active" : ""} onClick={() => setTab("mine")}>My Collections</button>
          <button type="button" role="tab" aria-selected={tab === "shared"} className={tab === "shared" ? "active" : ""} onClick={() => setTab("shared")}>Shared with you{shared?.collections.length ? ` (${shared.collections.length})` : ""}</button>
        </div>
        {tab === "shared" ? (
          shared === null ? <p>Loading…</p>
          : !shared.available ? <p className="shorts-collection-empty">Shared collections are not switched on yet. When they are, collections friends share with you will show here.</p>
          : shared.collections.length === 0 ? <p className="shorts-collection-empty">Nothing has been shared with you yet.</p>
          : (
            <ul className="shorts-collection-list shorts-collection-grid">
              {shared.collections.map((collection) => (
                <li key={collection.id}><div><strong>{collection.title}</strong><span>{collection.shortIds.length} {collection.shortIds.length === 1 ? "Short" : "Shorts"}</span></div></li>
              ))}
            </ul>
          )
        ) : null}
        <form hidden={tab !== "mine"} className="shorts-collection-create" onSubmit={(event) => void createCollection(event)}>
          <label>Collection name
            <input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={80} required placeholder="e.g. Learn & Grow" />
          </label>
          <label>Description (optional)
            <textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={500} rows={2} placeholder="What are these Shorts about?" />
          </label>
          <label>Visibility
            <select value={visibility} onChange={(event) => setVisibility(event.target.value as "private" | "public")}>
              <option value="private">Private — only me</option>
              <option value="public">Public — visible on my profile</option>
            </select>
          </label>
          <button type="submit" disabled={busy || !title.trim()}>{busy ? "Saving…" : "Create collection and add Short"}</button>
        </form>
        <h4 hidden={tab !== "mine"}>Your collections</h4>
        {error ? <p role="alert">{error}</p> : null}
        {collections === null && !error ? <p>Loading collections…</p> : null}
        {collections?.length === 0 ? <p>You have no collections yet. Create one above.</p> : null}
        {tab === "mine" && collections?.length ? (
          <div className="shorts-collection-groups">
            {(["public", "private"] as const).map((group) => {
              const groupCollections = collections.filter((collection) => collection.visibility === group);
              if (!groupCollections.length) return null;
              const isPublic = group === "public";
              return (
                <section className="shorts-collection-group" data-visibility={group} key={group} aria-label={isPublic ? "Public collections" : "Private collections"}>
                  <div className="shorts-collection-group-heading">
                    <div><strong>{isPublic ? "Public collections" : "Private collections"}</strong><span>{isPublic ? "Visible on your profile" : "Only visible to you"}</span></div>
                    <span>{groupCollections.length}</span>
                  </div>
                  <ul className="shorts-collection-list">
                    {groupCollections.map((collection) => (
                      <li key={collection.id} data-visibility={collection.visibility}>
                        {covers[collection.id] ? <ShortThumbnail videoUrl={covers[collection.id]} showDuration={false} className="shorts-collection-cover" /> : <span className="shorts-collection-cover shorts-collection-cover-empty" aria-hidden="true">{collection.visibility === "public" ? <GlobeIcon size={20} /> : <LockIcon size={20} />}</span>}
                        <div>
                          <strong>{collection.title}</strong>
                          <span>{collection.visibility === "public" ? <GlobeIcon size={13} /> : <LockIcon size={13} />} {collection.visibility === "public" ? "Public" : "Private"} · {collection.shortIds.length} {collection.shortIds.length === 1 ? "Short" : "Shorts"}</span>
                        </div>
                        <button type="button" disabled={busy || collection.shortIds.includes(shortId)} onClick={() => void addToCollection(collection)}>
                          {collection.shortIds.includes(shortId) ? "Added" : "Add"}
                        </button>
                        <button type="button" className="shorts-collection-invite-toggle" aria-expanded={inviteFor === collection.id} onClick={() => { setInviteFor(inviteFor === collection.id ? null : collection.id); setError(null); }}>Share</button>
                        {inviteFor === collection.id ? (
                          <form className="shorts-collection-invite" onSubmit={(event) => { event.preventDefault(); void sendInvite(collection); }}>
                            <label>Share with a person<input value={inviteName} onChange={(event) => setInviteName(event.target.value)} placeholder="@username" autoCapitalize="none" autoCorrect="off" maxLength={40} /></label>
                            <button type="submit" disabled={busy || !inviteName.trim()}>Send</button>
                          </form>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        ) : null}
        {notice ? <p role="status">{notice}</p> : null}
        <aside className="shorts-collection-promo"><strong>Create. Share. Learn.</strong><span>Group Shorts by topic, keep them private or show them on your profile.</span></aside>
      </section>
    </div>
  );
}

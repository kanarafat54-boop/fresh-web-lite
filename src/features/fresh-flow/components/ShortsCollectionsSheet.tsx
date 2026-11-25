import { useEffect, useRef, useState } from "react";
import {
  addShortToCollection,
  createShortCollection,
  loadMyShortCollections,
  type FreshShortPlaylist,
} from "../core/shortsPlaylists";
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
  const closeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    closeRef.current?.focus();
    let cancelled = false;
    loadMyShortCollections(userId)
      .then((rows) => { if (!cancelled) setCollections(rows); })
      .catch((cause) => { if (!cancelled) setError(cause instanceof Error ? cause.message : "Your collections could not be loaded."); });
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => { cancelled = true; window.removeEventListener("keydown", onKey); };
  }, [userId, onClose]);

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
        <form className="shorts-collection-create" onSubmit={(event) => void createCollection(event)}>
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
        <h4>Your collections</h4>
        {error ? <p role="alert">{error}</p> : null}
        {collections === null && !error ? <p>Loading collections…</p> : null}
        {collections?.length === 0 ? <p>You have no collections yet. Create one above.</p> : null}
        {collections?.length ? (
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
                        <div>
                          <strong>{collection.title}</strong>
                          <span>{collection.shortIds.length} {collection.shortIds.length === 1 ? "Short" : "Shorts"}</span>
                        </div>
                        <button type="button" disabled={busy || collection.shortIds.includes(shortId)} onClick={() => void addToCollection(collection)}>
                          {collection.shortIds.includes(shortId) ? "Added" : "Add"}
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        ) : null}
        {notice ? <p role="status">{notice}</p> : null}
      </section>
    </div>
  );
}

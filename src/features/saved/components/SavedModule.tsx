/**
 * Fresh Web Lite
 * Saved Module — shows the user's saved posts and shorts
 */

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { useFreshId } from "../../fresh-id/context/FreshIdContext";
import { useLayout } from "../../../app/contexts/useLayout";

interface SavedPostItem {
  id: string;
  authorName: string;
  authorUsername: string;
  content: string;
  imageUrl: string | null;
  createdAt: string;
}

interface SavedShortItem {
  id: string;
  authorName: string;
  authorUsername: string;
  caption: string;
  videoUrl: string;
  createdAt: string;
}

export function SavedModule() {
  const { user, isGuest, setAuthView } = useFreshId();
  const { setActiveRoute } = useLayout();
  const [tab, setTab] = useState<"posts" | "shorts">("posts");
  const [savedPosts, setSavedPosts] = useState<SavedPostItem[]>([]);
  const [savedShorts, setSavedShorts] = useState<SavedShortItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user && !isGuest) loadSaved();
    else setLoading(false);
  }, [user, isGuest]);

  async function loadSaved() {
    setLoading(true);
    setError(null);

    const { data: savedPostRows, error: postsErr } = await supabase
      .from("saved_posts")
      .select("post_id")
      .eq("user_id", user!.id);

    if (postsErr) {
      setError(`Couldn't load saved posts: ${postsErr.message}`);
      setLoading(false);
      return;
    }

    const postIds = (savedPostRows ?? []).map((r: { post_id: string }) => r.post_id);

    if (postIds.length > 0) {
      const { data: postsData } = await supabase
        .from("posts")
        .select("id, author_id, content, image_url, created_at")
        .in("id", postIds);

      const authorIds = [...new Set((postsData ?? []).map((p: { author_id: string }) => p.author_id))];
      const { data: profilesData } = await supabase
        .from("users")
        .select("id, full_name, username")
        .in("id", authorIds);
      const profileMap = new Map(
        (profilesData ?? []).map((u: { id: string; full_name?: string; username?: string }) => [u.id, u]),
      );

      setSavedPosts(
        (postsData ?? []).map(
          (p: { id: string; author_id: string; content: string; image_url: string | null; created_at: string }) => {
            const profile = profileMap.get(p.author_id);
            return {
              id: p.id,
              authorName: profile?.full_name ?? "Unknown",
              authorUsername: profile?.username ?? "unknown",
              content: p.content,
              imageUrl: p.image_url,
              createdAt: p.created_at,
            };
          },
        ),
      );
    } else {
      setSavedPosts([]);
    }

    const { data: savedShortRows, error: shortsErr } = await supabase
      .from("saved_shorts")
      .select("short_id")
      .eq("user_id", user!.id);

    if (shortsErr) {
      setError(`Couldn't load saved shorts: ${shortsErr.message}`);
      setLoading(false);
      return;
    }

    const shortIds = (savedShortRows ?? []).map((r: { short_id: string }) => r.short_id);

    if (shortIds.length > 0) {
      const { data: shortsData } = await supabase
        .from("shorts")
        .select("id, author_id, caption, video_url, created_at")
        .in("id", shortIds);

      const authorIds = [...new Set((shortsData ?? []).map((s: { author_id: string }) => s.author_id))];
      const { data: profilesData } = await supabase
        .from("users")
        .select("id, full_name, username")
        .in("id", authorIds);
      const profileMap = new Map(
        (profilesData ?? []).map((u: { id: string; full_name?: string; username?: string }) => [u.id, u]),
      );

      setSavedShorts(
        (shortsData ?? []).map(
          (s: { id: string; author_id: string; caption: string | null; video_url: string; created_at: string }) => {
            const profile = profileMap.get(s.author_id);
            return {
              id: s.id,
              authorName: profile?.full_name ?? "Unknown",
              authorUsername: profile?.username ?? "unknown",
              caption: s.caption ?? "",
              videoUrl: s.video_url,
              createdAt: s.created_at,
            };
          },
        ),
      );
    } else {
      setSavedShorts([]);
    }

    setLoading(false);
  }

  async function unsavePost(postId: string) {
    await supabase.from("saved_posts").delete().eq("post_id", postId).eq("user_id", user!.id);
    loadSaved();
  }

  async function unsaveShort(shortId: string) {
    await supabase.from("saved_shorts").delete().eq("short_id", shortId).eq("user_id", user!.id);
    loadSaved();
  }

  if (isGuest || !user) {
    return (
      <div className="module">
        <h2>Saved</h2>
        <p className="empty-state">Sign in with a Fresh ID account to save posts and shorts across devices.</p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
          <button
            type="button"
            className="nav-btn active"
            onClick={() => {
              setAuthView("form");
              setActiveRoute("auth-signin");
            }}
          >
            Sign in
          </button>
          <button type="button" className="nav-btn" onClick={() => setActiveRoute("fresh-flow")}>
            Explore Flow
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="module">
      <h2>Saved</h2>

      <div className="app-nav" style={{ marginBottom: 12 }}>
        <button className={tab === "posts" ? "nav-btn active" : "nav-btn"} onClick={() => setTab("posts")}>
          Posts
        </button>
        <button className={tab === "shorts" ? "nav-btn active" : "nav-btn"} onClick={() => setTab("shorts")}>
          Shorts
        </button>
      </div>

      {error && (
        <div role="alert" className="auth-error" style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <span>{error}</span>
          <button type="button" className="reply-btn" onClick={() => void loadSaved()}>
            Retry
          </button>
        </div>
      )}
      {loading && <p className="empty-state">Loading saved items…</p>}

      {!loading && tab === "posts" && (
        <ul className="notes-list">
          {savedPosts.length === 0 && (
            <p className="empty-state">No saved posts yet. Save from Fresh Flow to collect them here.</p>
          )}
          {savedPosts.map((p) => (
            <li key={p.id} className="post-item">
              <div className="post-header">
                <span className="post-author">{p.authorName}</span>
                <span className="post-username">@{p.authorUsername}</span>
              </div>
              {p.content && <p className="post-content">{p.content}</p>}
              {p.imageUrl && <img src={p.imageUrl} alt="Saved post" className="post-image" />}
              <button className="delete-note-btn" type="button" onClick={() => void unsavePost(p.id)}>
                Unsave
              </button>
            </li>
          ))}
        </ul>
      )}

      {!loading && tab === "shorts" && (
        <ul className="notes-list">
          {savedShorts.length === 0 && (
            <p className="empty-state">No saved shorts yet. Save from Fresh Flow to collect them here.</p>
          )}
          {savedShorts.map((s) => (
            <li key={s.id} className="post-item">
              <div className="post-header">
                <span className="post-author">{s.authorName}</span>
                <span className="post-username">@{s.authorUsername}</span>
              </div>
              <video src={s.videoUrl} controls className="post-image" />
              {s.caption && <p className="post-content">{s.caption}</p>}
              <button className="delete-note-btn" type="button" onClick={() => void unsaveShort(s.id)}>
                Unsave
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default SavedModule;

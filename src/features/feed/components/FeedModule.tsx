/**
 * Fresh Web Lite
 * Social Feed Module
 */

import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { useFreshId } from "../../fresh-id/context/FreshIdContext";
import type { Post } from "../types/post";

export function FeedModule() {
  const { user, isGuest } = useFreshId();
  const [posts, setPosts] = useState<Post[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPosts();
  }, []);

  async function loadPosts() {
    setLoading(true);
    setError(null);

    const { data: postsData, error: postsError } = await supabase
      .from("posts")
      .select("id, author_id, content, like_count, comment_count, created_at")
      .order("created_at", { ascending: false })
      .limit(50);

    if (postsError) {
      setError(`Couldn't load the feed: ${postsError.message}`);
      setLoading(false);
      return;
    }

    const authorIds = [...new Set((postsData ?? []).map((p: any) => p.author_id))];

    let profileMap = new Map<string, { full_name: string; username: string }>();
    if (authorIds.length > 0) {
      const { data: profilesData, error: profilesError } = await supabase
        .from("users")
        .select("id, full_name, username")
        .in("id", authorIds);

      if (profilesError) {
        setError(`Couldn't load author profiles: ${profilesError.message}`);
        setLoading(false);
        return;
      }

      profileMap = new Map((profilesData ?? []).map((u: any) => [u.id, u]));
    }

    let likedIds = new Set<string>();
    if (user && !isGuest) {
      const { data: likesData } = await supabase
        .from("post_likes")
        .select("post_id")
        .eq("user_id", user.id);
      likedIds = new Set((likesData ?? []).map((l: any) => l.post_id));
    }

    const mapped: Post[] = (postsData ?? []).map((p: any) => {
      const profile = profileMap.get(p.author_id);
      return {
        id: p.id,
        authorId: p.author_id,
        authorName: profile?.full_name ?? "Unknown",
        authorUsername: profile?.username ?? "unknown",
        content: p.content,
        likeCount: p.like_count,
        commentCount: p.comment_count,
        likedByMe: likedIds.has(p.id),
        createdAt: p.created_at,
      };
    });

    setPosts(mapped);
    setLoading(false);
  }

  async function addPost() {
    if (!draft.trim() || !user || isGuest) return;

    const { error: insertError } = await supabase.from("posts").insert({
      author_id: user.id,
      content: draft.trim(),
    });

    if (insertError) {
      setError(`Couldn't post: ${insertError.message}`);
      return;
    }

    setDraft("");
    loadPosts();
  }

  async function toggleLike(post: Post) {
    if (!user || isGuest) return;

    if (post.likedByMe) {
      await supabase.from("post_likes").delete().eq("post_id", post.id).eq("user_id", user.id);
    } else {
      await supabase.from("post_likes").insert({ post_id: post.id, user_id: user.id });
    }

    loadPosts();
  }

  function timeAgo(iso: string) {
    const diffMs = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  }

  return (
    <div className="module">
      <h2>Feed</h2>

      {isGuest && (
        <p className="empty-state">Register a real account to post and like content.</p>
      )}

      {!isGuest && user && (
        <div className="note-input-row">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="What's on your mind?"
            className="note-input"
          />
          <button className="add-note-btn" onClick={addPost}>Post</button>
        </div>
      )}

      {error && <p className="auth-error">{error}</p>}
      {loading && <p className="empty-state">Loading feed...</p>}
      {!loading && posts.length === 0 && <p className="empty-state">No posts yet. Be the first.</p>}

      <ul className="notes-list">
        {posts.map((p) => (
          <li key={p.id} className="post-item">
            <div className="post-header">
              <span className="post-author">{p.authorName}</span>
              <span className="post-username">@{p.authorUsername}</span>
              <span className="post-time">{timeAgo(p.createdAt)}</span>
            </div>
            <p className="post-content">{p.content}</p>
            <div className="post-actions">
              <button
                className={p.likedByMe ? "like-btn liked" : "like-btn"}
                onClick={() => toggleLike(p)}
                disabled={isGuest}
              >
                ♥ {p.likeCount}
              </button>
              <span className="post-comment-count">{p.commentCount} comments</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

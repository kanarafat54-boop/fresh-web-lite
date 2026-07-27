/**
 * Fresh Web Lite
 * Social Feed Module
 */

import { useEffect, useRef, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { useFreshId } from "../../fresh-id/context/FreshIdContext";
import { CommentPanel } from "../../comments/components/CommentPanel";
import { ReactionPicker } from "../../reactions/components/ReactionPicker";
import { CameraIcon, CommentIcon, BookmarkIcon, ShareIcon } from "../../../components/Icons";
import { ShareSheet } from "../../share/components/ShareSheet";
import { PostMenu } from "../../moderation/components/PostMenu";
import { useProfileNav } from "../../profile/context/ProfileNavContext";
import type { Post } from "../types/post";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export function FeedModule() {
  const { user, isGuest } = useFreshId();
  const { openProfile } = useProfileNav();
  const [posts, setPosts] = useState<Post[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [draft, setDraft] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openCommentsFor, setOpenCommentsFor] = useState<string | null>(null);
  const [shareTarget, setShareTarget] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadPosts();
  }, []);

  async function loadPosts() {
    setLoading(true);
    setError(null);

    const { data: postsData, error: postsError } = await supabase
      .from("posts")
      .select("id, author_id, content, image_url, like_count, comment_count, created_at")
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

    let reactionMap = new Map<string, string>();
    let savedPostIds = new Set<string>();
    if (user && !isGuest) {
      const { data: likesData } = await supabase
        .from("post_likes")
        .select("post_id, reaction_type")
        .eq("user_id", user.id);
      reactionMap = new Map((likesData ?? []).map((l: any) => [l.post_id, l.reaction_type]));

      const { data: savedData } = await supabase
        .from("saved_posts")
        .select("post_id")
        .eq("user_id", user.id);
      savedPostIds = new Set((savedData ?? []).map((s: any) => s.post_id));
    }

    const mapped: Post[] = (postsData ?? []).map((p: any) => {
      const profile = profileMap.get(p.author_id);
      return {
        id: p.id,
        authorId: p.author_id,
        authorName: profile?.full_name ?? "Unknown",
        authorUsername: profile?.username ?? "unknown",
        content: p.content,
        imageUrl: p.image_url,
        likeCount: p.like_count,
        commentCount: p.comment_count,
        myReaction: reactionMap.get(p.id) ?? null,
        createdAt: p.created_at,
      };
    });

    setPosts(mapped);
    setSavedIds(savedPostIds);
    setLoading(false);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("Please choose a JPEG, PNG, WEBP, or GIF image.");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setError("Image must be under 5MB.");
      return;
    }

    setError(null);
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  function clearImageSelection() {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function addPost() {
    if ((!draft.trim() && !imageFile) || !user || isGuest) return;

    setUploading(true);
    setError(null);

    let imageUrl: string | null = null;

    if (imageFile) {
      const ext = imageFile.name.split(".").pop();
      const path = `${user.id}/${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("post-images")
        .upload(path, imageFile);

      if (uploadError) {
        setError(`Image upload failed: ${uploadError.message}`);
        setUploading(false);
        return;
      }

      const { data: publicUrlData } = supabase.storage.from("post-images").getPublicUrl(path);
      imageUrl = publicUrlData.publicUrl;
    }

    const { error: insertError } = await supabase.from("posts").insert({
      author_id: user.id,
      content: draft.trim(),
      image_url: imageUrl,
    });

    if (insertError) {
      setError(`Couldn't post: ${insertError.message}`);
      setUploading(false);
      return;
    }

    setDraft("");
    clearImageSelection();
    setUploading(false);
    loadPosts();
  }

  async function reactToPost(post: Post, type: string) {
    if (!user || isGuest) return;

    if (post.myReaction === type) {
      await supabase.from("post_likes").delete().eq("post_id", post.id).eq("user_id", user.id);
    } else if (post.myReaction) {
      await supabase
        .from("post_likes")
        .update({ reaction_type: type })
        .eq("post_id", post.id)
        .eq("user_id", user.id);
    } else {
      await supabase.from("post_likes").insert({ post_id: post.id, user_id: user.id, reaction_type: type });
    }

    loadPosts();
  }

  async function toggleSave(postId: string) {
    if (!user || isGuest) return;

    if (savedIds.has(postId)) {
      await supabase.from("saved_posts").delete().eq("post_id", postId).eq("user_id", user.id);
    } else {
      await supabase.from("saved_posts").insert({ post_id: postId, user_id: user.id });
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
        <p className="empty-state">Register a real account to post and react to content.</p>
      )}

      {!isGuest && user && (
        <div className="post-composer">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="What's on your mind?"
            className="note-input"
          />

          {imagePreview && (
            <div className="image-preview-wrap">
              <img src={imagePreview} alt="Selected" className="image-preview" />
              <button className="remove-image-btn" onClick={clearImageSelection}>Remove</button>
            </div>
          )}

          <div className="composer-actions">
            <label className="icon-btn-outline">
              <CameraIcon size={18} />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                style={{ display: "none" }}
              />
            </label>
            <button className="add-note-btn" onClick={addPost} disabled={uploading}>
              {uploading ? "Posting..." : "Post"}
            </button>
          </div>
        </div>
      )}

      {error && <p className="auth-error">{error}</p>}
      {loading && <p className="empty-state">Loading feed...</p>}
      {!loading && posts.length === 0 && <p className="empty-state">No posts yet. Be the first.</p>}

      <ul className="notes-list">
        {posts.map((p) => (
          <li key={p.id} className="post-item">
            <div className="post-header">
              <span className="post-author" onClick={() => openProfile(p.authorId)} style={{ cursor: "pointer" }}>{p.authorName}</span>
              <span className="post-username">@{p.authorUsername}</span>
              <span className="post-time">{timeAgo(p.createdAt)}</span>
              <span style={{ marginLeft: "auto" }}>
                <PostMenu targetType="post" targetId={p.id} onHide={() => setPosts((prev) => prev.filter((x) => x.id !== p.id))} />
              </span>
            </div>
            {p.content && <p className="post-content">{p.content}</p>}
            {p.imageUrl && (
              <img src={p.imageUrl} alt="Post attachment" className="post-image" />
            )}
            <div className="post-actions">
              <ReactionPicker
                myReaction={p.myReaction}
                count={p.likeCount}
                disabled={isGuest}
                onReact={(type) => reactToPost(p, type)}
              />
              <button
                className="like-btn"
                onClick={() => setOpenCommentsFor(p.id)}
              >
                <CommentIcon size={18} /> {p.commentCount}
              </button>
              <button
                className={savedIds.has(p.id) ? "like-btn liked" : "like-btn"}
                onClick={() => toggleSave(p.id)}
                disabled={isGuest}
              >
                <BookmarkIcon size={18} filled={savedIds.has(p.id)} />
              </button>
              <button className="like-btn" onClick={() => setShareTarget(p.content || "Check this out")}>
                <ShareIcon size={18} />
              </button>
            </div>
          </li>
        ))}
      </ul>

      {openCommentsFor && (
        <CommentPanel
          targetType="post"
          targetId={openCommentsFor}
          onClose={() => {
            setOpenCommentsFor(null);
            loadPosts();
          }}
        />
      )}

      {shareTarget && (
        <ShareSheet title={shareTarget} onClose={() => setShareTarget(null)} />
      )}
    </div>
  );
}

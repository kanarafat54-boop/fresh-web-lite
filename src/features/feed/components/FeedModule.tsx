import "./feed.css";
/* eslint-disable @typescript-eslint/no-explicit-any */
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
import { applyDiscoveryFilter, type DiscoverablePost } from "../../fresh-flow/core/applyDiscoveryFilter";
import { getSocialAuthorIds } from "../../fresh-flow/core/social";
import { fetchFreshFlowPage, FRESH_FLOW_PAGE_SIZE } from "../../fresh-flow/core/freshFlowPagination";
import { useFreshFlowRuntime } from "../../fresh-flow/core/useFreshFlowRuntime";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

type FeedModuleProps = {
  /** Layer B discovery from Fresh Flow News/Posts (optional; standalone feed ignores). */
  discoveryId?: string;
};

export function FeedModule({ discoveryId }: FeedModuleProps = {}) {
  const { user, isGuest } = useFreshId();
  const { openProfile } = useProfileNav();
  const [posts, setPosts] = useState<Post[]>([]);
  const [sharedPostId, setSharedPostId] = useState<string | null>(() =>
    typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("post") : null,
  );
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [draft, setDraft] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [feedCursor, setFeedCursor] = useState<string | null>(null);
  const [hasMorePosts, setHasMorePosts] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openCommentsFor, setOpenCommentsFor] = useState<string | null>(null);
  const [shareTarget, setShareTarget] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const requestGenerationRef = useRef(0);
  const appendLockRef = useRef<symbol | null>(null);
  const prefetchBlockedCursorRef = useRef<string | null>(null);
  const { state: runtimeState, replaceQueue, appendQueue, beginAppend, endAppend, setActive: setRuntimeActive, shouldPrefetch } = useFreshFlowRuntime();

  useEffect(() => {
    const requestId = ++requestGenerationRef.current;
    appendLockRef.current = null;
    prefetchBlockedCursorRef.current = null;
    void loadPosts({ requestId });
    return () => {
      if (requestGenerationRef.current === requestId) requestGenerationRef.current += 1;
      appendLockRef.current = null;
      prefetchBlockedCursorRef.current = null;
    };
  }, [discoveryId, user?.id, isGuest, sharedPostId]);

  useEffect(() => {
    if (!shouldPrefetch || loadingMore || runtimeState.loadingMore || !hasMorePosts || prefetchBlockedCursorRef.current === feedCursor) return;
    void loadPosts({ append: true });
  }, [shouldPrefetch, loadingMore, runtimeState.loadingMore, hasMorePosts, feedCursor]);

  async function loadPosts(options: { append?: boolean; manual?: boolean; requestId?: number } = {}) {
    const append = Boolean(options.append);
    const appendToken = append ? Symbol("fresh-flow-feed-page") : null;
    if (append) {
      if (appendLockRef.current || !feedCursor || sharedPostId) return;
      if (!options.manual && prefetchBlockedCursorRef.current === feedCursor) return;
      if (options.manual) prefetchBlockedCursorRef.current = null;
      appendLockRef.current = appendToken;
      setLoadingMore(true);
      beginAppend();
    }
    const requestId = options.requestId ?? (append ? requestGenerationRef.current : ++requestGenerationRef.current);
    const isCurrentRequest = () => requestId === requestGenerationRef.current;

    if (!append) {
      appendLockRef.current = null;
      prefetchBlockedCursorRef.current = null;
      setLoading(true);
      setLoadingMore(false);
      setHasMorePosts(false);
      setFeedCursor(null);
      setError(null);
    } else {
      setError(null);
    }

    try {
      let postsData: any[] = [];
      let nextCursor: string | null = null;
      let nextHasMore = false;
      let postsQuery = supabase
        .from("posts")
        .select("id, author_id, content, image_url, video_url, like_count, comment_count, created_at");

      if (sharedPostId) {
        const { data, error: postsError } = await postsQuery.eq("id", sharedPostId);
        if (!isCurrentRequest()) return;
        if (postsError) throw postsError;
        postsData = data ?? [];
      } else {
        postsQuery = postsQuery
          .order("created_at", { ascending: false })
          .order("id", { ascending: false });
        const page = await fetchFreshFlowPage<any>(postsQuery as any, append ? feedCursor : null, FRESH_FLOW_PAGE_SIZE);
        if (!isCurrentRequest()) return;
        if (page.error) throw page.error;
        postsData = page.data;
        nextCursor = page.cursor;
        nextHasMore = page.hasMore;
      }

      const base: DiscoverablePost[] = postsData.map((p: any) => ({
        id: p.id,
        authorId: p.author_id,
        content: p.content ?? "",
        videoUrl: p.video_url ?? null,
        imageUrl: p.image_url ?? null,
        likeCount: p.like_count ?? 0,
        commentCount: p.comment_count ?? 0,
        createdAt: p.created_at,
      }));

      let followingIds: Set<string> | undefined;
      if (discoveryId === "following" && user && !isGuest) {
        try {
          followingIds = new Set(await getSocialAuthorIds(user.id));
        } catch {
          followingIds = new Set();
        }
        if (!isCurrentRequest()) return;
      }

      const filtered = discoveryId
        ? applyDiscoveryFilter(base, discoveryId, { followingAuthorIds: followingIds })
        : base;
      const authorIds = [...new Set(filtered.map((post) => post.authorId).filter(Boolean))];
      let profileMap = new Map<string, { full_name: string; username: string }>();

      if (authorIds.length > 0) {
        const { data: profilesData, error: profilesError } = await supabase
          .from("user_public_profiles")
          .select("id, full_name, username")
          .in("id", authorIds);
        if (!isCurrentRequest()) return;
        if (profilesError) throw profilesError;
        profileMap = new Map((profilesData ?? []).map((profile: any) => [profile.id, profile]));
      }

      let reactionMap = new Map<string, string>();
      let savedPostIds = new Set<string>();
      if (user && !isGuest && filtered.length > 0) {
        const visiblePostIds = filtered.map((post) => post.id);
        const [likesResult, savedResult] = await Promise.all([
          supabase.from("post_likes").select("post_id, reaction_type").eq("user_id", user.id).in("post_id", visiblePostIds),
          supabase.from("saved_posts").select("post_id").eq("user_id", user.id).in("post_id", visiblePostIds),
        ]);
        if (!isCurrentRequest()) return;
        reactionMap = new Map((likesResult.data ?? []).map((like: any) => [like.post_id, like.reaction_type]));
        savedPostIds = new Set((savedResult.data ?? []).map((saved: any) => saved.post_id));
      }

      const mapped: Post[] = filtered.map((post) => {
        const profile = profileMap.get(post.authorId);
        return {
          id: post.id,
          authorId: post.authorId,
          authorName: profile?.full_name ?? "Unknown",
          authorUsername: profile?.username ?? "unknown",
          content: post.content ?? "",
          imageUrl: post.imageUrl ?? null,
          videoUrl: post.videoUrl ?? null,
          likeCount: post.likeCount ?? 0,
          commentCount: post.commentCount ?? 0,
          myReaction: reactionMap.get(post.id) ?? null,
          createdAt: post.createdAt,
        };
      });

      if (!isCurrentRequest()) return;
      setFeedCursor(nextCursor);
      setHasMorePosts(nextHasMore);
      prefetchBlockedCursorRef.current = append && mapped.length === 0 ? nextCursor : null;
      setSavedIds((current) => append ? new Set([...current, ...savedPostIds]) : savedPostIds);
      const runtimeItems = mapped.map((post) => ({
        id: post.id,
        kind: post.videoUrl ? "long-video" as const : post.imageUrl ? "image" as const : "post" as const,
        world: "news-posts" as const,
        authorId: post.authorId,
        title: post.content?.slice(0, 90) || "Fresh Post",
        description: post.content || "",
        mediaUrl: post.videoUrl || post.imageUrl,
        posterUrl: post.imageUrl,
        createdAt: post.createdAt,
        safety: "approved" as const,
      }));
      if (append) {
        setPosts((current) => {
          const existingIds = new Set(current.map((post) => post.id));
          return [...current, ...mapped.filter((post) => !existingIds.has(post.id))];
        });
        appendQueue(runtimeItems, nextCursor, nextHasMore);
      } else {
        setPosts(mapped);
        replaceQueue(runtimeItems, nextCursor, nextHasMore);
      }
      setLoading(false);
    } catch (loadError) {
      if (!isCurrentRequest()) return;
      const message = loadError instanceof Error ? loadError.message : "Unknown feed error";
      setError(append ? `Could not load more posts: ${message}` : `Could not load the feed: ${message}`);
      if (append) prefetchBlockedCursorRef.current = feedCursor;
      if (!append) setLoading(false);
    } finally {
      if (append && appendLockRef.current === appendToken) {
        appendLockRef.current = null;
        setLoadingMore(false);
        endAppend();
      }
    }
  }

  function showAllPosts() {
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.delete("post");
      window.history.replaceState(window.history.state, "", url.toString());
    }
    setSharedPostId(null);
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
      const { error: uploadError } = await supabase.storage.from("post-images").upload(path, imageFile);
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
      video_url: null,
    });

    if (insertError) {
      setError(`Couldn't post: ${insertError.message}`);
      setUploading(false);
      return;
    }

    setDraft("");
    clearImageSelection();
    setUploading(false);
    void loadPosts();
  }

  async function reactToPost(post: Post, type: string) {
    if (!user || isGuest) return;
    setError(null);
    let interactionError: string | null = null;
    if (post.myReaction === type) {
      const result = await supabase.from("post_likes").delete().eq("post_id", post.id).eq("user_id", user.id);
      interactionError = result.error?.message ?? null;
    } else if (post.myReaction) {
      const result = await supabase.from("post_likes").update({ reaction_type: type }).eq("post_id", post.id).eq("user_id", user.id);
      interactionError = result.error?.message ?? null;
    } else {
      const result = await supabase.from("post_likes").insert({ post_id: post.id, user_id: user.id, reaction_type: type });
      interactionError = result.error?.message ?? null;
    }
    if (interactionError) {
      setError("Your reaction couldn't be saved. Please try again.");
      return;
    }
    void loadPosts();
  }

  async function toggleSave(postId: string) {
    if (!user || isGuest) return;
    setError(null);
    const result = savedIds.has(postId)
      ? await supabase.from("saved_posts").delete().eq("post_id", postId).eq("user_id", user.id)
      : await supabase.from("saved_posts").insert({ post_id: postId, user_id: user.id });
    if (result.error) {
      setError("This post couldn't be saved. Please try again.");
      return;
    }
    void loadPosts();
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

  useEffect(() => {
    if (loading || typeof window === "undefined") return;
    if (!sharedPostId) return;
    document.getElementById(`post-${sharedPostId}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [loading, posts, sharedPostId]);

  const runtimeActiveId = runtimeState.activeId;
  const title = discoveryId ? `Feed · ${discoveryId.replace(/-/g, " ")}` : "Feed";

  return (
    <div className="module" data-discovery={discoveryId || undefined}>
      <div className="feed-heading-row">
        <h2>{sharedPostId ? "Shared post" : title}</h2>
        {sharedPostId && <button type="button" className="add-note-btn" onClick={showAllPosts}>Back to all posts</button>}
      </div>
      {isGuest && <p className="empty-state">Register a real account to post and react to content.</p>}
      {!isGuest && user && (
        <div className="post-composer">
          <textarea value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="What's on your mind?" className="note-input" />
          {imagePreview && (
            <div className="image-preview-wrap">
              <img src={imagePreview} alt="Selected" className="image-preview" />
              <button className="remove-image-btn" onClick={clearImageSelection}>Remove</button>
            </div>
          )}
          <div className="composer-actions">
            <label className="icon-btn-outline">
              <CameraIcon size={18} />
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} style={{ display: "none" }} />
            </label>
            <button className="add-note-btn" onClick={addPost} disabled={uploading}>{uploading ? "Posting..." : "Post"}</button>
          </div>
        </div>
      )}

      {error && <p className="auth-error">{error}</p>}
      {loading && <p className="empty-state">Loading feed...</p>}
      {!loading && posts.length === 0 && (
        <p className="empty-state">
          {sharedPostId ? "This post may be unavailable, deleted, or private." : discoveryId ? `No posts for “${discoveryId.replace(/-/g, " ")}” yet.` : "No posts yet. Be the first."}
        </p>
      )}

      <ul className="notes-list">
        {posts.map((p) => (
          <li id={`post-${p.id}`} key={p.id} className={`post-item ${runtimeActiveId === p.id ? "active" : ""}`} onMouseEnter={() => setRuntimeActive(p.id)}>
            <div className="post-header">
              <button type="button" className="post-author" onClick={() => openProfile(p.authorId)} aria-label={`Open ${p.authorName}'s profile`}>{p.authorName}</button>
              <span className="post-username">@{p.authorUsername}</span>
              <span className="post-time">{timeAgo(p.createdAt)}</span>
              <span style={{ marginLeft: "auto" }}><PostMenu targetType="post" targetId={p.id} onHide={() => setPosts((prev) => prev.filter((x) => x.id !== p.id))} /></span>
            </div>
            {p.content && <p className="post-content">{p.content}</p>}
            {p.imageUrl && <img src={p.imageUrl} alt="Post attachment" className="post-image" />}
            {p.videoUrl && (
              <video src={p.videoUrl} controls preload="metadata" className="post-video" aria-label="Post video" />
            )}
            <div className="post-actions">
              <ReactionPicker myReaction={p.myReaction} count={p.likeCount} disabled={isGuest} onReact={(type) => reactToPost(p, type)} />
              <button type="button" className="like-btn" onClick={() => setOpenCommentsFor(p.id)} aria-label={`Open comments, ${p.commentCount} comments`} title="Comments"><CommentIcon size={18} /><span>{p.commentCount}</span></button>
              <button type="button" className={savedIds.has(p.id) ? "like-btn liked" : "like-btn"} onClick={() => toggleSave(p.id)} disabled={isGuest} aria-label={savedIds.has(p.id) ? "Remove saved post" : "Save post"} title={savedIds.has(p.id) ? "Saved" : "Save post"}><BookmarkIcon size={18} filled={savedIds.has(p.id)} /><span className="post-action-label">{savedIds.has(p.id) ? "Saved" : "Save"}</span></button>
              <button type="button" className="like-btn" onClick={() => setShareTarget(p.id)} aria-label="Share post" title="Share post"><ShareIcon size={18} /><span className="post-action-label">Share</span></button>
            </div>
          </li>
        ))}
      </ul>

      {!loading && hasMorePosts && !sharedPostId && (
        <div className="feed-pagination">
          <button type="button" className="add-note-btn" onClick={() => void loadPosts({ append: true, manual: true })} disabled={loadingMore}>
            {loadingMore ? "Loading more..." : "Load more posts"}
          </button>
        </div>
      )}

      {openCommentsFor && (
        <CommentPanel targetType="post" targetId={openCommentsFor} onClose={() => { setOpenCommentsFor(null); void loadPosts(); }} />
      )}
      {shareTarget && <ShareSheet postId={shareTarget} title={posts.find((post) => post.id === shareTarget)?.content || "Check out this Fresh post"} onClose={() => setShareTarget(null)} />}
    </div>
  );
}

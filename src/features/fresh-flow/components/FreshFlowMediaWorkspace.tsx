import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { useFreshId } from "../../fresh-id/context/FreshIdContext";
import { CommentPanel } from "../../comments/components/CommentPanel";
import { ReactionPicker } from "../../reactions/components/ReactionPicker";
import "./FreshFlowMediaWorkspace.css";

type MediaWorkspaceProps = {
  kind: "long-videos" | "ar-vr" | "podcasts" | "others";
  title: string;
  description: string;
  icon: string;
};

type MediaPost = {
  id: string;
  authorId: string;
  authorName: string;
  authorUsername: string;
  content: string;
  videoUrl: string | null;
  imageUrl: string | null;
  likeCount: number;
  commentCount: number;
  myReaction: string | null;
  createdAt: string;
};

const FILTER_LABELS: Record<MediaWorkspaceProps["kind"], string> = {
  "long-videos": "video",
  "ar-vr": "AR / VR",
  podcasts: "podcast",
  others: "media",
};

function matchesKind(post: MediaPost, kind: MediaWorkspaceProps["kind"]) {
  const text = post.content.toLowerCase();
  if (kind === "long-videos") return Boolean(post.videoUrl);
  if (kind === "podcasts") return /#podcast\b|#podcasts\b|podcast/.test(text);
  if (kind === "ar-vr") return /#ar\b|#vr\b|ar\/vr|augmented reality|virtual reality/.test(text);
  return Boolean(post.videoUrl || post.imageUrl);
}

function timeAgo(iso: string) {
  const mins = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function FreshFlowMediaWorkspace({ kind, title, description, icon }: MediaWorkspaceProps) {
  const { user, isGuest } = useFreshId();
  const [posts, setPosts] = useState<MediaPost[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [commentsFor, setCommentsFor] = useState<string | null>(null);

  async function loadMedia() {
    setLoading(true);
    setError(null);
    const { data, error: postsError } = await supabase
      .from("posts")
      .select("id, author_id, content, image_url, video_url, like_count, comment_count, created_at")
      .order("created_at", { ascending: false })
      .limit(80);

    if (postsError) {
      setError(`Couldn't load ${title}: ${postsError.message}`);
      setLoading(false);
      return;
    }

    const rows = (data ?? []).filter((row: any) => matchesKind({
      id: row.id,
      authorId: row.author_id,
      authorName: "Unknown",
      authorUsername: "unknown",
      content: row.content ?? "",
      videoUrl: row.video_url ?? null,
      imageUrl: row.image_url ?? null,
      likeCount: row.like_count ?? 0,
      commentCount: row.comment_count ?? 0,
      myReaction: null,
      createdAt: row.created_at,
    }, kind));

    const authorIds = [...new Set(rows.map((row: any) => row.author_id).filter(Boolean))];
    const profileMap = new Map<string, { full_name: string; username: string }>();
    if (authorIds.length) {
      const { data: profiles, error: profileError } = await supabase
        .from("users")
        .select("id, full_name, username")
        .in("id", authorIds);
      if (profileError) {
        setError(`Couldn't load media authors: ${profileError.message}`);
        setLoading(false);
        return;
      }
      for (const profile of profiles ?? []) profileMap.set(profile.id, profile);
    }

    const reactionMap = new Map<string, string>();
    const saved = new Set<string>();
    if (user && !isGuest) {
      const [{ data: reactions }, { data: savedRows }] = await Promise.all([
        supabase.from("post_likes").select("post_id, reaction_type").eq("user_id", user.id),
        supabase.from("saved_posts").select("post_id").eq("user_id", user.id),
      ]);
      for (const reaction of reactions ?? []) reactionMap.set(reaction.post_id, reaction.reaction_type);
      for (const row of savedRows ?? []) saved.add(row.post_id);
    }

    setPosts(rows.map((row: any) => {
      const profile = profileMap.get(row.author_id);
      return {
        id: row.id,
        authorId: row.author_id,
        authorName: profile?.full_name ?? "Unknown creator",
        authorUsername: profile?.username ?? "creator",
        content: row.content ?? "",
        videoUrl: row.video_url ?? null,
        imageUrl: row.image_url ?? null,
        likeCount: row.like_count ?? 0,
        commentCount: row.comment_count ?? 0,
        myReaction: reactionMap.get(row.id) ?? null,
        createdAt: row.created_at,
      };
    }));
    setSavedIds(saved);
    setLoading(false);
  }

  useEffect(() => { void loadMedia(); }, [kind, user?.id, isGuest]);

  async function react(post: MediaPost, reaction: string) {
    if (!user || isGuest) return;
    if (post.myReaction === reaction) {
      await supabase.from("post_likes").delete().eq("post_id", post.id).eq("user_id", user.id);
    } else if (post.myReaction) {
      await supabase.from("post_likes").update({ reaction_type: reaction }).eq("post_id", post.id).eq("user_id", user.id);
    } else {
      await supabase.from("post_likes").insert({ post_id: post.id, user_id: user.id, reaction_type: reaction });
    }
    void loadMedia();
  }

  async function toggleSave(post: MediaPost) {
    if (!user || isGuest) return;
    if (savedIds.has(post.id)) await supabase.from("saved_posts").delete().eq("post_id", post.id).eq("user_id", user.id);
    else await supabase.from("saved_posts").insert({ post_id: post.id, user_id: user.id });
    void loadMedia();
  }

  async function share(post: MediaPost) {
    const url = post.videoUrl || post.imageUrl || window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: post.content || title, text: post.content || title, url });
      else await navigator.clipboard.writeText(url);
    } catch { /* user cancelled */ }
  }

  return (
    <section className={`fresh-flow-media-workspace fresh-flow-media-workspace-${kind}`} aria-label={`${title} media experience`}>
      <header className="fresh-flow-media-workspace-hero">
        <span className="fresh-flow-media-workspace-icon" aria-hidden="true">{icon}</span>
        <div>
          <span className="fresh-flow-media-workspace-eyebrow">Fresh Flow · {FILTER_LABELS[kind]}</span>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
      </header>

      <div className="fresh-flow-media-live-state">
        <span className="fresh-flow-live-dot" />
        <strong>Connected to Fresh data</strong>
        <small>{posts.length} available item{posts.length === 1 ? "" : "s"}</small>
      </div>

      {loading && <div className="fresh-flow-media-status">Loading real Fresh content…</div>}
      {error && <div className="fresh-flow-media-status error">{error}</div>}
      {!loading && !error && posts.length === 0 && (
        <div className="fresh-flow-media-status">
          <strong>No {FILTER_LABELS[kind]} content is published yet.</strong>
          <span>Fresh Flow is connected to the real posts/media store; it will appear here as soon as matching content exists.</span>
        </div>
      )}

      <div className="fresh-flow-media-feed">
        {posts.map((post) => (
          <article key={post.id} className="fresh-flow-media-card">
            {post.videoUrl ? (
              <video src={post.videoUrl} controls playsInline preload="metadata" className="fresh-flow-media-player" aria-label={title} />
            ) : post.imageUrl ? (
              <img src={post.imageUrl} alt="" className="fresh-flow-media-image" />
            ) : null}
            <div className="fresh-flow-media-card-body">
              <div className="fresh-flow-media-author">
                <span className="fresh-flow-author-avatar">{(post.authorName || "?").slice(0, 1).toUpperCase()}</span>
                <div><strong>@{post.authorUsername}</strong><small>{timeAgo(post.createdAt)}</small></div>
              </div>
              {post.content && <p>{post.content}</p>}
              <div className="fresh-flow-media-actions">
                <ReactionPicker myReaction={post.myReaction} count={post.likeCount} disabled={isGuest} variant="short" onReact={(value) => void react(post, value)} />
                <button type="button" onClick={() => setCommentsFor(post.id)}>💬 <span>{post.commentCount}</span></button>
                <button type="button" className={savedIds.has(post.id) ? "active" : ""} onClick={() => void toggleSave(post)} disabled={isGuest}>🔖</button>
                <button type="button" onClick={() => void share(post)}>↗</button>
              </div>
            </div>
          </article>
        ))}
      </div>

      {commentsFor && <CommentPanel targetType="post" targetId={commentsFor} onClose={() => { setCommentsFor(null); void loadMedia(); }} />}
    </section>
  );
}

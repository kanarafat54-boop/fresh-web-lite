import { useEffect, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { useFreshId } from "../../fresh-id/context/FreshIdContext";
import { CommentPanel } from "../../comments/components/CommentPanel";
import { ReactionPicker } from "../../reactions/components/ReactionPicker";
import { applyDiscoveryFilter, matchesMediaKind, type DiscoverablePost } from "../core/applyDiscoveryFilter";
import { getSocialAuthorIds } from "../core/social";
import "./FreshFlowMediaWorkspace.css";

type MediaWorkspaceProps = {
  kind: "long-videos" | "ar-vr" | "podcasts" | "others";
  title: string;
  description: string;
  icon: string;
  discoveryId?: string;
};

type MediaPost = DiscoverablePost & {
  authorName: string;
  authorUsername: string;
  myReaction: string | null;
};

const FILTER_LABELS: Record<MediaWorkspaceProps["kind"], string> = {
  "long-videos": "video",
  "ar-vr": "AR / VR",
  podcasts: "podcast",
  others: "media",
};

function timeAgo(iso: string) {
  const mins = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function FreshFlowMediaWorkspace({ kind, title, description, icon, discoveryId }: MediaWorkspaceProps) {
  const { user, isGuest } = useFreshId();
  const [posts, setPosts] = useState<MediaPost[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [commentsFor, setCommentsFor] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  async function loadMedia() {
    setLoading(true);
    setError(null);
    const { data, error: postsError } = await supabase
      .from("posts")
      .select("id, author_id, content, image_url, video_url, like_count, comment_count, created_at")
      .order("created_at", { ascending: false })
      .limit(120);

    if (postsError) {
      setError(`Couldn't load ${title}: ${postsError.message}`);
      setLoading(false);
      return;
    }

    const baseRows: DiscoverablePost[] = (data ?? [])
      .map((row: any) => ({
        id: row.id,
        authorId: row.author_id,
        content: row.content ?? "",
        videoUrl: row.video_url ?? null,
        imageUrl: row.image_url ?? null,
        likeCount: row.like_count ?? 0,
        commentCount: row.comment_count ?? 0,
        createdAt: row.created_at,
      }))
      .filter((row) => matchesMediaKind(row, kind));

    let followingIds: Set<string> | undefined;
    if (discoveryId === "following" && user && !isGuest) {
      try {
        followingIds = new Set(await getSocialAuthorIds(user.id));
      } catch {
        followingIds = new Set();
      }
    }

    const filtered = applyDiscoveryFilter(baseRows, discoveryId, { followingAuthorIds: followingIds });

    const authorIds = [...new Set(filtered.map((row) => row.authorId).filter(Boolean))];
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

    const mapped = filtered.map((row) => {
      const profile = profileMap.get(row.authorId);
      return {
        ...row,
        authorName: profile?.full_name ?? "Unknown creator",
        authorUsername: profile?.username ?? "creator",
        myReaction: reactionMap.get(row.id) ?? null,
      };
    });
    setPosts(mapped);
    setSavedIds(saved);
    if (mapped.length && !activeId) setActiveId(mapped[0].id);
    setLoading(false);
  }

  useEffect(() => {
    setActiveId(null);
    void loadMedia();
  }, [kind, discoveryId, user?.id, isGuest]);

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
    } catch {
      /* user cancelled */
    }
  }

  const discoveryLabel = discoveryId && discoveryId !== "discover" ? discoveryId.replace(/-/g, " ") : null;
  const hero = posts[0] ?? null;
  const rest = posts.slice(1);
  const continueWatching = posts.slice(0, 8);

  function MediaActions({ post }: { post: MediaPost }) {
    return (
      <div className="fresh-flow-media-actions">
        <ReactionPicker
          myReaction={post.myReaction}
          count={post.likeCount}
          disabled={isGuest}
          variant="short"
          onReact={(value) => void react(post, value)}
        />
        <button type="button" onClick={() => setCommentsFor(post.id)}>
          💬 <span>{post.commentCount}</span>
        </button>
        <button type="button" className={savedIds.has(post.id) ? "active" : ""} onClick={() => void toggleSave(post)} disabled={isGuest}>
          🔖
        </button>
        <button type="button" onClick={() => void share(post)}>
          ↗
        </button>
      </div>
    );
  }

  function PosterMedia({ post, className = "" }: { post: MediaPost; className?: string }) {
    if (post.videoUrl) {
      return <video src={post.videoUrl} controls playsInline preload="metadata" className={`fresh-flow-media-player ${className}`} aria-label={title} />;
    }
    if (post.imageUrl) {
      return <img src={post.imageUrl} alt="" className={`fresh-flow-media-image ${className}`} />;
    }
    return <div className={`fresh-flow-media-poster-fallback ${className}`} aria-hidden />;
  }

  return (
    <section
      className={`fresh-flow-media-workspace fresh-flow-media-workspace-${kind}`}
      aria-label={`${title} media experience`}
      data-discovery={discoveryId || undefined}
    >
      <header className="fresh-flow-media-workspace-hero">
        <span className="fresh-flow-media-workspace-icon" aria-hidden="true">
          {icon}
        </span>
        <div>
          <span className="fresh-flow-media-workspace-eyebrow">
            Fresh Flow · {FILTER_LABELS[kind]}
            {discoveryLabel ? ` · ${discoveryLabel}` : ""}
          </span>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
      </header>

      <div className="fresh-flow-media-live-state">
        <span className="fresh-flow-live-dot" />
        <strong>Connected to Fresh data</strong>
        <small>
          {posts.length} item{posts.length === 1 ? "" : "s"}
          {discoveryLabel ? ` · ${discoveryLabel}` : ""}
        </small>
      </div>

      {loading && <div className="fresh-flow-media-status">Loading real Fresh content…</div>}
      {error && <div className="fresh-flow-media-status error">{error}</div>}
      {!loading && !error && posts.length === 0 && (
        <div className="fresh-flow-media-status">
          <strong>No {FILTER_LABELS[kind]} content{discoveryLabel ? ` for “${discoveryLabel}”` : ""} yet.</strong>
          <span>Fresh Flow is connected to the real posts store; matching items appear here when published.</span>
        </div>
      )}

      {kind === "long-videos" && hero && !loading && (
        <>
          <article className="fresh-flow-cinematic-hero">
            <div className="fresh-flow-cinematic-hero-media">
              <PosterMedia post={hero} />
              <div className="fresh-flow-cinematic-hero-scrim" />
            </div>
            <div className="fresh-flow-cinematic-hero-body">
              <span className="fresh-flow-cinematic-kicker">@{hero.authorUsername} · {timeAgo(hero.createdAt)}</span>
              <h3>{hero.content?.slice(0, 80) || "Featured Long Video"}</h3>
              <div className="fresh-flow-cinematic-cta">
                <button type="button" className="fresh-flow-cta-play" onClick={() => setActiveId(hero.id)}>
                  ▶ Play
                </button>
                <button type="button" className="fresh-flow-cta-icon" onClick={() => void toggleSave(hero)} disabled={isGuest} aria-label="Save">
                  {savedIds.has(hero.id) ? "✓" : "+"}
                </button>
                <button type="button" className="fresh-flow-cta-icon" onClick={() => void share(hero)} aria-label="Share">
                  ↗
                </button>
              </div>
              <MediaActions post={hero} />
            </div>
          </article>

          {continueWatching.length > 1 && (
            <section className="fresh-flow-continue-row" aria-label="Continue watching">
              <div className="fresh-flow-row-header">
                <h4>Continue Watching</h4>
              </div>
              <div className="fresh-flow-continue-rail">
                {continueWatching.map((post) => (
                  <button
                    key={post.id}
                    type="button"
                    className={`fresh-flow-continue-card ${activeId === post.id ? "active" : ""}`}
                    onClick={() => setActiveId(post.id)}
                  >
                    {post.imageUrl || post.videoUrl ? (
                      post.imageUrl ? (
                        <img src={post.imageUrl} alt="" />
                      ) : (
                        <video src={post.videoUrl!} muted preload="metadata" />
                      )
                    ) : (
                      <span className="fresh-flow-continue-placeholder">▶</span>
                    )}
                    <span>{post.content?.slice(0, 40) || `@${post.authorUsername}`}</span>
                  </button>
                ))}
              </div>
            </section>
          )}

          <div className="fresh-flow-media-feed fresh-flow-media-feed-long-videos">
            {rest.map((post) => (
              <article key={post.id} className="fresh-flow-media-card fresh-flow-media-card-long-video">
                <PosterMedia post={post} />
                <div className="fresh-flow-media-card-body">
                  <div className="fresh-flow-media-author">
                    <span className="fresh-flow-author-avatar">{(post.authorName || "?").slice(0, 1).toUpperCase()}</span>
                    <div>
                      <strong>@{post.authorUsername}</strong>
                      <small>{timeAgo(post.createdAt)}</small>
                    </div>
                  </div>
                  {post.content && <p>{post.content}</p>}
                  <MediaActions post={post} />
                </div>
              </article>
            ))}
          </div>
        </>
      )}

      {kind === "podcasts" && !loading && posts.length > 0 && (
        <div className="fresh-flow-podcast-layout">
          {hero && (
            <article className="fresh-flow-podcast-featured">
              <div className="fresh-flow-podcast-art">
                <PosterMedia post={hero} />
              </div>
              <div className="fresh-flow-podcast-featured-body">
                <span className="fresh-flow-podcast-host">@{hero.authorUsername}</span>
                <h3>{hero.content?.slice(0, 90) || "Featured episode"}</h3>
                <button type="button" className="fresh-flow-podcast-play-all" onClick={() => setActiveId(hero.id)}>
                  ▶ Play episode
                </button>
                <MediaActions post={hero} />
              </div>
            </article>
          )}
          <ul className="fresh-flow-podcast-list">
            {posts.map((post, i) => (
              <li key={post.id} className={activeId === post.id ? "active" : ""}>
                <button type="button" className="fresh-flow-podcast-row" onClick={() => setActiveId(post.id)}>
                  <span className="fresh-flow-podcast-ep-num">{String(i + 1).padStart(2, "0")}</span>
                  <span className="fresh-flow-podcast-row-art">
                    <PosterMedia post={post} />
                  </span>
                  <span className="fresh-flow-podcast-row-copy">
                    <strong>{post.content?.slice(0, 60) || "Episode"}</strong>
                    <small>@{post.authorUsername} · {timeAgo(post.createdAt)}</small>
                  </span>
                  <span className="fresh-flow-podcast-row-play" aria-hidden>
                    ▶
                  </span>
                </button>
                <div className="fresh-flow-podcast-row-actions">
                  <MediaActions post={post} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {kind === "ar-vr" && !loading && posts.length > 0 && (
        <div className="fresh-flow-vr-layout">
          <div className="fresh-flow-vr-enter-banner">
            <h3>Welcome to Virtual Reality</h3>
            <p>Choose an experience — UI recedes once you enter.</p>
            <div className="fresh-flow-vr-enter-actions">
              <span>Start AR</span>
              <span>Object Library</span>
              <span>Learn AR/VR</span>
            </div>
          </div>
          <div className="fresh-flow-media-feed fresh-flow-media-feed-vr">
            {posts.map((post) => (
              <article key={post.id} className="fresh-flow-media-card fresh-flow-media-card-vr">
                <PosterMedia post={post} />
                <div className="fresh-flow-media-card-body">
                  <div className="fresh-flow-media-author">
                    <span className="fresh-flow-author-avatar">{(post.authorName || "?").slice(0, 1).toUpperCase()}</span>
                    <div>
                      <strong>@{post.authorUsername}</strong>
                      <small>{timeAgo(post.createdAt)}</small>
                    </div>
                  </div>
                  {post.content && <p>{post.content}</p>}
                  <button type="button" className="fresh-flow-vr-enter-btn" onClick={() => setActiveId(post.id)}>
                    Enter experience
                  </button>
                  <MediaActions post={post} />
                </div>
              </article>
            ))}
          </div>
        </div>
      )}

      {kind === "others" && !loading && posts.length > 0 && (
        <div className="fresh-flow-media-feed fresh-flow-media-feed-others">
          {posts.map((post) => (
            <article key={post.id} className="fresh-flow-media-card fresh-flow-media-card-others">
              <PosterMedia post={post} />
              <div className="fresh-flow-media-card-body">
                <div className="fresh-flow-media-author">
                  <span className="fresh-flow-author-avatar">{(post.authorName || "?").slice(0, 1).toUpperCase()}</span>
                  <div>
                    <strong>@{post.authorUsername}</strong>
                    <small>{timeAgo(post.createdAt)}</small>
                  </div>
                </div>
                {post.content && <p>{post.content}</p>}
                <MediaActions post={post} />
              </div>
            </article>
          ))}
        </div>
      )}

      {commentsFor && (
        <CommentPanel
          targetType="post"
          targetId={commentsFor}
          onClose={() => {
            setCommentsFor(null);
            void loadMedia();
          }}
        />
      )}
    </section>
  );
}

/**
 * Fresh Web Lite
 * Shorts Module — vertical auto-scrolling short video feed
 */

import { useEffect, useRef, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { useFreshId } from "../../fresh-id/context/FreshIdContext";
import { CommentPanel } from "../../comments/components/CommentPanel";
import { VideoTrimmer } from "./VideoTrimmer";
import { VideoEditor } from "./VideoEditor";
import { ReactionPicker } from "../../reactions/components/ReactionPicker";
import { ShareSheet } from "../../share/components/ShareSheet";
import { PostMenu } from "../../moderation/components/PostMenu";
import { ShortsOnboarding } from "./ShortsOnboarding";
import { useProfileNav } from "../../profile/context/ProfileNavContext";
import {
  FilmIcon, ScissorsIcon, CommentIcon, BookmarkIcon, BackIcon, ShareIcon,
  RepostIcon, BrokenHeartIcon, SearchIcon, XCircleIcon, ListIcon,
} from "../../../components/Icons";
import type { Short } from "../types/short";
import { rankForYou } from "../core/ForYouRanking";
import { interactWithShort, removeShortInteraction } from "../core/ShortsUniversalInteractionAdapter";
import type { UniversalReactionKind } from "../../../core/interactions/FreshReactionModel";

const MAX_VIDEO_BYTES = 50 * 1024 * 1024; // 50MB
const MAX_VIDEO_SECONDS = 90;
const ALLOWED_TYPES = ["video/mp4", "video/webm", "video/quicktime"];
const ONBOARDING_KEY = "fresh_shorts_onboarding_seen";

function renderCaption(caption: string, onTagTap: (tag: string) => void) {
  const parts = caption.split(/(\s+)/);
  return parts.map((part, i) => {
    if (part.startsWith("#") && part.length > 1) {
      return (
        <span key={i} className="tag-hashtag" onClick={() => onTagTap(part.slice(1))}>
          {part}
        </span>
      );
    }
    if (part.startsWith("@") && part.length > 1) {
      return <span key={i} className="tag-mention">{part}</span>;
    }
    return part;
  });
}

export function ShortsModule({ openComposerSignal, onExit }: { openComposerSignal?: number; onExit?: () => void }) {
  const { user, isGuest } = useFreshId();
  const { openProfile } = useProfileNav();
  const [shorts, setShorts] = useState<Short[]>([]);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [caption, setCaption] = useState("");
  const [soundNameInput, setSoundNameInput] = useState("");
  const [chapterDraft, setChapterDraft] = useState<{ time: string; label: string }[]>([]);
  const [chaptersOpenFor, setChaptersOpenFor] = useState<string | null>(null);
  const [unlockAtInput, setUnlockAtInput] = useState("");
  const [categoryInput, setCategoryInput] = useState<"relax" | "learn">("relax");
  const [feedMode, setFeedMode] = useState<"relax" | "learn">("relax");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showComposer, setShowComposer] = useState(false);
  const [showTrimmer, setShowTrimmer] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [openCommentsFor, setOpenCommentsFor] = useState<string | null>(null);
  const [shareTarget, setShareTarget] = useState<string | null>(null);
  const [videoErrors, setVideoErrors] = useState<Set<string>>(new Set());
  const [burstIds, setBurstIds] = useState<Set<string>>(new Set());
  const [showOnboarding, setShowOnboarding] = useState(() => !localStorage.getItem(ONBOARDING_KEY));
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchActive, setSearchActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRefs = useRef<Map<string, HTMLVideoElement>>(new Map());
  const viewedRef = useRef<Set<string>>(new Set());
  const lastTapRef = useRef<Map<string, number>>(new Map());
  const tapTimeoutRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const swipeStartX = useRef<number | null>(null);

  useEffect(() => {
    loadShorts();
  }, [feedMode]);

  useEffect(() => {
    if (openComposerSignal) setShowComposer(true);
  }, [openComposerSignal]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const video = entry.target as HTMLVideoElement;
          const shortId = video.dataset.shortId!;
          if (entry.isIntersecting && entry.intersectionRatio > 0.6) {
            video.play().catch(() => {});
            if (!viewedRef.current.has(shortId)) {
              viewedRef.current.add(shortId);
              supabase.rpc("increment_short_views", { short_id_input: shortId }).then(() => {});
              try {
                const stored = new Set<string>(JSON.parse(sessionStorage.getItem("fresh_shorts_viewed") ?? "[]"));
                stored.add(shortId);
                sessionStorage.setItem("fresh_shorts_viewed", JSON.stringify([...stored]));
              } catch {
                // sessionStorage unavailable; ranking just skips the seen-penalty this session.
              }
            }
          } else {
            video.pause();
          }
        });
      },
      { root: container, threshold: [0, 0.6, 1] }
    );

    videoRefs.current.forEach((video) => observer.observe(video));

    return () => observer.disconnect();
  }, [shorts]);

  function dismissOnboarding() {
    localStorage.setItem(ONBOARDING_KEY, "1");
    setShowOnboarding(false);
  }

  function handleTouchStart(e: React.TouchEvent) {
    const x = e.touches[0].clientX;
    if (x < 40) swipeStartX.current = x;
    else swipeStartX.current = null;
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (swipeStartX.current === null) return;
    const endX = e.changedTouches[0].clientX;
    if (endX - swipeStartX.current > 80 && onExit) {
      onExit();
    }
    swipeStartX.current = null;
  }

  async function fetchAndMapShorts(query: any) {
    const { data: shortsData, error: shortsError } = await query;

    if (shortsError) {
      setError(`Couldn't load shorts: ${shortsError.message}`);
      setLoading(false);
      return;
    }

    const authorIds = [...new Set((shortsData ?? []).map((s: any) => s.author_id))];

    let profileMap = new Map<string, { full_name: string; username: string }>();
    if (authorIds.length > 0) {
      const { data: profilesData } = await supabase
        .from("users")
        .select("id, full_name, username")
        .in("id", authorIds);
      profileMap = new Map((profilesData ?? []).map((u: any) => [u.id, u]));
    }

    let reactionMap = new Map<string, string>();
    let savedShortIds = new Set<string>();
    let repostedIds = new Set<string>();
    let followingIds = new Set<string>();

    if (user && !isGuest) {
      const { data: likesData } = await supabase
        .from("short_likes")
        .select("short_id, reaction_type")
        .eq("user_id", user.id);
      reactionMap = new Map((likesData ?? []).map((l: any) => [l.short_id, l.reaction_type]));

      const { data: savedData } = await supabase
        .from("saved_shorts")
        .select("short_id")
        .eq("user_id", user.id);
      savedShortIds = new Set((savedData ?? []).map((s: any) => s.short_id));

      const { data: repostData } = await supabase
        .from("short_reposts")
        .select("short_id")
        .eq("user_id", user.id);
      repostedIds = new Set((repostData ?? []).map((r: any) => r.short_id));

      if (authorIds.length > 0) {
        const { data: followData } = await supabase
          .from("follows")
          .select("followed_id")
          .eq("follower_id", user.id)
          .in("followed_id", authorIds);
        followingIds = new Set((followData ?? []).map((f: any) => f.followed_id));
      }
    }

    const shortIds = (shortsData ?? []).map((s: any) => s.id);
    let breakdownMap = new Map<string, Record<string, number>>();
    let hotIds = new Set<string>();

    if (shortIds.length > 0) {
      const { data: breakdownData } = await supabase
        .from("short_reaction_breakdown")
        .select("short_id, reaction_type, count")
        .in("short_id", shortIds);

      (breakdownData ?? []).forEach((row: any) => {
        const existing = breakdownMap.get(row.short_id) ?? {};
        existing[row.reaction_type] = row.count;
        breakdownMap.set(row.short_id, existing);
      });

      const { data: activityData } = await supabase
        .from("short_recent_activity")
        .select("short_id, recent_count")
        .in("short_id", shortIds)
        .gte("recent_count", 3);

      hotIds = new Set((activityData ?? []).map((row: any) => row.short_id));
    }

    const mapped: Short[] = (shortsData ?? []).map((s: any) => {
      const profile = profileMap.get(s.author_id);
      return {
        id: s.id,
        authorId: s.author_id,
        authorName: profile?.full_name ?? "Unknown",
        authorUsername: profile?.username ?? "unknown",
        caption: s.caption ?? "",
        soundName: s.sound_name,
        videoUrl: s.video_url,
        likeCount: s.like_count,
        commentCount: s.comment_count,
        viewCount: s.view_count ?? 0,
        repostCount: s.repost_count ?? 0,
        myReaction: reactionMap.get(s.id) ?? null,
        repostedByMe: repostedIds.has(s.id),
        isFollowingAuthor: followingIds.has(s.author_id),
        reactionBreakdown: breakdownMap.get(s.id) ?? {},
        isHot: hotIds.has(s.id),
        chapters: s.chapters ?? [],
        createdAt: s.created_at,
      };
    });

    const viewedIds = (() => {
      try {
        return new Set<string>(JSON.parse(sessionStorage.getItem("fresh_shorts_viewed") ?? "[]"));
      } catch {
        return new Set<string>();
      }
    })();
    setShorts(searchActive ? mapped : rankForYou(mapped, viewedIds));
    setSavedIds(savedShortIds);
    setLoading(false);
  }

  async function loadShorts() {
    setLoading(true);
    setError(null);
    setSearchActive(false);
    const nowIso = new Date().toISOString();
    const query = supabase
      .from("shorts")
      .select("id, author_id, caption, sound_name, chapters, category, video_url, like_count, comment_count, view_count, repost_count, created_at")
      .or(`unlock_at.is.null,unlock_at.lte.${nowIso}`)
      .eq("category", feedMode)
      .order("created_at", { ascending: false })
      .limit(30);
    fetchAndMapShorts(query);
  }

  async function runSearch(q: string) {
    if (!q.trim()) {
      loadShorts();
      return;
    }
    setLoading(true);
    setError(null);
    setSearchActive(true);
    const query = supabase
      .from("shorts")
      .select("id, author_id, caption, sound_name, chapters, category, video_url, like_count, comment_count, view_count, repost_count, created_at")
      .or(`caption.ilike.%${q}%,sound_name.ilike.%${q}%`)
      .order("created_at", { ascending: false })
      .limit(30);
    fetchAndMapShorts(query);
  }

  function handleTagTap(tag: string) {
    setSearchQuery(tag);
    setShowSearch(true);
    runSearch(tag);
  }

  function handleSoundTap(soundName: string) {
    setSearchQuery(soundName);
    setShowSearch(true);
    runSearch(soundName);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("Please choose an MP4, WEBM, or MOV video.");
      return;
    }
    if (file.size > MAX_VIDEO_BYTES) {
      setError("Video must be under 50MB.");
      return;
    }

    const url = URL.createObjectURL(file);
    const tempVideo = document.createElement("video");
    tempVideo.preload = "metadata";
    tempVideo.src = url;
    tempVideo.onloadedmetadata = () => {
      if (tempVideo.duration > MAX_VIDEO_SECONDS) {
        setError(`Video must be under ${MAX_VIDEO_SECONDS} seconds.`);
        URL.revokeObjectURL(url);
        return;
      }
      setError(null);
      setVideoFile(file);
      setVideoPreview(url);
    };
  }

  function clearVideoSelection() {
    setVideoFile(null);
    setVideoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleTrimmed(trimmedFile: File) {
    setVideoFile(trimmedFile);
    setVideoPreview(URL.createObjectURL(trimmedFile));
    setShowTrimmer(false);
  }

  function handleEdited(editedFile: File) {
    setVideoFile(editedFile);
    setVideoPreview(URL.createObjectURL(editedFile));
    setShowEditor(false);
  }

  async function uploadShort() {
    if (!videoFile || !user || isGuest) return;

    setUploading(true);
    setError(null);

    const ext = videoFile.name.split(".").pop();
    const path = `${user.id}/${crypto.randomUUID()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("post-videos")
      .upload(path, videoFile);

    if (uploadError) {
      setError(`Upload failed: ${uploadError.message}`);
      setUploading(false);
      return;
    }

    const { data: publicUrlData } = supabase.storage.from("post-videos").getPublicUrl(path);

    const { error: insertError } = await supabase.from("shorts").insert({
      author_id: user.id,
      caption: caption.trim(),
      sound_name: soundNameInput.trim() || null,
      chapters: chapterDraft
        .filter((ch) => ch.label.trim() && ch.time.trim())
        .map((ch) => ({ time: Number(ch.time), label: ch.label.trim() })),
      unlock_at: unlockAtInput ? new Date(unlockAtInput).toISOString() : null,
      category: categoryInput,
      video_url: publicUrlData.publicUrl,
    });

    if (insertError) {
      setError(`Couldn't post: ${insertError.message}`);
      setUploading(false);
      return;
    }

    setCaption("");
    setSoundNameInput("");
    setChapterDraft([]);
    setUnlockAtInput("");
    clearVideoSelection();
    setShowComposer(false);
    setUploading(false);
    loadShorts();
  }

  async function reactToShort(short: Short, type: string) {
    if (!user || isGuest) return;

    if (short.myReaction === type) {
      await removeShortInteraction(user.id, short.id, "react");
    } else {
      await interactWithShort(user.id, short.id, "react", { reaction: type as UniversalReactionKind });
    }

    searchActive ? runSearch(searchQuery) : loadShorts();
  }

  async function toggleSave(shortId: string) {
    if (!user || isGuest) return;

    if (savedIds.has(shortId)) {
      await removeShortInteraction(user.id, shortId, "save");
    } else {
      await interactWithShort(user.id, shortId, "save");
    }

    searchActive ? runSearch(searchQuery) : loadShorts();
  }

  async function toggleRepost(short: Short) {
    if (!user || isGuest) return;

    if (short.repostedByMe) {
      await removeShortInteraction(user.id, short.id, "repost");
    } else {
      await interactWithShort(user.id, short.id, "repost");
    }

    searchActive ? runSearch(searchQuery) : loadShorts();
  }

  async function toggleFollow(short: Short) {
    if (!user || isGuest || short.authorId === user.id) return;

    if (short.isFollowingAuthor) {
      await supabase.from("follows").delete().eq("follower_id", user.id).eq("followed_id", short.authorId);
    } else {
      await supabase.from("follows").insert({ follower_id: user.id, followed_id: short.authorId });
    }

    searchActive ? runSearch(searchQuery) : loadShorts();
  }

  function dislikeAndHide(shortId: string) {
    setShorts((prev) => prev.filter((x) => x.id !== shortId));
  }

  function triggerHeartBurst(shortId: string) {
    setBurstIds((prev) => new Set(prev).add(shortId));
    setTimeout(() => {
      setBurstIds((prev) => {
        const next = new Set(prev);
        next.delete(shortId);
        return next;
      });
    }, 700);
  }

  function handleVideoTap(short: Short) {
    const now = Date.now();
    const lastTap = lastTapRef.current.get(short.id) ?? 0;
    const isDoubleTap = now - lastTap < 300;

    if (isDoubleTap) {
      const existingTimeout = tapTimeoutRef.current.get(short.id);
      if (existingTimeout) clearTimeout(existingTimeout);
      tapTimeoutRef.current.delete(short.id);
      lastTapRef.current.set(short.id, 0);

      if (isGuest) return;
      triggerHeartBurst(short.id);
      if (short.myReaction !== "love") {
        reactToShort(short, "love");
      }
    } else {
      lastTapRef.current.set(short.id, now);
      const timeout = setTimeout(() => {
        const video = videoRefs.current.get(short.id);
        if (video) {
          if (video.paused) video.play().catch(() => {});
          else video.pause();
        }
        tapTimeoutRef.current.delete(short.id);
      }, 300);
      tapTimeoutRef.current.set(short.id, timeout);
    }
  }

  function handleVideoError(shortId: string) {
    setVideoErrors((prev) => new Set(prev).add(shortId));
  }

  function retryVideo(shortId: string) {
    setVideoErrors((prev) => {
      const next = new Set(prev);
      next.delete(shortId);
      return next;
    });
    const video = videoRefs.current.get(shortId);
    if (video) {
      video.load();
      video.play().catch(() => {});
    }
  }

  function formatCount(n: number) {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
    if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
    return String(n);
  }

  if (showComposer) {
    return (
      <div className="module shorts-composer">
        <div className="shorts-composer-header">
          <button className="back-btn" onClick={() => setShowComposer(false)}>
            <BackIcon size={20} />
          </button>
          <h2>New Short</h2>
        </div>

        {videoPreview ? (
          <div className="video-preview-wrap">
            <video src={videoPreview} controls className="video-preview" />
            <button className="remove-image-btn" onClick={clearVideoSelection}>Remove</button>
          </div>
        ) : (
          <label className="attach-video-btn">
            <FilmIcon size={22} />
            <span>Choose a video (max {MAX_VIDEO_SECONDS}s, 50MB)</span>
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              onChange={handleFileSelect}
              style={{ display: "none" }}
            />
          </label>
        )}

        {videoFile && (
          <div className="editor-controls">
            <button className="icon-btn-outline" onClick={() => setShowTrimmer(true)}>
              <ScissorsIcon size={18} /> <span>Trim</span>
            </button>
            <button className="icon-btn-outline" onClick={() => setShowEditor(true)}>
              <span>Edit (rotate/speed/text)</span>
            </button>
          </div>
        )}

        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="Write a caption... use #tags and @mentions"
          className="note-input"
        />

        <input
          type="text"
          value={soundNameInput}
          onChange={(e) => setSoundNameInput(e.target.value)}
          placeholder="Sound name (optional, e.g. 'Original sound')"
          className="auth-input"
        />

        <div className="mode-toggle" style={{ marginBottom: 8 }}>
          <button
            className={categoryInput === "relax" ? "mode-toggle-btn active" : "mode-toggle-btn"}
            onClick={() => setCategoryInput("relax")}
          >
            Relax content
          </button>
          <button
            className={categoryInput === "learn" ? "mode-toggle-btn active" : "mode-toggle-btn"}
            onClick={() => setCategoryInput("learn")}
          >
            Learn content
          </button>
        </div>

        <p className="empty-state" style={{ textAlign: "left", padding: 0, margin: "8px 0 4px" }}>Chapters (optional)</p>
        {chapterDraft.map((ch, i) => (
          <div key={i} className="chapter-composer-row">
            <input
              type="number"
              className="chapter-time"
              placeholder="sec"
              value={ch.time}
              onChange={(e) => {
                const next = [...chapterDraft];
                next[i] = { ...next[i], time: e.target.value };
                setChapterDraft(next);
              }}
            />
            <input
              type="text"
              className="chapter-label"
              placeholder="Chapter label"
              value={ch.label}
              onChange={(e) => {
                const next = [...chapterDraft];
                next[i] = { ...next[i], label: e.target.value };
                setChapterDraft(next);
              }}
            />
            <button
              className="delete-note-btn"
              onClick={() => setChapterDraft(chapterDraft.filter((_, idx) => idx !== i))}
            >
              ×
            </button>
          </div>
        ))}
        <button
          className="icon-btn-outline"
          onClick={() => setChapterDraft([...chapterDraft, { time: "", label: "" }])}
        >
          + Add chapter marker
        </button>

        <p className="empty-state" style={{ textAlign: "left", padding: 0, margin: "8px 0 4px" }}>
          Schedule unlock (optional)
        </p>
        <input
          type="datetime-local"
          className="auth-input"
          value={unlockAtInput}
          onChange={(e) => setUnlockAtInput(e.target.value)}
        />

        {error && <p className="auth-error">{error}</p>}

        <button className="add-note-btn" onClick={uploadShort} disabled={!videoFile || uploading}>
          {uploading ? "Uploading..." : "Post Short"}
        </button>

        {showTrimmer && videoFile && (
          <VideoTrimmer
            file={videoFile}
            onCancel={() => setShowTrimmer(false)}
            onTrimmed={handleTrimmed}
          />
        )}

        {showEditor && videoFile && (
          <VideoEditor
            file={videoFile}
            onCancel={() => setShowEditor(false)}
            onEdited={handleEdited}
          />
        )}
      </div>
    );
  }

  return (
    <div className="module shorts-module" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      <div className="shorts-toolbar">
        <div className="mode-toggle">
          <button
            className={feedMode === "relax" ? "mode-toggle-btn active" : "mode-toggle-btn"}
            onClick={() => setFeedMode("relax")}
          >
            Relax
          </button>
          <button
            className={feedMode === "learn" ? "mode-toggle-btn active" : "mode-toggle-btn"}
            onClick={() => setFeedMode("learn")}
          >
            Learn
          </button>
        </div>
        <button className="icon-only-btn" onClick={() => setShowSearch((v) => !v)}>
          <SearchIcon size={20} className="tag-hashtag" />
        </button>
      </div>

      {showSearch && (
        <div className="shorts-search-bar">
          <SearchIcon size={16} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search captions, #tags, sounds..."
            onKeyDown={(e) => e.key === "Enter" && runSearch(searchQuery)}
          />
          {searchActive && (
            <button className="icon-only-btn" onClick={() => { setSearchQuery(""); loadShorts(); }}>
              <XCircleIcon size={16} />
            </button>
          )}
        </div>
      )}

      {isGuest && <p className="empty-state">Register a real account to post and react to shorts.</p>}
      {loading && <p className="empty-state">Loading shorts...</p>}
      {!loading && shorts.length === 0 && (
        <p className="empty-state">{searchActive ? "No results found." : "No shorts yet. Be the first."}</p>
      )}

      <div className="shorts-scroll-container" ref={containerRef}>
        {shorts.map((s) => (
          <div key={s.id} className="short-item">
            <video
              ref={(el) => {
                if (el) videoRefs.current.set(s.id, el);
                else videoRefs.current.delete(s.id);
              }}
              data-short-id={s.id}
              src={s.videoUrl}
              loop
              playsInline
              className="short-video"
              onClick={() => handleVideoTap(s)}
              onError={() => handleVideoError(s.id)}
            />
            <div className="swipe-hint">
              <span>swipe up</span>
              <div className="swipe-arrow">⌃</div>
            </div>

            {s.chapters.length > 0 && (
              <>
                <button
                  className="chapters-toggle-btn"
                  onClick={() => setChaptersOpenFor(chaptersOpenFor === s.id ? null : s.id)}
                >
                  <ListIcon size={14} /> Chapters
                </button>
                {chaptersOpenFor === s.id && (
                  <div className="chapters-row">
                    {s.chapters.map((ch, i) => (
                      <button
                        key={i}
                        className="chapter-chip"
                        onClick={() => {
                          const video = videoRefs.current.get(s.id);
                          if (video) video.currentTime = ch.time;
                        }}
                      >
                        {ch.time}s · {ch.label}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}

            {burstIds.has(s.id) && (
              <div className="heart-burst">❤️</div>
            )}

            {videoErrors.has(s.id) && (
              <div className="video-error-overlay">
                <p>Video unavailable</p>
                <button className="icon-btn-outline" onClick={() => retryVideo(s.id)}>Retry</button>
              </div>
            )}

            <div style={{ position: "absolute", top: 60, right: 12, zIndex: 20 }}>
              <PostMenu targetType="short" targetId={s.id} onHide={() => dislikeAndHide(s.id)} />
            </div>

            <div className="short-overlay">
              <div className="short-author-row">
                <span className="post-author" onClick={() => openProfile(s.authorId)} style={{ cursor: "pointer" }}>{s.authorName}</span>
                {!isGuest && user && s.authorId !== user.id && (
                  <button
                    className={s.isFollowingAuthor ? "follow-chip following" : "follow-chip"}
                    onClick={() => toggleFollow(s)}
                  >
                    {s.isFollowingAuthor ? "Following" : "Follow"}
                  </button>
                )}
                <span className="post-username">· {formatCount(s.viewCount)} views</span>
              </div>
              {s.isHot && <span className="hot-badge">🔥 HOT</span>}
              {s.caption && <p className="short-caption">{renderCaption(s.caption, handleTagTap)}</p>}
              {Object.keys(s.reactionBreakdown).length > 0 && (
                <div className="reaction-breakdown-bar">
                  {Object.entries(s.reactionBreakdown).map(([type, count]) => {
                    const total = Object.values(s.reactionBreakdown).reduce((a, b) => a + b, 0);
                    const colors: Record<string, string> = {
                      like: "#F5A623", love: "#FF3B5C", laugh: "#FFD93D",
                      wow: "#4FC3F7", sad: "#9E9E9E", angry: "#FF6B00",
                    };
                    return (
                      <div
                        key={type}
                        className="reaction-breakdown-segment"
                        style={{ width: `${(count / total) * 100}%`, background: colors[type] ?? "#888" }}
                      />
                    );
                  })}
                </div>
              )}
              {s.soundName && (
                <div className="sound-tag" onClick={() => handleSoundTap(s.soundName!)}>
                  <div className="sound-tag-diamond" />
                  <span>{s.soundName}</span>
                </div>
              )}
            </div>

            <div className="short-actions">
              <ReactionPicker
                myReaction={s.myReaction}
                count={s.likeCount}
                disabled={isGuest}
                variant="short"
                onReact={(type) => reactToShort(s, type)}
              />
              <button
                className="short-comment-btn"
                onClick={() => setOpenCommentsFor(s.id)}
              >
                <CommentIcon size={26} />
                <span>{s.commentCount}</span>
              </button>
              <button
                className={s.repostedByMe ? "short-comment-btn reposted" : "short-comment-btn"}
                onClick={() => toggleRepost(s)}
                disabled={isGuest}
              >
                <RepostIcon size={26} />
                <span>{formatCount(s.repostCount)}</span>
              </button>
              <button
                className="short-comment-btn"
                onClick={() => toggleSave(s.id)}
                disabled={isGuest}
              >
                <BookmarkIcon size={26} filled={savedIds.has(s.id)} />
              </button>
              <button className="short-comment-btn" onClick={() => setShareTarget(s.caption || "Check this short out")}>
                <ShareIcon size={26} />
              </button>
              <button
                className="short-comment-btn dislike-btn"
                onClick={() => dislikeAndHide(s.id)}
                disabled={isGuest}
              >
                <BrokenHeartIcon size={24} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {openCommentsFor && (
        <CommentPanel
          targetType="short"
          targetId={openCommentsFor}
          onClose={() => {
            setOpenCommentsFor(null);
            searchActive ? runSearch(searchQuery) : loadShorts();
          }}
        />
      )}

      {shareTarget && (
        <ShareSheet title={shareTarget} onClose={() => setShareTarget(null)} />
      )}

      {showOnboarding && <ShortsOnboarding onDismiss={dismissOnboarding} />}
    </div>
  );
}

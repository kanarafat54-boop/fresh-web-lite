import { useEffect, useMemo, useRef, useState } from "react";
import { useLayout } from "../../../app/contexts/useLayout";
import { useProfileNav } from "../../profile/context/ProfileNavContext";
import { supabase } from "../../../lib/supabase";
import { useFreshId } from "../../fresh-id/context/FreshIdContext";
import { CommentPanel } from "../../comments/components/CommentPanel";
import { getSocialAuthorIds, setAuthorFollow } from "../core/social";
import "./FreshFlowLongVideos.css";

type VideoItem = {
  id: string; authorId: string; title: string; description: string;
  videoUrl: string; posterUrl: string | null; createdAt: string;
  authorName: string; username: string; likes: number; comments: number;
};
type Category = "Discover" | "Movies & Series" | "Documentaries" | "Education" | "Events" | "Following";
const CATEGORIES: Category[] = ["Discover", "Movies & Series", "Documentaries", "Education", "Events", "Following"];
const SAVED_KEY = "fresh-flow-long-video-saved-v1";
const PROGRESS_KEY = "fresh-flow-long-video-progress-v1";
const DURATION_KEY = "fresh-flow-long-video-duration-v1";
const PLAYBACK_KEY = "fresh-flow-long-video-playback-v1";

function readIds(key: string): string[] {
  try { const value = JSON.parse(localStorage.getItem(key) || "[]"); return Array.isArray(value) ? value.filter((x): x is string => typeof x === "string") : []; } catch { return []; }
}
function readProgress(): Record<string, number> {
  try { const value = JSON.parse(localStorage.getItem(PROGRESS_KEY) || "{}"); return value && typeof value === "object" ? value : {}; } catch { return {}; }
}
function readDurations(): Record<string, number> {
  try { const value = JSON.parse(localStorage.getItem(DURATION_KEY) || "{}"); return value && typeof value === "object" ? value : {}; } catch { return {}; }
}
function readPlaybackPreferences() {
  const defaults = { autoplay: true, dataSaver: false, playbackSpeed: "1" };
  try {
    const value = JSON.parse(localStorage.getItem(PLAYBACK_KEY) || "null");
    if (!value || typeof value !== "object") return defaults;
    const speeds = ["0.75", "1", "1.25", "1.5", "1.75", "2"];
    return {
      autoplay: typeof value.autoplay === "boolean" ? value.autoplay : defaults.autoplay,
      dataSaver: typeof value.dataSaver === "boolean" ? value.dataSaver : defaults.dataSaver,
      playbackSpeed: speeds.includes(value.playbackSpeed) ? value.playbackSpeed : defaults.playbackSpeed,
    };
  } catch { return defaults; }
}
function categoryFor(video: VideoItem): Exclude<Category, "Discover" | "Following"> {
  const text = (video.title + " " + video.description).toLowerCase();
  if (/movie|film|series|episode|season|cinema/.test(text)) return "Movies & Series";
  if (/documentary|documentaries|investigation|history|wildlife/.test(text)) return "Documentaries";
  if (/lesson|course|learn|tutorial|education|lecture|class/.test(text)) return "Education";
  return "Events";
}

export default function FreshFlowLongVideos() {
  const { user, isGuest } = useFreshId();
  const { setActiveRoute, openNotifications } = useLayout();
  const { openProfile } = useProfileNav();
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [libraryVideos, setLibraryVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [category, setCategory] = useState<Category>("Discover");
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<VideoItem | null>(null);
  const [requestedVideoId, setRequestedVideoId] = useState<string | null>(() => {
    try {
      const requested = sessionStorage.getItem("fresh-flow-long-video-deep-link");
      if (requested) sessionStorage.removeItem("fresh-flow-long-video-deep-link");
      return requested;
    } catch { return null; }
  });
  const [shareNotice, setShareNotice] = useState("");
  const [saved, setSaved] = useState<string[]>(() => readIds(SAVED_KEY));
  const [likedIds, setLikedIds] = useState<string[]>([]);
  const [progress, setProgress] = useState<Record<string, number>>(() => readProgress());
  const [durations, setDurations] = useState<Record<string, number>>(() => readDurations());
  const [followingIds, setFollowingIds] = useState<string[]>([]);
  const [followedIds, setFollowedIds] = useState<string[]>([]);
  const [channelFor, setChannelFor] = useState<VideoItem | null>(null);
  const [commentsFor, setCommentsFor] = useState<string | null>(null);
  const [detailsFor, setDetailsFor] = useState<VideoItem | null>(null);
  const [panel, setPanel] = useState<"discover" | "explore" | "library" | "settings">("discover");
  const [autoplay, setAutoplay] = useState(() => readPlaybackPreferences().autoplay);
  const [dataSaver, setDataSaver] = useState(() => readPlaybackPreferences().dataSaver);
  const [playbackSpeed, setPlaybackSpeed] = useState(() => readPlaybackPreferences().playbackSpeed);
  const playerRef = useRef<HTMLVideoElement>(null);
  const progressWriteAt = useRef(0);

  async function load() {
    setLoading(true); setError("");
    try {
      const [{ data, error: loadError }, followIds, savedResult, followingResult] = await Promise.all([
        supabase.from("posts").select("id, author_id, content, image_url, video_url, like_count, comment_count, created_at")
          .not("video_url", "is", null).order("created_at", { ascending: false }).limit(60),
        user && !isGuest ? getSocialAuthorIds(user.id) : Promise.resolve([] as string[]),
        user && !isGuest
          ? supabase.from("saved_posts").select("post_id").eq("user_id", user.id)
          : Promise.resolve({ data: null, error: null }),
        user && !isGuest
          ? supabase.from("follows").select("followed_id").eq("follower_id", user.id)
          : Promise.resolve({ data: null, error: null }),
      ]);
      if (loadError) throw loadError;
      if (savedResult.error) throw savedResult.error;
      if (followingResult.error) throw followingResult.error;
      const recentRows = (data ?? []).filter((row: any) => typeof row.video_url === "string" && /^https?:\/\//i.test(row.video_url));
      const savedIds = user && !isGuest ? (savedResult.data ?? []).map((row: any) => row.post_id) : readIds(SAVED_KEY);
      const libraryIds = [...new Set([...savedIds, ...Object.keys(progress), ...(requestedVideoId ? [requestedVideoId] : [])])];
      const recentIds = new Set(recentRows.map((row: any) => row.id));
      const missingLibraryIds = libraryIds.filter((id) => !recentIds.has(id));
      let extraRows: any[] = [];
      if (missingLibraryIds.length) {
        const extraResult = await supabase.from("posts")
          .select("id, author_id, content, image_url, video_url, like_count, comment_count, created_at")
          .in("id", missingLibraryIds).not("video_url", "is", null);
        if (extraResult.error) throw extraResult.error;
        extraRows = (extraResult.data ?? []).filter((row: any) => typeof row.video_url === "string" && /^https?:\/\//i.test(row.video_url));
      }
      const allRowsById = new Map([...recentRows, ...extraRows].map((row: any) => [row.id, row]));
      const allRows = [...allRowsById.values()];
      const authorIds = [...new Set(allRows.map((row: any) => row.author_id).filter(Boolean))];
      let profiles: any[] = [];
      if (authorIds.length) {
        const result = await supabase.from("user_public_profiles").select("id, full_name, username").in("id", authorIds);
        if (result.error) throw result.error;
        profiles = result.data ?? [];
      }
      const byId = new Map(profiles.map((p: any) => [p.id, p]));
      if (user && !isGuest && allRows.length) {
        const likedResult = await supabase.from("post_likes").select("post_id").eq("user_id", user.id).in("post_id", allRows.map((row: any) => row.id));
        setLikedIds(likedResult.error ? [] : (likedResult.data ?? []).map((row: any) => row.post_id));
      } else {
        setLikedIds([]);
      }
      const toVideoItem = (row: any): VideoItem => {
        const profile = byId.get(row.author_id);
        const title = String(row.content ?? "").trim();
        return { id: row.id, authorId: row.author_id, title: title.slice(0, 110) || "Untitled video",
          description: title, videoUrl: row.video_url, posterUrl: row.image_url ?? null,
          createdAt: row.created_at, authorName: profile?.full_name ?? "Fresh creator",
          username: profile?.username ?? "creator", likes: row.like_count ?? 0, comments: row.comment_count ?? 0 };
      };
      setVideos(recentRows.map(toVideoItem));
      setLibraryVideos(allRows.map(toVideoItem));
      setFollowingIds(followIds);
      setSaved(savedIds);
      if (user && !isGuest) setFollowedIds((followingResult.data ?? []).map((row: any) => row.followed_id));
      else setFollowedIds([]);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Long Videos could not connect to the media library. Check your connection and retry.");
    } finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, [user?.id, isGuest]);
  useEffect(() => {
    try { localStorage.setItem(PLAYBACK_KEY, JSON.stringify({ autoplay, dataSaver, playbackSpeed })); } catch { /* device storage unavailable */ }
  }, [autoplay, dataSaver, playbackSpeed]);
  useEffect(() => {
    if (!requestedVideoId || loading) return;
    const requested = libraryVideos.find((video) => video.id === requestedVideoId);
    if (requested) setActive(requested);
    else setError("That shared video is not available in the current public library.");
    setRequestedVideoId(null);
  }, [requestedVideoId, libraryVideos, loading]);

  const visible = useMemo(() => videos.filter((video) => {
    const matchesCategory = category === "Discover" ||
      (category === "Following" ? followingIds.includes(video.authorId) : categoryFor(video) === category);
    const text = (video.title + " " + video.description + " " + video.authorName + " " + video.username).toLowerCase();
    return matchesCategory && (!query.trim() || text.includes(query.toLowerCase().trim()));
  }), [videos, category, query, followingIds]);
  const resume = libraryVideos.filter((video) => (progress[video.id] ?? 0) > 0).slice(0, 8);
  const featured = visible[0] ?? null;
  const rest = visible.slice(1);

  async function toggleLike(video: VideoItem) {
    if (!user || isGuest) { setActiveRoute("auth-signin"); return; }
    const wasLiked = likedIds.includes(video.id);
    setLikedIds((current) => wasLiked ? current.filter((id) => id !== video.id) : [...current, video.id]);
    const result = wasLiked
      ? await supabase.from("post_likes").delete().eq("post_id", video.id).eq("user_id", user.id)
      : await supabase.from("post_likes").insert({ post_id: video.id, user_id: user.id });
    if (result.error) {
      setLikedIds((current) => wasLiked ? [...current, video.id] : current.filter((id) => id !== video.id));
      setError("Your reaction could not be saved. Please retry.");
      return;
    }
    const countResult = await supabase.from("posts").select("like_count").eq("id", video.id).maybeSingle();
    const nextCount = typeof countResult.data?.like_count === "number"
      ? countResult.data.like_count
      : Math.max(0, video.likes + (wasLiked ? -1 : 1));
    setVideos((current) => current.map((item) => item.id === video.id ? { ...item, likes: nextCount } : item));
    setLibraryVideos((current) => current.map((item) => item.id === video.id ? { ...item, likes: nextCount } : item));
    setActive((current) => current?.id === video.id ? { ...current, likes: nextCount } : current);
    setDetailsFor((current) => current?.id === video.id ? { ...current, likes: nextCount } : current);
    setChannelFor((current) => current?.id === video.id ? { ...current, likes: nextCount } : current);
  }

  async function toggleSave(video: VideoItem) {
    const wasSaved = saved.includes(video.id);
    const next = wasSaved ? saved.filter((id) => id !== video.id) : [...saved, video.id];
    setSaved(next);
    if (user && !isGuest) {
      const result = wasSaved
        ? await supabase.from("saved_posts").delete().eq("post_id", video.id).eq("user_id", user.id)
        : await supabase.from("saved_posts").insert({ post_id: video.id, user_id: user.id });
      if (result.error) { setSaved(saved); setError("Your video library could not be updated. Please retry."); return; }
    } else {
      try { localStorage.setItem(SAVED_KEY, JSON.stringify(next)); }
      catch { setError("This device could not save your library. Free some storage and retry."); }
    }
  }
  function saveDuration(videoId: string, duration: number) {
    if (!Number.isFinite(duration) || duration <= 0) return;
    const next = { ...durations, [videoId]: duration };
    setDurations(next);
    try { localStorage.setItem(DURATION_KEY, JSON.stringify(next)); } catch { /* device storage unavailable */ }
  }
  function saveProgress(video: VideoItem, currentTime: number, force = false) {
    if (!Number.isFinite(currentTime) || currentTime < 1) return;
    const now = Date.now();
    if (!force && now - progressWriteAt.current < 4000) return;
    progressWriteAt.current = now;
    const next = { ...progress, [video.id]: currentTime };
    setProgress(next);
    try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(next)); } catch { /* device storage unavailable */ }
  }
  function clearProgress(videoId: string) {
    const next = { ...progress }; delete next[videoId];
    setProgress(next);
    try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(next)); } catch { /* device storage unavailable */ }
  }
  async function toggleFollow(video: VideoItem) {
    if (!user || isGuest) { setActiveRoute("auth-signin"); return; }
    const wasFollowing = followedIds.includes(video.authorId);
    try {
      await setAuthorFollow(user.id, video.authorId, !wasFollowing);
      setFollowedIds((current) => wasFollowing ? current.filter((id) => id !== video.authorId) : [...current, video.authorId]);
      setFollowingIds(await getSocialAuthorIds(user.id));
    } catch (followError) {
      setError(followError instanceof Error ? followError.message : "Creator follow status could not be updated.");
    }
  }
  async function shareVideo(video: VideoItem) {
    const url = new URL(`/fresh-flow?videoId=${encodeURIComponent(video.id)}`, window.location.origin).toString();
    setShareNotice("");
    try {
      if (typeof navigator.share === "function") {
        await navigator.share({ title: video.title, text: video.description, url });
        setShareNotice("Share sheet opened.");
      } else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        setShareNotice("Long Video link copied.");
      } else {
        setShareNotice(url);
      }
    } catch (shareError) {
      if (shareError instanceof Error && shareError.name === "AbortError") return;
      setShareNotice("The video link could not be shared from this browser.");
    }
  }
  function openPlayer(video: VideoItem) { setActive(video); }
  function closePlayer() { if (active && playerRef.current) saveProgress(active, playerRef.current.currentTime, true); setActive(null); }
  function resumeVideo(video: VideoItem) {
    setActive(video);
    window.setTimeout(() => {
      const player = playerRef.current; const point = progress[video.id];
      if (player && point > 0) { player.currentTime = point; void player.play().catch(() => undefined); }
    }, 350);
  }
  function openCreatorStudio(startTab: "publish" | "monetize" = "publish") {
    try {
      sessionStorage.setItem("fresh-flow-create-intent", JSON.stringify({ action: "long-video", requestedAt: new Date().toISOString() }));
      sessionStorage.setItem("fresh-creator-start-tab", startTab);
    } catch { /* ignore */ }
    setActiveRoute(isGuest ? "auth-signin" : "creator");
  }
  function openCreatorWorkspace() {
    try {
      sessionStorage.setItem("fresh-flow-create-intent", JSON.stringify({ action: "creator-studio", requestedAt: new Date().toISOString() }));
      sessionStorage.setItem("fresh-creator-start-tab", "publish");
    } catch { /* ignore */ }
    setActiveRoute(isGuest ? "auth-signin" : "creator");
  }

  const savedVideos = libraryVideos.filter((video) => saved.includes(video.id));
  const channelVideos = channelFor ? libraryVideos.filter((video) => video.authorId === channelFor.authorId) : [];
  if (channelFor) return <section className="fresh-long" aria-label="Creator channel">
    <div className="fresh-long-heading"><div><span className="fresh-long-eyebrow">FRESH FLOW / CREATOR CHANNEL</span><h1>{channelFor.authorName}</h1><p>@{channelFor.username} · {channelVideos.length} videos in this view</p></div><button type="button" onClick={() => setChannelFor(null)}>Back to Discover</button></div>
    <div className="fresh-long-channel-actions">{user?.id === channelFor.authorId ? <span className="fresh-long-channel-self">Your channel</span> : <button type="button" onClick={() => void toggleFollow(channelFor)}>{followedIds.includes(channelFor.authorId) ? "Following" : user && !isGuest ? "Follow creator" : "Sign in to follow"}</button>}<button type="button" onClick={() => { setChannelFor(null); openProfile(channelFor.authorId); }}>Open Fresh ID profile</button></div>
    <section className="fresh-long-section"><div className="fresh-long-section-title"><h2>Videos from @{channelFor.username}</h2><span>{channelVideos.length} videos</span></div><div className="fresh-long-grid">{channelVideos.map((video) => <article className="fresh-long-card" key={video.id}><button className="fresh-long-card-media" type="button" onClick={() => openPlayer(video)} aria-label={`Play ${video.title}`}>{video.posterUrl ? <img src={video.posterUrl} alt="" /> : <span>▶</span>}<b>▶</b></button><div className="fresh-long-card-copy"><h3>{video.title}</h3><p>{video.description}</p><div><button type="button" onClick={() => openPlayer(video)}>Watch</button><button type="button" onClick={() => setDetailsFor(video)}>Details</button><button type="button" onClick={() => void shareVideo(video)}>Share</button><button type="button" aria-pressed={likedIds.includes(video.id)} onClick={() => void toggleLike(video)}>{likedIds.includes(video.id) ? "♥" : "♡"} {video.likes}</button><button type="button" onClick={() => void toggleSave(video)}>{saved.includes(video.id) ? "Saved" : "Save"}</button></div></div></article>)}</div></section>
  </section>;
  if (panel === "explore") return <section className="fresh-long" aria-label="Explore Long Videos">
    <div className="fresh-long-heading"><div><span className="fresh-long-eyebrow">FRESH FLOW / EXPLORE</span><h1>Explore Long Videos</h1><p>Choose a world, then discover videos from across Fresh Flow.</p></div><button type="button" onClick={() => setPanel("discover")}>Back to Discover</button></div>
    <div className="fresh-long-explore-grid">{CATEGORIES.map((item) => <button key={item} type="button" onClick={() => { setCategory(item); setPanel("discover"); }}><strong>{item}</strong><span>{item === "Following" ? "Creators connected to your social graph" : item === "Movies & Series" ? "Films and episodic stories" : item === "Documentaries" ? "Real stories and investigations" : item === "Education" ? "Lessons, explainers and tutorials" : item === "Events" ? "Performances, talks and experiences" : "Latest published long-form videos"}</span></button>)}</div>
  </section>;
  if (panel === "library") return <section className="fresh-long" aria-label="Long Videos library">
    <div className="fresh-long-heading"><div><span className="fresh-long-eyebrow">FRESH FLOW / YOUR SPACE</span><h1>Your Library</h1><p>Saved videos and your continue-watching list.</p></div><button type="button" onClick={() => setPanel("discover")}>Back to Discover</button></div>
    {resume.length > 0 && <section className="fresh-long-section"><div className="fresh-long-section-title"><h2>Continue watching</h2><span>Progress saved on this device</span></div><div className="fresh-long-rail">{resume.map((video) => <button key={video.id} type="button" className="fresh-long-resume-card" onClick={() => resumeVideo(video)}><span className="fresh-long-thumb">{video.posterUrl ? <img src={video.posterUrl} alt="" /> : "▶"}<i style={{ width: `${durations[video.id] > 0 ? Math.min(100, Math.max(2, (progress[video.id] / durations[video.id]) * 100)) : 0}%` }} /></span><strong>{video.title}</strong><small>Resume at {Math.floor(progress[video.id] / 60)}:{String(Math.floor(progress[video.id] % 60)).padStart(2, "0")}</small></button>)}</div></section>}
    <section className="fresh-long-section"><div className="fresh-long-section-title"><h2>Watch later</h2><span>{savedVideos.length} saved</span></div>{savedVideos.length ? <div className="fresh-long-grid">{savedVideos.map((video) => <article className="fresh-long-card" key={video.id}><button className="fresh-long-card-media" type="button" onClick={() => openPlayer(video)} aria-label={`Play ${video.title}`}>{video.posterUrl ? <img src={video.posterUrl} alt="" /> : <span>▶</span>}<b>▶</b></button><div className="fresh-long-card-copy"><h3>{video.title}</h3><p>{video.authorName}</p><div><button type="button" onClick={() => openPlayer(video)}>Watch</button><button type="button" onClick={() => void toggleSave(video)}>Remove</button></div></div></article>)}</div> : <p className="fresh-long-state">Your Watch Later library is empty. Save a video to find it here.</p>}</section>
    <p className="fresh-long-honesty">{user && !isGuest ? "Saved videos are synced through Fresh ID." : "Guest saves are stored on this device. Sign in to sync your library."} Watch progress is stored on this device.</p>
  </section>;
  if (panel === "settings") return <section className="fresh-long" aria-label="Long Videos settings">
    <div className="fresh-long-heading"><div><span className="fresh-long-eyebrow">FRESH FLOW / PREFERENCES</span><h1>Playback Settings</h1><p>Control playback behavior and data use.</p></div><button type="button" onClick={() => setPanel("discover")}>Back to Discover</button></div>
    <div className="fresh-long-settings">
      <label><span><strong>Autoplay</strong><small>Start a video automatically when you open the cinema player.</small></span><input type="checkbox" checked={autoplay} onChange={(event) => setAutoplay(event.target.checked)} /></label>
      <label><span><strong>Data saver</strong><small>Reduce preloading on mobile data. This does not change the creator's source quality.</small></span><input type="checkbox" checked={dataSaver} onChange={(event) => setDataSaver(event.target.checked)} /></label>
      <label><span><strong>Preferred playback speed</strong><small>Applied when the browser player loads a video.</small></span><select value={playbackSpeed} onChange={(event) => setPlaybackSpeed(event.target.value)}><option value="0.75">0.75×</option><option value="1">Normal</option><option value="1.25">1.25×</option><option value="1.5">1.5×</option><option value="1.75">1.75×</option><option value="2">2×</option></select></label>
    </div>
    <p className="fresh-long-honesty">These playback preferences are saved on this device. Captions and quality selection appear when the source video provides those tracks or renditions.</p>
  </section>;

  return <section className="fresh-long" aria-label="Fresh Flow Long Videos">
    <div className="fresh-long-heading"><div><span className="fresh-long-eyebrow">FRESH FLOW / CINEMA</span><h1>Long Videos</h1><p>Stories worth staying for. Films, learning, documentaries and more.</p></div><span className="fresh-long-mark" aria-hidden="true">▶</span></div>
    {shareNotice && <p className="fresh-long-share-notice" role="status">{shareNotice}</p>}
    <div className="fresh-long-tools" aria-label="Long Videos tools">
      <button type="button" className={panel === "discover" ? "active" : ""} onClick={() => setPanel("discover")}>Discover</button>
      <button type="button" onClick={() => setPanel("explore")}>Explore</button>
      <button type="button" onClick={() => setPanel("library")}>Your Library</button>
      <button type="button" onClick={openCreatorWorkspace}>Creator Studio</button>
      <button type="button" onClick={() => openCreatorStudio("publish")}>Upload video</button>
      <button type="button" onClick={() => openCreatorStudio("monetize")}>Monetization</button>
      <button type="button" onClick={() => openNotifications()}>Notifications</button>
      <button type="button" onClick={() => setActiveRoute("ai")}>Fresh AI</button>
      <button type="button" onClick={() => setPanel("settings")}>Settings</button>
    </div>
    <div className="fresh-long-search"><span aria-hidden="true">⌕</span><input value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search long videos" placeholder="Search films, creators, topics…" /><button type="button" onClick={() => setQuery("")} disabled={!query}>Clear</button></div>
    <nav className="fresh-long-categories" aria-label="Long video categories">{CATEGORIES.map((item) => <button key={item} type="button" className={category === item ? "active" : ""} aria-pressed={category === item} onClick={() => setCategory(item)}>{item}</button>)}</nav>
    {loading && <p className="fresh-long-state" role="status">Loading videos from Fresh Flow…</p>}
    {error && <div className="fresh-long-state is-error" role="alert">{error}<button type="button" onClick={() => void load()}>Try again</button></div>}
    {!loading && !error && videos.length === 0 && <div className="fresh-long-empty"><span>▶</span><h2>Your cinema starts here</h2><p>No published videos are available in the connected media library yet. When creators publish video posts, they will appear here.</p><button type="button" className="primary" onClick={() => openCreatorStudio("publish")}>{user && !isGuest ? "Upload your first long video" : "Sign in to publish a long video"}</button></div>}
    {!loading && !error && videos.length > 0 && visible.length === 0 && <div className="fresh-long-state">{category === "Following" ? "Videos from creators you follow will appear here. Follow creators to build this feed." : "No videos match this search or category."}</div>}
    {featured && <article className="fresh-long-feature">
      <button className="fresh-long-feature-media" type="button" onClick={() => openPlayer(featured)} aria-label={`Play ${featured.title}`}>
        {featured.posterUrl ? <img src={featured.posterUrl} alt="" /> : <span className="fresh-long-poster-fallback">▶</span>}<span className="fresh-long-play">▶</span><span className="fresh-long-feature-label">LATEST ON FRESH FLOW</span>
      </button>
      <div className="fresh-long-feature-copy"><span className="fresh-long-byline">@{featured.username} · {categoryFor(featured)}</span><h2>{featured.title}</h2><button className="fresh-long-author-link" type="button" onClick={() => setChannelFor(featured)}>{featured.authorName}</button><p>{featured.description}</p><div className="fresh-long-actions"><button className="primary" type="button" onClick={() => openPlayer(featured)}>▶ Watch now</button><button type="button" onClick={() => setDetailsFor(featured)}>Details</button><button type="button" onClick={() => void shareVideo(featured)}>Share</button><button type="button" aria-pressed={likedIds.includes(featured.id)} onClick={() => void toggleLike(featured)}>{likedIds.includes(featured.id) ? "♥ Liked" : "♡ Like"} · {featured.likes}</button><button type="button" onClick={() => void toggleSave(featured)}>{saved.includes(featured.id) ? "✓ Saved" : "+ Watch later"}</button><button type="button" onClick={() => setCommentsFor(featured.id)}>Comments · {featured.comments}</button></div></div>
    </article>}
    {resume.length > 0 && <section className="fresh-long-section"><div className="fresh-long-section-title"><h2>Continue watching</h2><span>Your saved progress on this device</span></div><div className="fresh-long-rail">{resume.map((video) => <button key={video.id} type="button" className="fresh-long-resume-card" onClick={() => resumeVideo(video)}><span className="fresh-long-thumb">{video.posterUrl ? <img src={video.posterUrl} alt="" /> : "▶"}<i style={{ width: `${Math.min(100, Math.max(2, (progress[video.id] / 3600) * 100))}%` }} /></span><strong>{video.title}</strong><small>Resume at {Math.floor(progress[video.id] / 60)}:{String(Math.floor(progress[video.id] % 60)).padStart(2, "0")}</small></button>)}</div></section>}
    <section className="fresh-long-section"><div className="fresh-long-section-title"><h2>{category === "Discover" ? "Latest long videos" : category}</h2><span>{visible.length} videos</span></div><div className="fresh-long-grid">{(featured ? rest : visible).map((video) => <article className="fresh-long-card" key={video.id}><button className="fresh-long-card-media" type="button" onClick={() => openPlayer(video)} aria-label={`Play ${video.title}`}>{video.posterUrl ? <img src={video.posterUrl} alt="" /> : <span>▶</span>}<b>▶</b></button><div className="fresh-long-card-copy"><span>@{video.username} · {categoryFor(video)}</span><h3>{video.title}</h3><button className="fresh-long-author-link" type="button" onClick={() => setChannelFor(video)}>{video.authorName}</button><div><button type="button" onClick={() => openPlayer(video)}>Watch</button><button type="button" onClick={() => setDetailsFor(video)}>Details</button><button type="button" aria-pressed={likedIds.includes(video.id)} onClick={() => void toggleLike(video)}>{likedIds.includes(video.id) ? "♥" : "♡"} {video.likes}</button><button type="button" onClick={() => void toggleSave(video)}>{saved.includes(video.id) ? "Saved" : "Save"}</button><button type="button" onClick={() => setCommentsFor(video.id)}>Comments {video.comments}</button></div></div></article>)}</div></section>
    <section className="fresh-long-section fresh-long-library"><div><h2>Your library</h2><p>{saved.length} saved videos · {user && !isGuest ? "synced to your Fresh ID" : "saved on this device"}</p></div><button type="button" onClick={() => { setCategory("Discover"); setQuery(""); }}>Browse all videos</button></section>
    {active && <div className="fresh-long-player" role="dialog" aria-modal="true" aria-label={active.title} onKeyDown={(event) => { if (event.key === "Escape") closePlayer(); }}>
      <div className="fresh-long-player-bar"><button type="button" onClick={closePlayer} aria-label="Close cinema player">✕</button><div><strong>{active.title}</strong><small>@{active.username}</small></div><button type="button" onClick={() => void toggleSave(active)}>{saved.includes(active.id) ? "Saved" : "Save"}</button></div>
      <div className="fresh-long-player-stage"><video ref={playerRef} key={active.id} src={active.videoUrl} poster={active.posterUrl ?? undefined} controls playsInline autoPlay={autoplay && !dataSaver} preload={dataSaver ? "none" : "metadata"} onLoadedMetadata={(e) => { e.currentTarget.playbackRate = Number(playbackSpeed); saveDuration(active.id, e.currentTarget.duration); }} onTimeUpdate={(e) => saveProgress(active, e.currentTarget.currentTime)} onEnded={() => clearProgress(active.id)} onError={() => setError("This video could not be played. The creator's media URL may be unavailable.")} /><div className="fresh-long-player-meta"><span>FRESH FLOW CINEMA</span><h2>{active.title}</h2><p>{active.description}</p><button type="button" aria-pressed={likedIds.includes(active.id)} onClick={() => void toggleLike(active)}>{likedIds.includes(active.id) ? "♥ Liked" : "♡ Like"} · {active.likes}</button><button type="button" onClick={() => void shareVideo(active)}>Share</button><button type="button" onClick={() => { setCommentsFor(active.id); closePlayer(); }}>Open discussion · {active.comments}</button></div></div>
    </div>}
    {detailsFor && <div className="fresh-long-details" role="dialog" aria-modal="true" aria-label={`Details for ${detailsFor.title}`}><div className="fresh-long-details-sheet"><button type="button" onClick={() => setDetailsFor(null)} aria-label="Close video details">✕</button><span className="fresh-long-eyebrow">VIDEO DETAILS</span><h2>{detailsFor.title}</h2><p>{detailsFor.description}</p><button type="button" className="fresh-long-author-link" onClick={() => { setDetailsFor(null); setChannelFor(detailsFor); }}>Open @{detailsFor.username} creator channel</button><div className="fresh-long-actions"><button className="primary" type="button" onClick={() => { openPlayer(detailsFor); setDetailsFor(null); }}>Watch now</button><button type="button" aria-pressed={likedIds.includes(detailsFor.id)} onClick={() => void toggleLike(detailsFor)}>{likedIds.includes(detailsFor.id) ? "♥ Liked" : "♡ Like"} · {detailsFor.likes}</button><button type="button" onClick={() => void shareVideo(detailsFor)}>Share video</button><button type="button" onClick={() => void toggleSave(detailsFor)}>{saved.includes(detailsFor.id) ? "Saved" : "Watch later"}</button><button type="button" onClick={() => { setCommentsFor(detailsFor.id); setDetailsFor(null); }}>Comments · {detailsFor.comments}</button></div></div></div>}
    {commentsFor && <div className="fresh-long-comments"><button type="button" onClick={() => setCommentsFor(null)}>Close discussion</button><CommentPanel targetType="post" targetId={commentsFor} onClose={() => setCommentsFor(null)} /></div>}
    <p className="fresh-long-honesty">Video playback uses published video URLs from Fresh Flow’s existing posts store. Saved items sync through Fresh ID for signed-in users; watch progress remains on this device. Film licensing, series metadata, adaptive streaming, downloads and server-synced watch history are not yet connected.</p>
  </section>;
}

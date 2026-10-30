import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { useFreshId } from "../../fresh-id/context/FreshIdContext";
import { CommentPanel } from "../../comments/components/CommentPanel";
import "./FreshFlowLongVideos.css";

type VideoItem = {
  id: string; authorId: string; title: string; description: string;
  videoUrl: string; posterUrl: string | null; createdAt: string;
  authorName: string; username: string; likes: number; comments: number;
};
type Category = "For You" | "Movies & Series" | "Documentaries" | "Education" | "Events" | "Following";

const CATEGORIES: Category[] = ["For You", "Movies & Series", "Documentaries", "Education", "Events", "Following"];
const SAVED_KEY = "fresh-flow-long-video-saved-v1";
const PROGRESS_KEY = "fresh-flow-long-video-progress-v1";

function readIds(key: string): string[] {
  try { const value = JSON.parse(localStorage.getItem(key) || "[]"); return Array.isArray(value) ? value.filter((x): x is string => typeof x === "string") : []; } catch { return []; }
}
function readProgress(): Record<string, number> {
  try { const value = JSON.parse(localStorage.getItem(PROGRESS_KEY) || "{}"); return value && typeof value === "object" ? value : {}; } catch { return {}; }
}
function categoryFor(video: VideoItem): Exclude<Category, "For You" | "Following"> {
  const text = (video.title + " " + video.description).toLowerCase();
  if (/movie|film|series|episode|season|cinema/.test(text)) return "Movies & Series";
  if (/documentary|documentaries|investigation|history|wildlife/.test(text)) return "Documentaries";
  if (/lesson|course|learn|tutorial|education|lecture|class/.test(text)) return "Education";
  return "Events";
}

export default function FreshFlowLongVideos() {
  const { user, isGuest } = useFreshId();
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [category, setCategory] = useState<Category>("For You");
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<VideoItem | null>(null);
  const [saved, setSaved] = useState<string[]>(() => readIds(SAVED_KEY));
  const [progress, setProgress] = useState<Record<string, number>>(() => readProgress());
  const [commentsFor, setCommentsFor] = useState<string | null>(null);
  const playerRef = useRef<HTMLVideoElement>(null);

  async function load() {
    setLoading(true); setError("");
    const { data, error: loadError } = await supabase.from("posts")
      .select("id, author_id, content, image_url, video_url, like_count, comment_count, created_at")
      .not("video_url", "is", null).order("created_at", { ascending: false }).limit(60);
    if (loadError) { setError("Long Videos could not connect to the media library. Check your connection and retry."); setLoading(false); return; }
    const rows = (data ?? []).filter((row: any) => typeof row.video_url === "string" && /^https?:\/\//i.test(row.video_url));
    const authorIds = [...new Set(rows.map((row: any) => row.author_id).filter(Boolean))];
    let profiles: any[] = [];
    if (authorIds.length) {
      const result = await supabase.from("user_public_profiles").select("id, full_name, username").in("id", authorIds);
      if (result.error) { setError("Video creator details could not be loaded. Retry in a moment."); setLoading(false); return; }
      profiles = result.data ?? [];
    }
    const byId = new Map(profiles.map((p: any) => [p.id, p]));
    setVideos(rows.map((row: any) => {
      const profile = byId.get(row.author_id);
      const title = String(row.content ?? "").trim();
      return { id: row.id, authorId: row.author_id, title: title.slice(0, 110) || "Untitled video",
        description: title, videoUrl: row.video_url, posterUrl: row.image_url ?? null,
        createdAt: row.created_at, authorName: profile?.full_name ?? "Fresh creator",
        username: profile?.username ?? "creator", likes: row.like_count ?? 0, comments: row.comment_count ?? 0 };
    }));
    setLoading(false);
  }
  useEffect(() => { void load(); }, []);

  const visible = useMemo(() => videos.filter((video) => {
    const matchesCategory = category === "For You" || category === "Following" || categoryFor(video) === category;
    const text = (video.title + " " + video.authorName + " " + video.username).toLowerCase();
    return matchesCategory && (!query.trim() || text.includes(query.toLowerCase().trim()));
  }), [videos, category, query]);
  const resume = visible.filter((video) => (progress[video.id] ?? 0) > 0).slice(0, 8);
  const featured = visible[0] ?? null;
  const rest = visible.slice(1);

  function toggleSave(video: VideoItem) {
    const next = saved.includes(video.id) ? saved.filter((id) => id !== video.id) : [...saved, video.id];
    setSaved(next); try { localStorage.setItem(SAVED_KEY, JSON.stringify(next)); } catch { /* device storage unavailable */ }
  }
  function saveProgress(video: VideoItem, currentTime: number) {
    if (!Number.isFinite(currentTime) || currentTime < 1) return;
    const next = { ...progress, [video.id]: currentTime };
    setProgress(next); try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(next)); } catch { /* device storage unavailable */ }
  }
  function openPlayer(video: VideoItem) { setActive(video); }
  function closePlayer() { if (active && playerRef.current) saveProgress(active, playerRef.current.currentTime); setActive(null); }
  function resumeVideo(video: VideoItem) { openPlayer(video); window.setTimeout(() => { const player = playerRef.current; const point = progress[video.id]; if (player && point > 0) player.currentTime = point; }, 250); }

  return <section className="fresh-long" aria-label="Fresh Flow Long Videos">
    <div className="fresh-long-heading"><div><span className="fresh-long-eyebrow">FRESH FLOW / CINEMA</span><h1>Long Videos</h1><p>Stories worth staying for. Films, learning, documentaries and more.</p></div><span className="fresh-long-mark" aria-hidden="true">▶</span></div>
    <div className="fresh-long-search"><span aria-hidden="true">⌕</span><input value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search long videos" placeholder="Search films, creators, topics…" /><button type="button" onClick={() => setQuery("")} disabled={!query}>Clear</button></div>
    <nav className="fresh-long-categories" aria-label="Long video categories">{CATEGORIES.map((item) => <button key={item} type="button" className={category === item ? "active" : ""} aria-pressed={category === item} onClick={() => setCategory(item)}>{item}</button>)}</nav>
    {loading && <p className="fresh-long-state" role="status">Loading videos from Fresh Flow…</p>}
    {error && <div className="fresh-long-state is-error" role="alert">{error}<button type="button" onClick={() => void load()}>Try again</button></div>}
    {!loading && !error && videos.length === 0 && <div className="fresh-long-empty"><span>▶</span><h2>Your cinema starts here</h2><p>No published videos are available in the connected media library yet. When creators publish video posts, they will appear here.</p></div>}
    {!loading && !error && videos.length > 0 && visible.length === 0 && <p className="fresh-long-state">No videos match this search or category.</p>}
    {featured && <article className="fresh-long-feature">
      <button className="fresh-long-feature-media" type="button" onClick={() => openPlayer(featured)} aria-label={`Play ${featured.title}`}>
        {featured.posterUrl ? <img src={featured.posterUrl} alt="" /> : <span className="fresh-long-poster-fallback">▶</span>}<span className="fresh-long-play">▶</span><span className="fresh-long-feature-label">FEATURED FOR YOU</span>
      </button>
      <div className="fresh-long-feature-copy"><span className="fresh-long-byline">@{featured.username} · {categoryFor(featured)}</span><h2>{featured.title}</h2><p>{featured.description}</p><div className="fresh-long-actions"><button className="primary" type="button" onClick={() => openPlayer(featured)}>▶ Watch now</button><button type="button" onClick={() => toggleSave(featured)}>{saved.includes(featured.id) ? "✓ Saved" : "+ Watch later"}</button><button type="button" onClick={() => setCommentsFor(featured.id)}>Comments · {featured.comments}</button></div></div>
    </article>}
    {resume.length > 0 && <section className="fresh-long-section"><div className="fresh-long-section-title"><h2>Continue watching</h2><span>Your saved progress on this device</span></div><div className="fresh-long-rail">{resume.map((video) => <button key={video.id} type="button" className="fresh-long-resume-card" onClick={() => resumeVideo(video)}><span className="fresh-long-thumb">{video.posterUrl ? <img src={video.posterUrl} alt="" /> : "▶"}<i style={{ width: `${Math.min(100, Math.max(2, (progress[video.id] / 3600) * 100))}%` }} /></span><strong>{video.title}</strong><small>Resume at {Math.floor(progress[video.id] / 60)}:{String(Math.floor(progress[video.id] % 60)).padStart(2, "0")}</small></button>)}</div></section>}
    <section className="fresh-long-section"><div className="fresh-long-section-title"><h2>{category === "For You" ? "Recommended for you" : category}</h2><span>{visible.length} videos</span></div><div className="fresh-long-grid">{(featured ? rest : visible).map((video) => <article className="fresh-long-card" key={video.id}><button className="fresh-long-card-media" type="button" onClick={() => openPlayer(video)} aria-label={`Play ${video.title}`}>{video.posterUrl ? <img src={video.posterUrl} alt="" /> : <span>▶</span>}<b>▶</b></button><div className="fresh-long-card-copy"><span>@{video.username} · {categoryFor(video)}</span><h3>{video.title}</h3><p>{video.authorName}</p><div><button type="button" onClick={() => openPlayer(video)}>Watch</button><button type="button" onClick={() => toggleSave(video)}>{saved.includes(video.id) ? "Saved" : "Save"}</button><button type="button" onClick={() => setCommentsFor(video.id)}>Comments {video.comments}</button></div></div></article>)}</div></section>}
    <section className="fresh-long-section fresh-long-library"><div><h2>Your library</h2><p>{saved.length} saved videos · progress stays on this device</p></div><button type="button" onClick={() => { setCategory("For You"); setQuery(""); }}>Browse all videos</button></section>
    {active && <div className="fresh-long-player" role="dialog" aria-modal="true" aria-label={active.title}><div className="fresh-long-player-bar"><button type="button" onClick={closePlayer} aria-label="Close cinema player">✕</button><div><strong>{active.title}</strong><small>@{active.username}</small></div><button type="button" onClick={() => toggleSave(active)}>{saved.includes(active.id) ? "Saved" : "Save"}</button></div><div className="fresh-long-player-stage"><video ref={playerRef} key={active.id} src={active.videoUrl} poster={active.posterUrl ?? undefined} controls playsInline autoPlay preload="metadata" onTimeUpdate={(e) => saveProgress(active, e.currentTarget.currentTime)} onEnded={() => { const next = { ...progress }; delete next[active.id]; setProgress(next); try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(next)); } catch { /* storage unavailable */ } }} /><div className="fresh-long-player-meta"><span>FRESH FLOW CINEMA</span><h2>{active.title}</h2><p>{active.description}</p><button type="button" onClick={() => setCommentsFor(active.id)}>Open discussion · {active.comments}</button></div></div></div>}
    {commentsFor && <div className="fresh-long-comments"><button type="button" onClick={() => setCommentsFor(null)}>Close discussion</button><CommentPanel postId={commentsFor} /></div>}
    <p className="fresh-long-honesty">Video playback uses published video URLs from Fresh Flow’s existing posts store. Saved items and watch progress are currently device-local; film licensing, series metadata, adaptive streaming, downloads and server-synced watch history are not yet connected.</p>
  </section>;
}

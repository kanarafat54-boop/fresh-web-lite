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
  authorName: string; username: string; likes: number; comments: number; category: string | null;
};
type VideoPlaylist = { id: string; title: string; description: string; visibility: "private" | "unlisted" | "public"; created_at: string };
type VideoSeries = { id: string; creator_id: string; title: string; description: string; poster_url: string | null; visibility: "private" | "unlisted" | "public"; created_at: string };
type VideoSeason = { id: string; series_id: string; season_number: number; title: string; description: string };
type VideoEpisode = { id: string; series_id: string; season_id: string; post_id: string; episode_number: number; title_override: string | null; description_override: string | null };
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
  const category = String(video.category ?? "").toLowerCase();
  if (/movie|film|series/.test(category)) return "Movies & Series";
  if (/documentary|history|wildlife/.test(category)) return "Documentaries";
  if (/education|learn|course|tutorial/.test(category)) return "Education";
  if (/event|sport|performance/.test(category)) return "Events";
  const text = (video.title + " " + video.description).toLowerCase();
  if (/movie|film|series|episode|season|cinema/.test(text)) return "Movies & Series";
  if (/documentary|documentaries|investigation|history|wildlife/.test(text)) return "Documentaries";
  if (/lesson|course|learn|tutorial|education|lecture|class/.test(text)) return "Education";
  return "Events";
}

export default function FreshFlowLongVideos() {
  const { user, isGuest } = useFreshId();
  const { setActiveRoute } = useLayout();
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
  const [watchHistoryIds, setWatchHistoryIds] = useState<string[]>([]);
  const [playlists, setPlaylists] = useState<VideoPlaylist[]>([]);
  const [playlistItems, setPlaylistItems] = useState<Record<string, string[]>>({});
  const [newPlaylistTitle, setNewPlaylistTitle] = useState("");
  const [playlistSelection, setPlaylistSelection] = useState("");
  const [series, setSeries] = useState<VideoSeries[]>([]);
  const [seasons, setSeasons] = useState<VideoSeason[]>([]);
  const [episodes, setEpisodes] = useState<VideoEpisode[]>([]);
  const [newSeriesTitle, setNewSeriesTitle] = useState("");
  const [newSeriesDescription, setNewSeriesDescription] = useState("");
  const [seriesSelection, setSeriesSelection] = useState("");
  const [episodeVideoSelection, setEpisodeVideoSelection] = useState("");
  const [seasonNumberInput, setSeasonNumberInput] = useState("1");
  const [episodeNumberInput, setEpisodeNumberInput] = useState("1");
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
      const videoColumns = "id, author_id, content, image_url, video_url, like_count, comment_count, created_at, video_title, video_description, video_category, video_tags, video_thumbnail_url, video_duration_seconds, video_visibility, video_status, video_scheduled_at";
      const [{ data, error: loadError }, followIds, savedResult, followingResult, watchResult, playlistResult, seriesResult, seasonsResult, episodesResult, ownVideosResult] = await Promise.all([
        supabase.from("posts").select(videoColumns)
          .not("video_url", "is", null).in("video_status", ["published", "scheduled"])
          .eq("video_visibility", "public")
          .or(`video_scheduled_at.is.null,video_scheduled_at.lte.${new Date().toISOString()}`)
          .order("created_at", { ascending: false }).limit(60),
        user && !isGuest ? getSocialAuthorIds(user.id) : Promise.resolve([] as string[]),
        user && !isGuest
          ? supabase.from("saved_posts").select("post_id").eq("user_id", user.id)
          : Promise.resolve({ data: null, error: null }),
        user && !isGuest
          ? supabase.from("follows").select("followed_id").eq("follower_id", user.id)
          : Promise.resolve({ data: null, error: null }),
        user && !isGuest
          ? supabase.from("fresh_long_video_watch_history").select("post_id,progress_seconds,duration_seconds,completed_at,last_watched_at").eq("user_id", user.id).order("last_watched_at", { ascending: false }).limit(200)
          : Promise.resolve({ data: null, error: null }),
        user && !isGuest
          ? supabase.from("fresh_video_playlists").select("id,title,description,visibility,created_at").eq("user_id", user.id).order("updated_at", { ascending: false }).limit(100)
          : Promise.resolve({ data: null, error: null }),
        supabase.from("fresh_video_series").select("id,creator_id,title,description,poster_url,visibility,created_at").order("updated_at", { ascending: false }).limit(100),
        supabase.from("fresh_video_seasons").select("id,series_id,season_number,title,description").order("season_number", { ascending: true }).limit(500),
        supabase.from("fresh_video_episodes").select("id,series_id,season_id,post_id,episode_number,title_override,description_override").order("episode_number", { ascending: true }).limit(1000),
        user && !isGuest
          ? supabase.from("posts").select(videoColumns).eq("author_id", user.id).not("video_url", "is", null).in("video_status", ["published", "scheduled"]).order("created_at", { ascending: false }).limit(100)
          : Promise.resolve({ data: [], error: null }),
      ]);
      if (loadError) throw loadError;
      if (savedResult.error) throw savedResult.error;
      if (followingResult.error) throw followingResult.error;
      if (watchResult.error) throw watchResult.error;
      if (playlistResult.error) throw playlistResult.error;
      if (seriesResult.error) throw seriesResult.error;
      if (seasonsResult.error) throw seasonsResult.error;
      if (episodesResult.error) throw episodesResult.error;
      if (ownVideosResult.error) throw ownVideosResult.error;
      const nextSeries = (seriesResult.data ?? []) as VideoSeries[];
      setSeries(nextSeries);
      setSeasons((seasonsResult.data ?? []) as VideoSeason[]);
      setEpisodes((episodesResult.data ?? []) as VideoEpisode[]);
      setSeriesSelection((current) => nextSeries.some((item) => item.id === current && item.creator_id === user?.id) ? current : nextSeries.find((item) => item.creator_id === user?.id)?.id ?? "");
      const historyRows = watchResult.data ?? [];
      setWatchHistoryIds(user && !isGuest ? historyRows.map((row: any) => row.post_id) : Object.keys(readProgress()));
      const nextPlaylists = (playlistResult.data ?? []) as VideoPlaylist[];
      const playlistPostIds: string[] = [];
      setPlaylists(nextPlaylists);
      if (nextPlaylists.length) {
        const itemResult = await supabase.from("fresh_video_playlist_items").select("playlist_id,post_id,position")
          .in("playlist_id", nextPlaylists.map((playlist) => playlist.id)).order("position", { ascending: true });
        if (itemResult.error) throw itemResult.error;
        const grouped: Record<string, string[]> = {};
        for (const item of itemResult.data ?? []) {
          (grouped[item.playlist_id] ??= []).push(item.post_id);
          playlistPostIds.push(item.post_id);
        }
        setPlaylistItems(grouped);
        setPlaylistSelection((current) => nextPlaylists.some((playlist) => playlist.id === current) ? current : nextPlaylists[0].id);
      } else {
        setPlaylistItems({});
        setPlaylistSelection("");
      }
      const nextProgress = { ...readProgress() };
      const nextDurations = { ...readDurations() };
      for (const row of historyRows) {
        if (row.completed_at) delete nextProgress[row.post_id];
        else if (Number.isFinite(Number(row.progress_seconds))) nextProgress[row.post_id] = Number(row.progress_seconds);
        if (Number.isFinite(Number(row.duration_seconds)) && Number(row.duration_seconds) > 0) nextDurations[row.post_id] = Number(row.duration_seconds);
      }
      setProgress(nextProgress); setDurations(nextDurations);
      try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(nextProgress)); localStorage.setItem(DURATION_KEY, JSON.stringify(nextDurations)); } catch { /* device storage unavailable */ }
      const recentRows = (data ?? []).filter((row: any) => typeof row.video_url === "string" && /^https?:\/\//i.test(row.video_url));
      const savedIds = user && !isGuest ? (savedResult.data ?? []).map((row: any) => row.post_id) : readIds(SAVED_KEY);
      const libraryIds = [...new Set([...savedIds, ...Object.keys(nextProgress), ...historyRows.map((row: any) => row.post_id), ...playlistPostIds, ...(episodesResult.data ?? []).map((episode: any) => episode.post_id), ...(requestedVideoId ? [requestedVideoId] : [])])];
      const recentIds = new Set(recentRows.map((row: any) => row.id));
      const missingLibraryIds = libraryIds.filter((id) => !recentIds.has(id));
      let extraRows: any[] = [...(ownVideosResult.data ?? [])];
      if (missingLibraryIds.length) {
        const extraResult = await supabase.from("posts")
          .select(videoColumns)
          .in("id", missingLibraryIds).not("video_url", "is", null);
        if (extraResult.error) throw extraResult.error;
        extraRows = (extraResult.data ?? []).filter((row: any) => typeof row.video_url === "string" && /^https?:\/\//i.test(row.video_url));
      }
      const allRowsById = new Map([...recentRows, ...extraRows].map((row: any) => [row.id, row]));
      const allRows = [...allRowsById.values()];
      for (const row of allRows) {
        const duration = Number(row.video_duration_seconds);
        if (Number.isFinite(duration) && duration > 0) nextDurations[row.id] = duration;
      }
      setDurations(nextDurations);
      try { localStorage.setItem(DURATION_KEY, JSON.stringify(nextDurations)); } catch { /* device storage unavailable */ }
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
        const content = String(row.content ?? "").trim();
        const title = String(row.video_title ?? content).trim();
        const description = String(row.video_description ?? content).trim();
        return { id: row.id, authorId: row.author_id, title: title.slice(0, 110) || "Untitled video",
          description, videoUrl: row.video_url, posterUrl: row.video_thumbnail_url ?? row.image_url ?? null,
          createdAt: row.created_at, authorName: profile?.full_name ?? "Fresh creator",
          username: profile?.username ?? "creator", likes: row.like_count ?? 0, comments: row.comment_count ?? 0,
          category: row.video_category ?? null };
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
    setWatchHistoryIds((current) => current.includes(video.id) ? current : [video.id, ...current]);
    try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(next)); } catch { /* device storage unavailable */ }
    if (user && !isGuest) {
      const duration = playerRef.current?.duration || durations[video.id] || null;
      const percent = duration ? Math.min(100, Math.max(0, (currentTime / duration) * 100)) : 0;
      void supabase.from("fresh_long_video_watch_history").upsert({
        user_id: user.id, post_id: video.id, progress_seconds: currentTime,
        duration_seconds: duration, progress_percent: percent,
        last_watched_at: new Date(now).toISOString(), completed_at: null,
        updated_at: new Date(now).toISOString(),
      }, { onConflict: "user_id,post_id" }).then(({ error: historyError }) => {
        if (historyError) setError("Watch progress could not sync. It remains saved on this device.");
      });
    }
  }
  function clearProgress(videoId: string) {
    const next = { ...progress }; delete next[videoId];
    setProgress(next);
    setWatchHistoryIds((current) => current.includes(videoId) ? current : [videoId, ...current]);
    try { localStorage.setItem(PROGRESS_KEY, JSON.stringify(next)); } catch { /* device storage unavailable */ }
    if (user && !isGuest) {
      const now = new Date().toISOString();
      const duration = playerRef.current?.duration || durations[videoId] || null;
      void supabase.from("fresh_long_video_watch_history").upsert({
        user_id: user.id, post_id: videoId, progress_seconds: 0,
        duration_seconds: duration, progress_percent: 100,
        last_watched_at: now, completed_at: now, updated_at: now,
      }, { onConflict: "user_id,post_id" }).then(({ error: historyError }) => {
        if (historyError) setError("Completed watch history could not sync to Fresh ID.");
      });
    }
  }
  async function createPlaylist() {
    if (!user || isGuest) { setActiveRoute("auth-signin"); return; }
    const title = newPlaylistTitle.trim();
    if (!title) { setError("Enter a playlist name first."); return; }
    const { data, error: createError } = await supabase.from("fresh_video_playlists")
      .insert({ user_id: user.id, title, visibility: "private" })
      .select("id,title,description,visibility,created_at").single();
    if (createError) { setError(createError.message || "Playlist could not be created."); return; }
    setPlaylists((current) => [data as VideoPlaylist, ...current]);
    setPlaylistSelection(data.id);
    setNewPlaylistTitle("");
    setError("");
  }
  async function addVideoToPlaylist(video: VideoItem) {
    if (!user || isGuest) { setActiveRoute("auth-signin"); return; }
    if (!playlistSelection) { setError("Create or select a playlist first."); return; }
    const currentItems = playlistItems[playlistSelection] ?? [];
    const { error: addError } = await supabase.from("fresh_video_playlist_items").upsert({
      playlist_id: playlistSelection, post_id: video.id, position: currentItems.length,
    }, { onConflict: "playlist_id,post_id" });
    if (addError) { setError(addError.message || "Video could not be added to the playlist."); return; }
    setPlaylistItems((current) => ({ ...current, [playlistSelection]: currentItems.includes(video.id) ? currentItems : [...currentItems, video.id] }));
    setError("");
  }
  async function updatePlaylistVisibility(playlistId: string, visibility: VideoPlaylist["visibility"]) {
    if (!user || isGuest) { setActiveRoute("auth-signin"); return; }
    const previous = playlists.find((playlist) => playlist.id === playlistId);
    if (!previous || previous.visibility === visibility) return;
    setPlaylists((current) => current.map((playlist) => playlist.id === playlistId ? { ...playlist, visibility } : playlist));
    const { error: updateError } = await supabase.from("fresh_video_playlists")
      .update({ visibility, updated_at: new Date().toISOString() })
      .eq("id", playlistId).eq("user_id", user.id);
    if (updateError) {
      setPlaylists((current) => current.map((playlist) => playlist.id === playlistId ? previous : playlist));
      setError(updateError.message || "Playlist visibility could not be updated.");
      return;
    }
    setError("");
  }
  async function deletePlaylist(playlistId: string) {
    if (!user || isGuest) { setActiveRoute("auth-signin"); return; }
    const playlist = playlists.find((item) => item.id === playlistId);
    if (!playlist || !window.confirm(`Delete the playlist “${playlist.title}”? Its videos will remain in Fresh Flow.`)) return;
    const { error: deleteError } = await supabase.from("fresh_video_playlists")
      .delete().eq("id", playlistId).eq("user_id", user.id);
    if (deleteError) { setError(deleteError.message || "Playlist could not be deleted."); return; }
    setPlaylists((current) => current.filter((item) => item.id !== playlistId));
    setPlaylistItems((current) => { const next = { ...current }; delete next[playlistId]; return next; });
    if (playlistSelection === playlistId) setPlaylistSelection(playlists.find((item) => item.id !== playlistId)?.id ?? "");
    setError("");
  }
  async function createSeries() {
    if (!user || isGuest) { setActiveRoute("auth-signin"); return; }
    const title = newSeriesTitle.trim();
    if (!title) { setError("Enter a series title first."); return; }
    const { data, error: createError } = await supabase.from("fresh_video_series")
      .insert({ creator_id: user.id, title, description: newSeriesDescription.trim(), visibility: "private" })
      .select("id,creator_id,title,description,poster_url,visibility,created_at").single();
    if (createError) { setError(createError.message || "Series could not be created."); return; }
    setSeries((current) => [data as VideoSeries, ...current]);
    setSeriesSelection(data.id); setNewSeriesTitle(""); setNewSeriesDescription(""); setError("");
  }
  async function addEpisodeToSeries() {
    if (!user || isGuest) { setActiveRoute("auth-signin"); return; }
    const selectedSeries = series.find((item) => item.id === seriesSelection && item.creator_id === user.id);
    const selectedVideo = libraryVideos.find((item) => item.id === episodeVideoSelection && item.authorId === user.id);
    const seasonNumber = Number(seasonNumberInput), episodeNumber = Number(episodeNumberInput);
    if (!selectedSeries || !selectedVideo) { setError("Choose one of your series and one of your published videos."); return; }
    if (!Number.isInteger(seasonNumber) || seasonNumber < 1 || !Number.isInteger(episodeNumber) || episodeNumber < 1) { setError("Season and episode numbers must be positive whole numbers."); return; }
    if (episodes.some((item) => item.post_id === selectedVideo.id)) { setError("This video is already assigned to a series."); return; }
    let season = seasons.find((item) => item.series_id === selectedSeries.id && item.season_number === seasonNumber);
    if (!season) {
      const { data, error: seasonError } = await supabase.from("fresh_video_seasons").insert({ series_id: selectedSeries.id, season_number: seasonNumber, title: `Season ${seasonNumber}` }).select("id,series_id,season_number,title,description").single();
      if (seasonError) { setError(seasonError.message || "Season could not be created."); return; }
      season = data as VideoSeason;
      setSeasons((current) => [...current, season as VideoSeason].sort((a,b) => a.season_number-b.season_number));
    }
    const { data, error: episodeError } = await supabase.from("fresh_video_episodes").insert({
      series_id: selectedSeries.id, season_id: season.id, post_id: selectedVideo.id, episode_number: episodeNumber,
    }).select("id,series_id,season_id,post_id,episode_number,title_override,description_override").single();
    if (episodeError) { setError(episodeError.message || "Episode could not be added. Check that its number is not already used."); return; }
    setEpisodes((current) => [...current, data as VideoEpisode].sort((a,b) => a.episode_number-b.episode_number));
    setEpisodeVideoSelection(""); setError("");
  }
  async function updateSeriesVisibility(seriesId: string, visibility: VideoSeries["visibility"]) {
    if (!user || isGuest) { setActiveRoute("auth-signin"); return; }
    const previous = series.find((item) => item.id === seriesId && item.creator_id === user.id);
    if (!previous || previous.visibility === visibility) return;
    setSeries((current) => current.map((item) => item.id === seriesId ? { ...item, visibility } : item));
    const { error: updateError } = await supabase.from("fresh_video_series").update({ visibility, updated_at: new Date().toISOString() }).eq("id", seriesId).eq("creator_id", user.id);
    if (updateError) { setSeries((current) => current.map((item) => item.id === seriesId ? previous : item)); setError(updateError.message || "Series visibility could not be updated."); return; }
    setError("");
  }
  async function removeEpisode(episode: VideoEpisode) {
    if (!user || isGuest) { setActiveRoute("auth-signin"); return; }
    const { error: removeError } = await supabase.from("fresh_video_episodes").delete().eq("id", episode.id).eq("series_id", episode.series_id);
    if (removeError) { setError(removeError.message || "Episode could not be removed from the series."); return; }
    setEpisodes((current) => current.filter((item) => item.id !== episode.id));
    setError("");
  }
  async function deleteSeries(seriesId: string) {
    if (!user || isGuest) { setActiveRoute("auth-signin"); return; }
    const target = series.find((item) => item.id === seriesId && item.creator_id === user.id);
    if (!target || !window.confirm(`Delete “${target.title}” and its season/episode organization? The video posts themselves will remain.`)) return;
    const { error: deleteError } = await supabase.from("fresh_video_series").delete().eq("id", seriesId).eq("creator_id", user.id);
    if (deleteError) { setError(deleteError.message || "Series could not be deleted."); return; }
    setSeries((current) => current.filter((item) => item.id !== seriesId));
    setSeasons((current) => current.filter((item) => item.series_id !== seriesId));
    setEpisodes((current) => current.filter((item) => item.series_id !== seriesId));
    if (seriesSelection === seriesId) setSeriesSelection("");
    setError("");
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
  function openCreatorStudio() {
    try {
      sessionStorage.setItem("fresh-flow-create-intent", JSON.stringify({ action: "long-video", requestedAt: new Date().toISOString() }));
      sessionStorage.setItem("fresh-creator-start-tab", "publish");
    } catch { /* ignore */ }
    setActiveRoute(isGuest ? "auth-signin" : "creator");
  }

  const ownVideos = libraryVideos.filter((video) => video.authorId === user?.id);
  const ownVideoLikes = ownVideos.reduce((total, video) => total + video.likes, 0);
  const ownVideoComments = ownVideos.reduce((total, video) => total + video.comments, 0);
  const topEngagedVideo = [...ownVideos].sort((a, b) => (b.likes + b.comments) - (a.likes + a.comments))[0] ?? null;
  const savedVideos = libraryVideos.filter((video) => saved.includes(video.id));
  const historyVideos = watchHistoryIds.map((id) => libraryVideos.find((video) => video.id === id)).filter((video): video is VideoItem => Boolean(video));
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

    {resume.length > 0 && <section className="fresh-long-section"><div className="fresh-long-section-title"><h2>Continue watching</h2><span>{user && !isGuest ? "Synced to Fresh ID" : "Saved on this device"}</span></div><div className="fresh-long-rail">{resume.map((video) => <button key={video.id} type="button" className="fresh-long-resume-card" onClick={() => resumeVideo(video)}><span className="fresh-long-thumb">{video.posterUrl ? <img src={video.posterUrl} alt="" /> : "▶"}<i style={{ width: `${durations[video.id] > 0 ? Math.min(100, Math.max(2, (progress[video.id] / durations[video.id]) * 100)) : 0}%` }} /></span><strong>{video.title}</strong><small>Resume at {Math.floor(progress[video.id] / 60)}:{String(Math.floor(progress[video.id] % 60)).padStart(2, "0")}</small></button>)}</div></section>}
    {historyVideos.length > 0 && <section className="fresh-long-section"><div className="fresh-long-section-title"><h2>Recently watched</h2><span>{historyVideos.length} videos</span></div><div className="fresh-long-rail">{historyVideos.map((video) => <button key={video.id} type="button" className="fresh-long-resume-card" onClick={() => openPlayer(video)}><span className="fresh-long-thumb">{video.posterUrl ? <img src={video.posterUrl} alt="" /> : "▶"}</span><strong>{video.title}</strong><small>@{video.username}</small></button>)}</div></section>}
    <section className="fresh-long-section"><div className="fresh-long-section-title"><h2>Watch later</h2><span>{savedVideos.length} saved</span></div>{savedVideos.length ? <div className="fresh-long-grid">{savedVideos.map((video) => <article className="fresh-long-card" key={video.id}><button className="fresh-long-card-media" type="button" onClick={() => openPlayer(video)} aria-label={`Play ${video.title}`}>{video.posterUrl ? <img src={video.posterUrl} alt="" /> : <span>▶</span>}<b>▶</b></button><div className="fresh-long-card-copy"><h3>{video.title}</h3><p>{video.authorName}</p><div><button type="button" onClick={() => openPlayer(video)}>Watch</button><button type="button" onClick={() => void toggleSave(video)}>Remove</button></div></div></article>)}</div> : <p className="fresh-long-state">Your Watch Later library is empty. Save a video to find it here.</p>}</section>
    {user && !isGuest && <section className="fresh-long-section fresh-long-analytics">
      <div className="fresh-long-section-title"><h2>Creator performance</h2><span>From your published video posts</span></div>
      <div className="fresh-long-analytics-grid">
        <article><strong>{ownVideos.length}</strong><span>Videos</span></article>
        <article><strong>{ownVideoLikes}</strong><span>Likes</span></article>
        <article><strong>{ownVideoComments}</strong><span>Comments</span></article>
        <article><strong>{ownVideoLikes + ownVideoComments}</strong><span>Total interactions</span></article>
      </div>
      {topEngagedVideo && <div className="fresh-long-top-video"><div><span>Most engaged video</span><strong>{topEngagedVideo.title}</strong><small>{topEngagedVideo.likes} likes · {topEngagedVideo.comments} comments</small></div><button type="button" onClick={() => openPlayer(topEngagedVideo)}>Open video</button></div>}
      <p className="fresh-long-honesty">These figures use saved post reaction and comment counts. Long-video reach, impressions, unique viewers, watch time and revenue are not yet measured, so they are not estimated here.</p>
    </section>}
    <section className="fresh-long-section fresh-long-series-manager">
      <div className="fresh-long-section-title"><h2>Your series</h2><span>{series.filter((item) => item.creator_id === user?.id).length} series</span></div>
      {user && !isGuest ? <>
        <div className="fresh-long-series-create">
          <input aria-label="New series title" value={newSeriesTitle} maxLength={140} onChange={(event) => setNewSeriesTitle(event.target.value)} placeholder="Series title" />
          <textarea aria-label="Series description" value={newSeriesDescription} maxLength={4000} onChange={(event) => setNewSeriesDescription(event.target.value)} placeholder="Series description (optional)" rows={2} />
          <button type="button" onClick={() => void createSeries()}>Create series</button>
        </div>
        {series.some((item) => item.creator_id === user.id) && <div className="fresh-long-episode-create">
          <label>Series<select aria-label="Choose series" value={seriesSelection} onChange={(event) => setSeriesSelection(event.target.value)}>{series.filter((item) => item.creator_id === user.id).map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
          <label>Your video<select aria-label="Choose your video for an episode" value={episodeVideoSelection} onChange={(event) => setEpisodeVideoSelection(event.target.value)}><option value="">Select published video</option>{libraryVideos.filter((item) => item.authorId === user.id).map((item) => <option key={item.id} value={item.id}>{item.title}</option>)}</select></label>
          <label>Season<input aria-label="Season number" type="number" min="1" step="1" value={seasonNumberInput} onChange={(event) => setSeasonNumberInput(event.target.value)} /></label>
          <label>Episode<input aria-label="Episode number" type="number" min="1" step="1" value={episodeNumberInput} onChange={(event) => setEpisodeNumberInput(event.target.value)} /></label>
          <button type="button" disabled={!episodeVideoSelection || !seriesSelection} onClick={() => void addEpisodeToSeries()}>Add episode</button>
        </div>}
      </> : <p className="fresh-long-state">Sign in with Fresh ID to create series and organize published videos into seasons and episodes.</p>}
      {series.filter((item) => item.creator_id === user?.id).map((item) => <article className="fresh-long-series-card" key={item.id}>
        <div className="fresh-long-series-heading"><div><strong>{item.title}</strong><small>{item.description || "No series description"} · {item.visibility}</small></div>
          <label>Visibility<select aria-label={`Visibility for ${item.title}`} value={item.visibility} onChange={(event) => void updateSeriesVisibility(item.id, event.target.value as VideoSeries["visibility"])}><option value="private">Private</option><option value="unlisted">Unlisted</option><option value="public">Public</option></select></label>
          <button type="button" className="fresh-long-series-delete" onClick={() => void deleteSeries(item.id)}>Delete series</button>
        </div>
        {seasons.filter((season) => season.series_id === item.id).map((season) => <div className="fresh-long-season" key={season.id}><h3>{season.title || `Season ${season.season_number}`}</h3>
          {episodes.filter((episode) => episode.season_id === season.id).sort((a,b) => a.episode_number-b.episode_number).map((episode) => { const video = libraryVideos.find((entry) => entry.id === episode.post_id); return <div className="fresh-long-episode-row" key={episode.id}><span>Episode {episode.episode_number}</span>{video ? <button type="button" onClick={() => openPlayer(video)}>{episode.title_override || video.title}</button> : <span>Video unavailable in this library</span>}<button type="button" className="fresh-long-episode-remove" aria-label={`Remove episode ${episode.episode_number}`} onClick={() => void removeEpisode(episode)}>Remove</button></div>; })}
        </div>)}
      </article>)}
      {series.filter((item) => item.creator_id === user?.id).length === 0 && <p className="fresh-long-state">Create a series, then add your published videos as numbered episodes. Seasons are created automatically.</p>}
    </section>
    <section className="fresh-long-section fresh-long-playlists">
      <div className="fresh-long-section-title"><h2>Your playlists</h2><span>{playlists.length} playlists</span></div>
      {user && !isGuest ? <div className="fresh-long-playlist-create">
        <input aria-label="New playlist name" value={newPlaylistTitle} maxLength={100} onChange={(event) => setNewPlaylistTitle(event.target.value)} placeholder="Name a playlist" />
        <button type="button" onClick={() => void createPlaylist()}>Create playlist</button>
      </div> : <p className="fresh-long-state">Sign in with Fresh ID to create and sync playlists.</p>}
      {playlists.map((playlist) => {
        const ids = playlistItems[playlist.id] ?? [];
        const playlistVideos = ids.map((id) => libraryVideos.find((video) => video.id === id)).filter((video): video is VideoItem => Boolean(video));
        return <article className="fresh-long-playlist" key={playlist.id}>
          <div className="fresh-long-playlist-heading">
            <div><strong>{playlist.title}</strong><small>{playlistVideos.length} videos · {playlist.visibility}</small></div>
            <label className="fresh-long-playlist-visibility">Visibility
              <select aria-label={`Visibility for ${playlist.title}`} value={playlist.visibility}
                onChange={(event) => void updatePlaylistVisibility(playlist.id, event.target.value as VideoPlaylist["visibility"])}>
                <option value="private">Private</option><option value="unlisted">Unlisted</option><option value="public">Public</option>
              </select>
            </label>
            <button type="button" className="fresh-long-playlist-delete" onClick={() => void deletePlaylist(playlist.id)}>Delete</button>
          </div>
          <div className="fresh-long-rail">{playlistVideos.map((video) => <button key={video.id} type="button" className="fresh-long-resume-card" onClick={() => openPlayer(video)}><span className="fresh-long-thumb">{video.posterUrl ? <img src={video.posterUrl} alt="" /> : "▶"}</span><strong>{video.title}</strong></button>)}</div>
        </article>;
      })}
      {user && !isGuest && savedVideos.length > 0 && <div className="fresh-long-playlist-add">
        <select aria-label="Choose playlist for saved videos" value={playlistSelection} onChange={(event) => setPlaylistSelection(event.target.value)}>
          <option value="">Choose playlist</option>{playlists.map((playlist) => <option key={playlist.id} value={playlist.id}>{playlist.title}</option>)}
        </select>
        {savedVideos.map((video) => <button key={video.id} type="button" disabled={!playlistSelection} onClick={() => void addVideoToPlaylist(video)}>Add “{video.title}”</button>)}
      </div>}
    </section>
    <p className="fresh-long-honesty">{user && !isGuest ? "Saved videos, watch progress, viewing history and playlists sync through Fresh ID." : "Guest saves and watch progress are stored on this device. Sign in to sync your library across devices."}</p>
  </section>;
  if (panel === "settings") return <section className="fresh-long" aria-label="Long Videos settings">
    <div className="fresh-long-heading"><div><span className="fresh-long-eyebrow">FRESH FLOW / PREFERENCES</span><h1>Playback Settings</h1><p>Control playback behavior and data use.</p></div><button type="button" onClick={() => setPanel("discover")}>Back to Discover</button></div>
    <div className="fresh-long-settings">
      <label><span><strong>Autoplay</strong><small>Start a video automatically when you open the cinema player.</small></span><input type="checkbox" checked={autoplay} onChange={(event) => setAutoplay(event.target.checked)} /></label>
      <label><span><strong>Data saver</strong><small>Reduce preloading on mobile data. This does not change the creator's source quality.</small></span><input type="checkbox" checked={dataSaver} onChange={(event) => setDataSaver(event.target.checked)} /></label>
      <label><span><strong>Preferred playback speed</strong><small>Applied when the browser player loads a video.</small></span><select value={playbackSpeed} onChange={(event) => setPlaybackSpeed(event.target.value)}><option value="0.75">0.75×</option><option value="1">Normal</option><option value="1.25">1.25×</option><option value="1.5">1.5×</option><option value="1.75">1.75×</option><option value="2">2×</option></select></label>
    </div>
    <p className="fresh-long-honesty">These playback preferences are saved on this device. Captions require compatible subtitle tracks in the source; quality choices depend on the source format and browser.</p>
  </section>;

  return <section className="fresh-long" aria-label="Fresh Flow Long Videos">
    <div className="fresh-long-heading"><div><span className="fresh-long-eyebrow">FRESH FLOW / CINEMA</span><h1>Long Videos</h1><p>Stories worth staying for. Films, learning, documentaries and more.</p></div><span className="fresh-long-mark" aria-hidden="true">▶</span></div>
    {shareNotice && <p className="fresh-long-share-notice" role="status">{shareNotice}</p>}
    <div className="fresh-long-tools" aria-label="Long Videos tools">
      <button type="button" className={panel === "discover" ? "active" : ""} onClick={() => setPanel("discover")}>Discover</button>
      <button type="button" onClick={() => setPanel("explore")}>Explore</button>
      <button type="button" onClick={() => setPanel("library")}>Your Library</button>
      <button type="button" onClick={openCreatorStudio}>Upload video</button>
      <button type="button" onClick={() => setPanel("settings")}>Settings</button>
    </div>
    <div className="fresh-long-search"><span aria-hidden="true">⌕</span><input value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search long videos" placeholder="Search films, creators, topics…" /><button type="button" onClick={() => setQuery("")} disabled={!query}>Clear</button></div>
    <nav className="fresh-long-categories" aria-label="Long video categories">{CATEGORIES.map((item) => <button key={item} type="button" className={category === item ? "active" : ""} aria-pressed={category === item} onClick={() => setCategory(item)}>{item}</button>)}</nav>
    {series.filter((item) => item.visibility === "public").length > 0 && <section className="fresh-long-section fresh-long-series-discovery"><div className="fresh-long-section-title"><h2>Series & seasons</h2><span>{series.filter((item) => item.visibility === "public").length} series</span></div>
      <div className="fresh-long-series-grid">{series.filter((item) => item.visibility === "public").map((item) => <article className="fresh-long-series-card" key={item.id}><div className="fresh-long-series-heading"><div><strong>{item.title}</strong><small>{item.description || "A Fresh Flow series"}</small></div></div>
        {seasons.filter((season) => season.series_id === item.id).map((season) => <div className="fresh-long-season" key={season.id}><h3>{season.title || `Season ${season.season_number}`}</h3>
          {episodes.filter((episode) => episode.season_id === season.id).sort((a,b) => a.episode_number-b.episode_number).map((episode) => { const video = libraryVideos.find((entry) => entry.id === episode.post_id); return video ? <div className="fresh-long-episode-row" key={episode.id}><span>Ep. {episode.episode_number}</span><button type="button" onClick={() => openPlayer(video)}>{episode.title_override || video.title}</button></div> : null; })}
        </div>)}
      </article>)}</div>
    </section>}
    {loading && <p className="fresh-long-state" role="status">Loading videos from Fresh Flow…</p>}
    {error && <div className="fresh-long-state is-error" role="alert">{error}<button type="button" onClick={() => void load()}>Try again</button></div>}
    {!loading && !error && videos.length === 0 && <div className="fresh-long-empty"><span>▶</span><h2>Your cinema starts here</h2><p>No published videos are available in the connected media library yet. When creators publish video posts, they will appear here.</p><button type="button" className="primary" onClick={openCreatorStudio}>{user && !isGuest ? "Upload your first long video" : "Sign in to publish a long video"}</button></div>}
    {!loading && !error && videos.length > 0 && visible.length === 0 && <div className="fresh-long-state">{category === "Following" ? "Videos from creators you follow will appear here. Follow creators to build this feed." : "No videos match this search or category."}</div>}
    {featured && <article className="fresh-long-feature">
      <button className="fresh-long-feature-media" type="button" onClick={() => openPlayer(featured)} aria-label={`Play ${featured.title}`}>
        {featured.posterUrl ? <img src={featured.posterUrl} alt="" /> : <span className="fresh-long-poster-fallback">▶</span>}<span className="fresh-long-play">▶</span><span className="fresh-long-feature-label">LATEST ON FRESH FLOW</span>
      </button>
      <div className="fresh-long-feature-copy"><span className="fresh-long-byline">@{featured.username} · {categoryFor(featured)}</span><h2>{featured.title}</h2><button className="fresh-long-author-link" type="button" onClick={() => setChannelFor(featured)}>{featured.authorName}</button><p>{featured.description}</p><div className="fresh-long-actions"><button className="primary" type="button" onClick={() => openPlayer(featured)}>▶ Watch now</button><button type="button" onClick={() => setDetailsFor(featured)}>Details</button><button type="button" onClick={() => void shareVideo(featured)}>Share</button><button type="button" aria-pressed={likedIds.includes(featured.id)} onClick={() => void toggleLike(featured)}>{likedIds.includes(featured.id) ? "♥ Liked" : "♡ Like"} · {featured.likes}</button><button type="button" onClick={() => void toggleSave(featured)}>{saved.includes(featured.id) ? "✓ Saved" : "+ Watch later"}</button><button type="button" onClick={() => setCommentsFor(featured.id)}>Comments · {featured.comments}</button></div></div>
    </article>}
    {resume.length > 0 && <section className="fresh-long-section"><div className="fresh-long-section-title"><h2>Continue watching</h2><span>{user && !isGuest ? "Synced to Fresh ID" : "Saved on this device"}</span></div><div className="fresh-long-rail">{resume.map((video) => <button key={video.id} type="button" className="fresh-long-resume-card" onClick={() => resumeVideo(video)}><span className="fresh-long-thumb">{video.posterUrl ? <img src={video.posterUrl} alt="" /> : "▶"}<i style={{ width: `${Math.min(100, Math.max(2, (progress[video.id] / 3600) * 100))}%` }} /></span><strong>{video.title}</strong><small>Resume at {Math.floor(progress[video.id] / 60)}:{String(Math.floor(progress[video.id] % 60)).padStart(2, "0")}</small></button>)}</div></section>}
    <section className="fresh-long-section"><div className="fresh-long-section-title"><h2>{category === "Discover" ? "Latest long videos" : category}</h2><span>{visible.length} videos</span></div><div className="fresh-long-grid">{(featured ? rest : visible).map((video) => <article className="fresh-long-card" key={video.id}><button className="fresh-long-card-media" type="button" onClick={() => openPlayer(video)} aria-label={`Play ${video.title}`}>{video.posterUrl ? <img src={video.posterUrl} alt="" /> : <span>▶</span>}<b>▶</b></button><div className="fresh-long-card-copy"><span>@{video.username} · {categoryFor(video)}</span><h3>{video.title}</h3><button className="fresh-long-author-link" type="button" onClick={() => setChannelFor(video)}>{video.authorName}</button><div><button type="button" onClick={() => openPlayer(video)}>Watch</button><button type="button" onClick={() => setDetailsFor(video)}>Details</button><button type="button" aria-pressed={likedIds.includes(video.id)} onClick={() => void toggleLike(video)}>{likedIds.includes(video.id) ? "♥" : "♡"} {video.likes}</button><button type="button" onClick={() => void toggleSave(video)}>{saved.includes(video.id) ? "Saved" : "Save"}</button><button type="button" onClick={() => setCommentsFor(video.id)}>Comments {video.comments}</button></div></div></article>)}</div></section>
    <section className="fresh-long-section fresh-long-library"><div><h2>Your library</h2><p>{saved.length} saved videos · {user && !isGuest ? "synced to your Fresh ID" : "saved on this device"}</p></div><button type="button" onClick={() => { setCategory("Discover"); setQuery(""); }}>Browse all videos</button></section>
    {active && <div className="fresh-long-player" role="dialog" aria-modal="true" aria-label={active.title} onKeyDown={(event) => { if (event.key === "Escape") closePlayer(); }}>
      <div className="fresh-long-player-bar"><button type="button" onClick={closePlayer} aria-label="Close cinema player">✕</button><div><strong>{active.title}</strong><small>@{active.username}</small></div><button type="button" onClick={() => void toggleSave(active)}>{saved.includes(active.id) ? "Saved" : "Save"}</button></div>
      <div className="fresh-long-player-stage"><video ref={playerRef} key={active.id} src={active.videoUrl} poster={active.posterUrl ?? undefined} controls playsInline autoPlay={autoplay && !dataSaver} preload={dataSaver ? "none" : "metadata"} onLoadedMetadata={(e) => { e.currentTarget.playbackRate = Number(playbackSpeed); saveDuration(active.id, e.currentTarget.duration); }} onTimeUpdate={(e) => saveProgress(active, e.currentTarget.currentTime)} onEnded={() => clearProgress(active.id)} onError={() => setError("This video could not be played. The creator's media URL may be unavailable.")} /><div className="fresh-long-player-meta"><span>FRESH FLOW CINEMA</span><h2>{active.title}</h2><p>{active.description}</p><button type="button" aria-pressed={likedIds.includes(active.id)} onClick={() => void toggleLike(active)}>{likedIds.includes(active.id) ? "♥ Liked" : "♡ Like"} · {active.likes}</button><button type="button" onClick={() => void shareVideo(active)}>Share</button><button type="button" onClick={() => { setCommentsFor(active.id); closePlayer(); }}>Open discussion · {active.comments}</button></div></div>
    </div>}
    {detailsFor && <div className="fresh-long-details" role="dialog" aria-modal="true" aria-label={`Details for ${detailsFor.title}`}><div className="fresh-long-details-sheet"><button type="button" onClick={() => setDetailsFor(null)} aria-label="Close video details">✕</button><span className="fresh-long-eyebrow">VIDEO DETAILS</span><h2>{detailsFor.title}</h2><p>{detailsFor.description}</p><button type="button" className="fresh-long-author-link" onClick={() => { setDetailsFor(null); setChannelFor(detailsFor); }}>Open @{detailsFor.username} creator channel</button><div className="fresh-long-actions"><button className="primary" type="button" onClick={() => { openPlayer(detailsFor); setDetailsFor(null); }}>Watch now</button><button type="button" aria-pressed={likedIds.includes(detailsFor.id)} onClick={() => void toggleLike(detailsFor)}>{likedIds.includes(detailsFor.id) ? "♥ Liked" : "♡ Like"} · {detailsFor.likes}</button><button type="button" onClick={() => void shareVideo(detailsFor)}>Share video</button><button type="button" onClick={() => void toggleSave(detailsFor)}>{saved.includes(detailsFor.id) ? "Saved" : "Watch later"}</button><button type="button" onClick={() => { setCommentsFor(detailsFor.id); setDetailsFor(null); }}>Comments · {detailsFor.comments}</button></div></div></div>}
    {commentsFor && <div className="fresh-long-comments"><button type="button" onClick={() => setCommentsFor(null)}>Close discussion</button><CommentPanel targetType="post" targetId={commentsFor} onClose={() => setCommentsFor(null)} /></div>}
    <p className="fresh-long-honesty">Video playback uses published video URLs from Fresh Flow’s existing posts store. Saved items and signed-in watch progress sync through Fresh ID; guest progress stays on this device. Film licensing, adaptive streaming and offline downloads are not yet connected. Creator-owned series, seasons and episode ordering are stored in Fresh Flow.</p>
  </section>;
}

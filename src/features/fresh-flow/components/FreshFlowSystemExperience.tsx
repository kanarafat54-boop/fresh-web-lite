import ShortsStudio from "./ShortsStudio";
import { useMemo, useState } from "react";
import type { FreshFlowIndependentSystem } from "../core/freshFlowSystemRegistry";
import "./FreshFlowSystemExperience.css";

type Props = {
  system: FreshFlowIndependentSystem;
  onBack: () => void;
  onOpenStudio: () => void;
};

const ICONS: Record<string, string> = {
  "short-video": "▶", "long-video": "▻", "film-catalog": "▣", "series-catalog": "▤",
  "live-video": "◉", "sports-discovery": "⚑", "text-posts": "✎", groups: "◎",
  "temporary-media": "◷", "creator-pages": "◉", "music-catalog": "♫", "podcast-shows": "🎙",
  "radio-stations": "◖", "spoken-books": "▥", "news-publishers": "▤", ebooks: "▤",
  courses: "✦", "research-search": "⌕", images: "▧", vr: "◇",
  "branching-narratives": "⑂", "game-discovery": "◈", "media-library": "✧",
  "broadcast-setup": "◉", "event-listings": "▦",
};

const LIVE_TABS = [
  { id: "discover", label: "Discover live" },
  { id: "go-live", label: "Go live" },
  { id: "schedule", label: "Schedule" },
  { id: "safety", label: "Safety & controls" },
] as const;
const MUSIC_TABS = [
  { id: "discover", label: "Discover" },
  { id: "artists", label: "Artists" },
  { id: "albums", label: "Albums" },
  { id: "playlists", label: "Playlists" },
  { id: "library", label: "My library" },
] as const;

function LiveWorkspace({ onOpenStudio }: { onOpenStudio: () => void }) {
  const [tab, setTab] = useState<(typeof LIVE_TABS)[number]["id"]>("discover");
  const [title, setTitle] = useState("");
  const [visibility, setVisibility] = useState("public");
  const [ready, setReady] = useState(false);
  return (
    <section className="fresh-flow-product-workspace" aria-label="Fresh Live workspace">
      <div className="fresh-flow-product-tabs" role="tablist" aria-label="Fresh Live sections">
        {LIVE_TABS.map((item) => <button key={item.id} type="button" role="tab" aria-selected={tab === item.id} className={tab === item.id ? "active" : ""} onClick={() => setTab(item.id)}>{item.label}</button>)}
      </div>
      {tab === "discover" && <div className="fresh-flow-product-panel">
        <span className="fresh-flow-panel-symbol" aria-hidden="true">◉</span>
        <h2>Live now on Fresh Flow</h2>
        <p>Live broadcasts will appear here when the Fresh Live viewing feed is connected. This panel does not invent streams or show a broadcast as live unless a real stream is available.</p>
        <div className="fresh-flow-feature-row"><span>Viewer features</span><strong>Watch · Chat · Follow · Share</strong></div>
        <div className="fresh-flow-feature-row"><span>Creator features</span><strong>Go live · Invite guests · Moderate</strong></div>
        <button type="button" className="fresh-flow-feature-primary" onClick={() => setTab("go-live")}>Set up a broadcast</button>
      </div>}
      {tab === "go-live" && <div className="fresh-flow-product-panel">
        <h2>Prepare your broadcast</h2>
        <p>Set the details first. Publishing a real live stream still requires the Fresh Live streaming service to be connected.</p>
        <label className="fresh-flow-field-label" htmlFor="fresh-live-title">Broadcast title</label>
        <input id="fresh-live-title" value={title} onChange={(event) => { setTitle(event.target.value); setReady(false); }} maxLength={100} placeholder="What are you going live about?" />
        <label className="fresh-flow-field-label" htmlFor="fresh-live-visibility">Audience</label>
        <select id="fresh-live-visibility" value={visibility} onChange={(event) => { setVisibility(event.target.value); setReady(false); }}>
          <option value="public">Public</option><option value="followers">Followers</option><option value="private">Private test</option>
        </select>
        <button type="button" className="fresh-flow-feature-primary" disabled={!title.trim()} onClick={() => setReady(true)}>Review setup</button>
        {ready && <div className="fresh-flow-inline-confirmation" role="status"><strong>Setup saved in this screen.</strong><span>Title: {title.trim()} · Audience: {visibility}. No stream has started.</span><button type="button" onClick={onOpenStudio}>Open Creator Studio</button></div>}
      </div>}
      {tab === "schedule" && <div className="fresh-flow-product-panel"><h2>Upcoming broadcasts</h2><p>Your scheduled Fresh Live events will appear here once scheduling is connected to your account.</p><button type="button" className="fresh-flow-feature-primary" onClick={() => setTab("go-live")}>Plan a broadcast</button></div>}
      {tab === "safety" && <div className="fresh-flow-product-panel"><h2>Safety before you go live</h2><ul className="fresh-flow-feature-list"><li>Choose the audience before starting.</li><li>Set chat rules and assign moderators.</li><li>Provide report, block and end-stream controls.</li><li>Check camera, microphone and connection permissions.</li></ul><p className="fresh-flow-feature-honesty">These are the required product controls; live moderation and stream transport are not yet connected here.</p></div>}
    </section>
  );
}

function MusicWorkspace() {
  const [tab, setTab] = useState<(typeof MUSIC_TABS)[number]["id"]>("discover");
  const [query, setQuery] = useState("");
  const [playlistName, setPlaylistName] = useState("");
  const [playlists, setPlaylists] = useState<string[]>(() => {
    try { return JSON.parse(window.localStorage.getItem("fresh-music-playlists") || "[]") as string[]; } catch { return []; }
  });
  const [notice, setNotice] = useState("");
  const filteredTabs = useMemo(() => MUSIC_TABS.filter((item) => item.label.toLowerCase().includes(query.toLowerCase())), [query]);
  function createPlaylist() {
    const clean = playlistName.trim();
    if (!clean) return;
    const next = [...playlists, clean];
    setPlaylists(next);
    setPlaylistName("");
    try { window.localStorage.setItem("fresh-music-playlists", JSON.stringify(next)); setNotice("Playlist saved on this device."); }
    catch { setNotice("Playlist created for this session, but device storage is unavailable."); }
  }
  return (
    <section className="fresh-flow-product-workspace" aria-label="Fresh Music workspace">
      <label className="fresh-flow-field-label" htmlFor="fresh-music-search">Find music, artists, albums or playlists</label>
      <input id="fresh-music-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search Fresh Music" />
      <div className="fresh-flow-product-tabs" role="tablist" aria-label="Fresh Music sections">
        {MUSIC_TABS.filter((item) => !query || filteredTabs.some((filtered) => filtered.id === item.id)).map((item) => <button key={item.id} type="button" role="tab" aria-selected={tab === item.id} className={tab === item.id ? "active" : ""} onClick={() => setTab(item.id)}>{item.label}</button>)}
      </div>
      {tab === "playlists" || tab === "library" ? <div className="fresh-flow-product-panel">
        <h2>{tab === "playlists" ? "Your playlists" : "Your music library"}</h2>
        {tab === "playlists" && <form className="fresh-flow-playlist-form" onSubmit={(event) => { event.preventDefault(); createPlaylist(); }}><input value={playlistName} onChange={(event) => setPlaylistName(event.target.value)} maxLength={80} placeholder="Name a playlist" aria-label="New playlist name" /><button type="submit" disabled={!playlistName.trim()}>Create playlist</button></form>}
        {playlists.length ? <ul className="fresh-flow-feature-list">{playlists.map((name, index) => <li key={`${name}-${index}`}>♫ {name}</li>)}</ul> : <p>No playlists yet. Create one to start organizing your music.</p>}
        {notice && <p className="fresh-flow-inline-confirmation" role="status">{notice}</p>}
      </div> : <div className="fresh-flow-product-panel">
        <span className="fresh-flow-panel-symbol" aria-hidden="true">♫</span>
        <h2>{tab === "artists" ? "Artists" : tab === "albums" ? "Albums" : "Music discovery"}</h2>
        <p>{tab === "artists" ? "Artist profiles, releases, verified credits and follow controls belong here." : tab === "albums" ? "Album pages, track lists, credits and release details belong here." : "Browse tracks, moods, genres, new releases and recommendations."}</p>
        <div className="fresh-flow-feature-row"><span>Playback</span><strong>Play · Pause · Queue · Repeat</strong></div>
        <div className="fresh-flow-feature-row"><span>Organization</span><strong>Save · Playlists · Listening history</strong></div>
        <p className="fresh-flow-feature-honesty">The music catalog and licensed audio playback are not connected yet, so this screen will not pretend sample tracks are real.</p>
      </div>}
    </section>
  );
}

export default function FreshFlowSystemExperience({ system, onBack, onOpenStudio }: Props) {
  const isStudio = system.id === "fresh-studio";
  const isLive = system.id === "live-creation";
  const isMusic = system.id === "fresh-music";
  const primaryActions = system.capabilities.slice(0, 3);
  const secondaryActions = system.capabilities.slice(3);
  return (
    <div className={`fresh-flow-system-page system-${system.id}`}>
      {isStudio ? <ShortsStudio /> : (<>
      <header className="fresh-flow-system-header">
        <button type="button" onClick={onBack} className="fresh-flow-system-back" aria-label="Back to Fresh Flow Home">‹ <span>Fresh Flow</span></button>
        <span className="fresh-flow-system-status">{isLive ? "Live production workspace" : isMusic ? "Music workspace" : "Independent system · implementation in progress"}</span>
      </header>
      <section className="fresh-flow-system-hero">
        <div className="fresh-flow-system-symbol" aria-hidden="true">{ICONS[primaryActions[0]] ?? "✦"}</div>
        <p className="fresh-flow-system-kicker">INDEPENDENT FRESH FLOW EXPERIENCE</p>
        <h1>{system.label}</h1>
        <p>{system.description}</p>
        <div className="fresh-flow-system-hero-actions">
          <button type="button" className="primary" onClick={isMusic ? () => document.getElementById("fresh-music-search")?.focus() : isLive ? onOpenStudio : onOpenStudio}>{isMusic ? "Search music" : isLive ? "Open Creator Studio" : "Create or contribute"} <span aria-hidden="true">↗</span></button>
          <button type="button" className="secondary" onClick={onBack}>Explore Fresh Flow</button>
        </div>
      </section>
      </>)}
      {isLive ? <LiveWorkspace onOpenStudio={onOpenStudio} /> : isMusic ? <MusicWorkspace /> : <section className="fresh-flow-system-content" aria-labelledby="fresh-flow-system-tools">
        <div className="fresh-flow-system-section-heading"><div><span>YOUR WORKSPACE</span><h2 id="fresh-flow-system-tools">{isStudio ? "All Studio capabilities" : `Explore ${system.label}`}</h2></div><span className="fresh-flow-system-count">{system.capabilities.length} capabilities</span></div>
        <p className="fresh-flow-system-note">This system has a dedicated entry point. Each capability below needs its own data contract and connected service before it can be represented as live.</p>
        <div className="fresh-flow-system-capability-grid">
          {primaryActions.map((capability) => <article className="fresh-flow-system-capability featured" key={capability}><span className="fresh-flow-system-capability-icon" aria-hidden="true">{ICONS[capability] ?? "✦"}</span><h3>{capability.replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase())}</h3><p>A dedicated area for this {system.label} workflow, with its own navigation and state.</p><span className="fresh-flow-system-planned">Service connection needed</span></article>)}
          {secondaryActions.map((capability) => <article className="fresh-flow-system-capability" key={capability}><span className="fresh-flow-system-capability-icon" aria-hidden="true">{ICONS[capability] ?? "✦"}</span><h3>{capability.replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase())}</h3><p>System-specific capability with its own contract, data flow and verification.</p><span className="fresh-flow-system-planned">Service connection needed</span></article>)}
        </div>
      </section>}
      <footer className="fresh-flow-system-footer"><span>Independent product experience · shared Fresh Flow identity and safety services.</span><button type="button" onClick={onBack}>Back to Fresh Flow</button></footer>
    </div>
  );
}

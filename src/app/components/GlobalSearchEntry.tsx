import { useMemo, useState } from "react";
import { FeatureRegistry } from "../registry/FeatureRegistry";
import { useLayout } from "../contexts/useLayout";
import { SearchIcon, XCircleIcon } from "../../components/Icons";
import { NotificationService } from "../services/notificationService";
import { runIntelligence, type IntelligenceResponse, type IntelligenceSourceKind, type ResearchMode } from "../../features/ai/intelligence";
import { searchExternalImages, searchArchiveVideos, type ExternalImageResult, type ArchiveVideoResult } from "../../features/fresh-flow/core/searchService";

const RESEARCH_MODES: Array<{ id: ResearchMode; label: string }> = [
  { id: "global", label: "Global" }, { id: "deep", label: "Deep" }, { id: "live", label: "Live news" },
  { id: "academic", label: "Academic" }, { id: "business", label: "Business" }, { id: "people", label: "People" }, { id: "local", label: "Local" },
];

const RESULT_FILTERS: Array<{ id: "all" | IntelligenceSourceKind; label: string }> = [
  { id: "all", label: "Everything" }, { id: "web", label: "Web" }, { id: "news", label: "News" }, { id: "video", label: "Videos" }, { id: "image", label: "Images" }, { id: "music", label: "Music" },
];

const kindLabel: Record<IntelligenceSourceKind, string> = { web: "Web result", news: "News result", video: "Video link", image: "Image link", music: "Music link" };

export default function GlobalSearchEntry() {
  const { searchOverlayOpen, openSearch, closeSearch, setActiveRoute } = useLayout();
  const [query, setQuery] = useState("");
  const [researchMode, setResearchMode] = useState<ResearchMode>("global");
  const [filter, setFilter] = useState<"all" | IntelligenceSourceKind>("all");
  const [research, setResearch] = useState<IntelligenceResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [images, setImages] = useState<ExternalImageResult[]>([]);
  const [archiveVideos, setArchiveVideos] = useState<ArchiveVideoResult[]>([]);
  const [imagesQuery, setImagesQuery] = useState("");
  const [videosQuery, setVideosQuery] = useState("");
  const featureResults = FeatureRegistry.getAll().filter((f) => f.searchable && f.name.toLowerCase().includes(query.toLowerCase()));
  const sources = useMemo(() => (research?.sources ?? []).filter((source) => filter === "all" || (source.kind ?? "web") === filter), [research, filter]);

  const searchWorld = async () => {
    const trimmed = query.trim();
    if (!trimmed || loading) return;
    setLoading(true); setError(null); setMediaError(null); setResearch(null); setFilter("all");
    setImages([]); setArchiveVideos([]); setImagesQuery(""); setVideosQuery("");
    try {
      const response = await runIntelligence({ prompt: trimmed, query: trimmed, task: "research", researchMode, maxSources: researchMode === "deep" || researchMode === "global" ? 12 : 10 });
      setResearch(response);
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "Fresh Search could not complete the research.";
      setError(message);
      NotificationService.notify({ title: "Fresh Search failed", message: "The research request did not complete. You can retry without reopening Search.", type: "error" });
    } finally { setLoading(false); }
  };

  const selectFilter = async (next: "all" | IntelligenceSourceKind) => {
    setFilter(next);
    setMediaError(null);
    const trimmed = query.trim();
    if (!trimmed) return;
    if (next === "image" && imagesQuery !== trimmed) {
      setMediaLoading(true);
      try { setImages(await searchExternalImages(trimmed)); setImagesQuery(trimmed); }
      catch (reason) { setMediaError(reason instanceof Error ? reason.message : "Image search failed."); }
      finally { setMediaLoading(false); }
    }
    if (next === "video" && videosQuery !== trimmed) {
      setMediaLoading(true);
      try { setArchiveVideos(await searchArchiveVideos(trimmed)); setVideosQuery(trimmed); }
      catch (reason) { setMediaError(reason instanceof Error ? reason.message : "Video search failed."); }
      finally { setMediaLoading(false); }
    }
  };

  const resetSearch = () => {
    setQuery(""); setResearch(null); setError(null); setMediaError(null); setFilter("all");
    setImages([]); setArchiveVideos([]); setImagesQuery(""); setVideosQuery("");
  };

  if (!searchOverlayOpen) return <button className="icon-only-btn" onClick={openSearch} aria-label="Open Fresh Search"><SearchIcon size={20} /></button>;

  const verification = research?.verification;
  const followUps = query.trim() ? [
    `What are the latest developments in ${query.trim()}?`,
    `Which people and organizations are connected to ${query.trim()}?`,
    `What evidence or viewpoints challenge common claims about ${query.trim()}?`,
  ] : [];

  return (
    <div className="comment-panel-backdrop" onClick={closeSearch}>
      <div className="comment-panel" style={{ height: "auto", maxHeight: "min(88vh, 860px)", overflow: "auto" }} onClick={(e) => e.stopPropagation()}>
        <div className="shorts-search-bar">
          <SearchIcon size={16} />
          <input autoFocus value={query} onChange={(e) => { setQuery(e.target.value); setError(null); setResearch(null); setMediaError(null); }} onKeyDown={(e) => { if (e.key === "Enter") void searchWorld(); }} placeholder="Ask Fresh about anything: people, work, learning, music, video, images, news…" aria-label="Fresh Search" />
          <button className="icon-only-btn" onClick={closeSearch} aria-label="Close Fresh Search"><XCircleIcon size={16} /></button>
        </div>

        <div className="fresh-search-modes" aria-label="Fresh Search research mode">
          {RESEARCH_MODES.map((mode) => <button key={mode.id} type="button" className={researchMode === mode.id ? "search-mode active" : "search-mode"} onClick={() => setResearchMode(mode.id)}>{mode.label}</button>)}
        </div>

        {query.trim() ? (
          <button className="share-option-btn" onClick={() => void searchWorld()} disabled={loading}>{loading ? "Fresh is searching…" : `Search “${query.trim()}”`}</button>
        ) : (
          <div role="status" style={{ marginTop: 10, opacity: .68 }}>Enter a question or search term to begin Fresh Search.</div>
        )}
        {error && <div className="search-error" role="alert"><span>{error}</span><button className="reply-btn" type="button" onClick={() => void searchWorld()} disabled={loading}>{loading ? "Retrying…" : "Retry"}</button></div>}

        {research && (
          <div className="fresh-global-research" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
              <div style={{ flex: "1 1 280px", minWidth: 0 }}><strong>Fresh Research · {research.researchMode ?? researchMode}</strong><p>{research.text}</p></div>
              {verification && <div style={{ border: "1px solid rgba(0,0,0,.12)", borderRadius: 12, padding: "8px 10px", minWidth: 170, maxWidth: "100%" }}><strong style={{ fontSize: 12 }}>Fresh Proof</strong><small style={{ display: "block", marginTop: 4 }}>{verification.confidence} confidence · {verification.uniqueSources} unique sources</small><small style={{ display: "block", marginTop: 2 }}>{verification.uniqueDomains} distinct publisher domains · {verification.sourceDiversity} diversity</small><small style={{ display: "block", marginTop: 4 }}>Claim-level verification is not complete.</small></div>}
            </div>

            <div className="fresh-search-modes" aria-label="Fresh evidence category filter">
              {RESULT_FILTERS.map((item) => <button key={item.id} type="button" className={filter === item.id ? "search-mode active" : "search-mode"} onClick={() => void selectFilter(item.id)}>{item.label}</button>)}
            </div>

            {filter === "image" && (
              <section aria-label="Image search results" style={{ margin: "10px 0 14px" }}>
                <strong>Wikimedia Commons images</strong>
                <small style={{ display: "block", margin: "4px 0 10px", opacity: .7 }}>Each image links to its source page, creator and license details.</small>
                {mediaLoading && <div role="status">Searching image collections…</div>}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(145px, 1fr))", gap: 10 }}>
                  {images.map((item) => <article key={item.sourceUrl} style={{ minWidth: 0, border: "1px solid rgba(0,0,0,.12)", borderRadius: 12, overflow: "hidden" }}>
                    <a href={item.sourceUrl} target="_blank" rel="noreferrer" aria-label={`Open source page for ${item.title}`}><img src={item.thumbnailUrl} alt={item.description || item.title} loading="lazy" style={{ width: "100%", aspectRatio: "4 / 3", objectFit: "contain", background: "#15151d", display: "block" }} /></a>
                    <div style={{ padding: 9, display: "grid", gap: 5, overflowWrap: "anywhere" }}><strong>{item.title}</strong><small>{item.author} · {item.license}</small><a href={item.sourceUrl} target="_blank" rel="noreferrer">Source and license</a></div>
                  </article>)}
                </div>
              </section>
            )}

            {filter === "video" && (
              <section aria-label="Video search results" style={{ margin: "10px 0 14px" }}>
                <strong>Internet Archive videos</strong>
                <small style={{ display: "block", margin: "4px 0 10px", opacity: .7 }}>A focused archive index, not the entire public video web.</small>
                {mediaLoading && <div role="status">Searching playable archive videos…</div>}
                <div style={{ display: "grid", gap: 12 }}>
                  {archiveVideos.map((item) => <article key={item.id} style={{ border: "1px solid rgba(0,0,0,.12)", borderRadius: 12, overflow: "hidden" }}>
                    <video controls preload="metadata" poster={item.thumbnailUrl} src={item.videoUrl} style={{ width: "100%", maxHeight: 360, background: "#000", display: "block" }} />
                    <div style={{ padding: 10, display: "grid", gap: 6, overflowWrap: "anywhere" }}><strong>{item.title}</strong>{item.description && <p>{item.description}</p>}<small>{item.creator}{item.date ? ` · ${item.date}` : ""} · Internet Archive</small><a href={item.sourceUrl} target="_blank" rel="noreferrer">Open source record</a></div>
                  </article>)}
                </div>
              </section>
            )}

            {mediaError && (filter === "image" || filter === "video") && <div className="search-error" role="alert"><span>{mediaError}</span><button type="button" className="reply-btn" onClick={() => { if (filter === "image") setImagesQuery(""); else setVideosQuery(""); void selectFilter(filter); }}>Retry media search</button></div>}

            <div style={{ display: "grid", gap: 8 }}>
              {sources.map((source, index) => {
                const kind = source.kind ?? "web";
                return <article key={String(source.url) + "-" + String(source.title)} style={{ padding: 12, border: "1px solid rgba(0,0,0,.1)", borderRadius: 14, overflowWrap: "anywhere" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}><strong><a href={source.url} target="_blank" rel="noreferrer">{source.title}</a></strong><span style={{ fontSize: 11, fontWeight: 800, opacity: .65 }}>{kindLabel[kind]} · Result {index + 1}</span></div>
                  {source.publishedAt && <small style={{ display: "block", marginTop: 4, opacity: .62 }}>{new Date(source.publishedAt).toLocaleDateString()}</small>}
                  {source.snippet && <small style={{ display: "block", marginTop: 7, lineHeight: 1.45, opacity: .82 }}>{source.snippet}</small>}
                </article>;
              })}
            </div>
            {!sources.length && filter !== "image" && filter !== "video" && <div style={{ padding: 14, opacity: .7 }}>Fresh found no {filter === "all" ? "web" : filter} results for this research pass. Try another category or research mode.</div>}
            {filter === "image" && !mediaLoading && !images.length && !sources.length && !mediaError && <div style={{ padding: 14, opacity: .7 }}>No image results found. Try a broader query.</div>}
            {filter === "video" && !mediaLoading && !archiveVideos.length && !sources.length && !mediaError && <div style={{ padding: 14, opacity: .7 }}>No playable archive videos found. Try a broader query.</div>}

            {research.searchedAt && <small style={{ display: "block", marginTop: 12, opacity: .55 }}>Research completed {new Date(research.searchedAt).toLocaleString()}. Results link to their sources; search-result excerpts remain unverified until claim-level checks are available.</small>}
            <section aria-label="Related research" style={{ marginTop: 16 }}>
              <strong>Explore related research</strong>
              <div style={{ display: "grid", gap: 7, marginTop: 8 }}>
                {followUps.map((followUp) => <button key={followUp} type="button" className="share-option-btn" onClick={() => { setQuery(followUp); setResearch(null); setFilter("all"); setError(null); setMediaError(null); }}>{followUp}</button>)}
              </div>
              <small style={{ display: "block", marginTop: 6, opacity: .65 }}>These are suggested follow-up questions, not claims or search results. Select one, then press Search.</small>
            </section>
          </div>
        )}
        {!research && featureResults.map((f) => <button key={f.id} className="share-option-btn" onClick={() => { setActiveRoute(f.id); closeSearch(); }}>{f.name}</button>)}
        {(query || research || error) && <button className="reply-btn" type="button" onClick={resetSearch}>Clear search</button>}
      </div>
    </div>
  );
}

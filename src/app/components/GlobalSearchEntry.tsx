import { useMemo, useState } from "react";
import { FeatureRegistry } from "../registry/FeatureRegistry";
import { useLayout } from "../contexts/useLayout";
import { SearchIcon, XCircleIcon } from "../../components/Icons";
import { runIntelligence, type IntelligenceResponse, type IntelligenceSourceKind, type ResearchMode } from "../../features/ai/intelligence";

const RESEARCH_MODES: Array<{ id: ResearchMode; label: string }> = [
  { id: "global", label: "Global" }, { id: "deep", label: "Deep" }, { id: "live", label: "Live news" },
  { id: "academic", label: "Academic" }, { id: "business", label: "Business" }, { id: "people", label: "People" }, { id: "local", label: "Local" },
];

const RESULT_FILTERS: Array<{ id: "all" | IntelligenceSourceKind; label: string }> = [
  { id: "all", label: "Everything" }, { id: "web", label: "Web" }, { id: "news", label: "News" }, { id: "video", label: "Videos" }, { id: "image", label: "Images" }, { id: "music", label: "Music" },
];

const kindLabel: Record<IntelligenceSourceKind, string> = { web: "Web evidence", news: "News evidence", video: "Video evidence", image: "Image evidence", music: "Music evidence" };

export default function GlobalSearchEntry() {
  const { searchOverlayOpen, openSearch, closeSearch, setActiveRoute } = useLayout();
  const [query, setQuery] = useState("");
  const [researchMode, setResearchMode] = useState<ResearchMode>("global");
  const [filter, setFilter] = useState<"all" | IntelligenceSourceKind>("all");
  const [research, setResearch] = useState<IntelligenceResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const featureResults = FeatureRegistry.getAll().filter((f) => f.searchable && f.name.toLowerCase().includes(query.toLowerCase()));
  const sources = useMemo(() => (research?.sources ?? []).filter((source) => filter === "all" || (source.kind ?? "web") === filter), [research, filter]);

  const searchWorld = async () => {
    const trimmed = query.trim();
    if (!trimmed || loading) return;
    setLoading(true); setError(null); setResearch(null); setFilter("all");
    try {
      setResearch(await runIntelligence({ prompt: trimmed, query: trimmed, task: "research", researchMode, maxSources: researchMode === "deep" || researchMode === "global" ? 12 : 10 }));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Fresh Search could not complete the research.");
    } finally { setLoading(false); }
  };

  if (!searchOverlayOpen) return <button className="icon-only-btn" onClick={openSearch} aria-label="Open Fresh Search"><SearchIcon size={20} /></button>;

  const verification = research?.verification;
  return (
    <div className="comment-panel-backdrop" onClick={closeSearch}>
      <div className="comment-panel" style={{ height: "auto", maxHeight: "min(88vh, 860px)", overflow: "auto" }} onClick={(e) => e.stopPropagation()}>
        <div className="shorts-search-bar">
          <SearchIcon size={16} />
          <input autoFocus value={query} onChange={(e) => { setQuery(e.target.value); setError(null); setResearch(null); }} onKeyDown={(e) => { if (e.key === "Enter") void searchWorld(); }} placeholder="Ask Fresh about anything: people, work, learning, music, video, images, news…" aria-label="Fresh Search" />
          <button className="icon-only-btn" onClick={closeSearch} aria-label="Close Fresh Search"><XCircleIcon size={16} /></button>
        </div>

        <div className="fresh-search-modes" aria-label="Fresh Search research mode">
          {RESEARCH_MODES.map((mode) => <button key={mode.id} type="button" className={researchMode === mode.id ? "search-mode active" : "search-mode"} onClick={() => setResearchMode(mode.id)}>{mode.label}</button>)}
        </div>

        {query.trim() && <button className="share-option-btn" onClick={() => void searchWorld()} disabled={loading}>{loading ? "Fresh is researching and verifying…" : `Research “${query.trim()}”`}</button>}
        {error && <div className="search-error" role="alert">{error}</div>}

        {research && (
          <div className="fresh-global-research" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
              <div><strong>Fresh Research · {research.researchMode ?? researchMode}</strong><p>{research.text}</p></div>
              {verification && <div style={{ border: "1px solid rgba(0,0,0,.12)", borderRadius: 12, padding: "8px 10px", minWidth: 170 }}><strong style={{ fontSize: 12 }}>Fresh Proof</strong><small style={{ display: "block", marginTop: 4 }}>{verification.confidence} confidence · {verification.uniqueSources} independent checks</small><small style={{ display: "block", marginTop: 2 }}>{verification.uniqueDomains} distinct information domains · {verification.sourceDiversity} diversity{verification.contradictionsDetected ? " · conflicts detected" : " · cross-checked"}</small></div>}
            </div>

            {research.sources?.length ? <>
              <div className="fresh-search-modes" aria-label="Fresh evidence filter">
                {RESULT_FILTERS.map((item) => <button key={item.id} type="button" className={filter === item.id ? "search-mode active" : "search-mode"} onClick={() => setFilter(item.id)}>{item.label}</button>)}
              </div>
              <div style={{ display: "grid", gap: 8 }}>
                {sources.map((source, index) => {
                  const kind = source.kind ?? "web";
                  return <article key={`${source.url}-${source.title}`} style={{ padding: 12, border: "1px solid rgba(0,0,0,.1)", borderRadius: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}><strong>{source.title}</strong><span style={{ fontSize: 11, fontWeight: 800, opacity: .65 }}>{kindLabel[kind]} · Evidence {index + 1}</span></div>
                    {source.publishedAt && <small style={{ display: "block", marginTop: 4, opacity: .62 }}>{new Date(source.publishedAt).toLocaleDateString()}</small>}
                    {source.snippet && <small style={{ display: "block", marginTop: 7, lineHeight: 1.45, opacity: .82 }}>{source.snippet}</small>}
                  </article>;
                })}
              </div>
              {!sources.length && <div style={{ padding: 14, opacity: .7 }}>Fresh found no {filter} evidence for this research pass. Try Everything or another mode.</div>}
            </> : <div style={{ marginTop: 12, opacity: .7 }}>Fresh completed the reasoning pass but received no external evidence records. It will not present the result as externally verified.</div>}
            {research.searchedAt && <small style={{ display: "block", marginTop: 12, opacity: .55 }}>Research completed {new Date(research.searchedAt).toLocaleString()}. Fresh keeps the underlying provenance internally and presents the result through its own Proof + Evidence layer.</small>}
          </div>
        )}
        {!research && featureResults.map((f) => <button key={f.id} className="share-option-btn" onClick={() => { setActiveRoute(f.id); closeSearch(); }}>{f.name}</button>)}
      </div>
    </div>
  );
}

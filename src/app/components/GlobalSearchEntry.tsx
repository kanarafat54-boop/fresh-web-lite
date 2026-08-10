import { useState } from "react";
import { FeatureRegistry } from "../registry/FeatureRegistry";
import { useLayout } from "../contexts/useLayout";
import { SearchIcon, XCircleIcon } from "../../components/Icons";
import { runIntelligence, type IntelligenceResponse } from "../../features/ai/intelligence";

export default function GlobalSearchEntry() {
  const { searchOverlayOpen, openSearch, closeSearch, setActiveRoute } = useLayout();
  const [query, setQuery] = useState("");
  const [research, setResearch] = useState<IntelligenceResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const featureResults = FeatureRegistry.getAll().filter(
    (f) => f.searchable && f.name.toLowerCase().includes(query.toLowerCase()),
  );

  const searchWorld = async () => {
    const trimmed = query.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    setError(null);
    setResearch(null);

    try {
      const response = await runIntelligence({
        prompt: trimmed,
        query: trimmed,
        task: "research",
        maxSources: 12,
      });
      setResearch(response);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Fresh Global Search failed.");
    } finally {
      setLoading(false);
    }
  };

  if (!searchOverlayOpen) {
    return (
      <button className="icon-only-btn" onClick={openSearch}>
        <SearchIcon size={20} />
      </button>
    );
  }

  return (
    <div className="comment-panel-backdrop" onClick={closeSearch}>
      <div className="comment-panel" style={{ height: "auto" }} onClick={(e) => e.stopPropagation()}>
        <div className="shorts-search-bar">
          <SearchIcon size={16} />
          <input
            autoFocus
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setError(null);
              setResearch(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") void searchWorld();
            }}
            placeholder="Search the world..."
          />
          <button className="icon-only-btn" onClick={closeSearch}>
            <XCircleIcon size={16} />
          </button>
        </div>

        {query.trim() && (
          <button className="share-option-btn" onClick={() => void searchWorld()} disabled={loading}>
            {loading ? "Fresh is researching..." : `Search the world for “${query.trim()}”`}
          </button>
        )}

        {error && <div className="search-error">{error}</div>}

        {research && (
          <div className="fresh-global-research" onClick={(e) => e.stopPropagation()}>
            <strong>Fresh Global Research</strong>
            <p>{research.text}</p>
            {research.sources?.map((source) => (
              <a key={`${source.url}-${source.title}`} href={source.url} target="_blank" rel="noreferrer">
                <span>{source.title}</span>
                {source.snippet && <small>{source.snippet}</small>}
              </a>
            ))}
          </div>
        )}

        {!research && featureResults.map((f) => (
          <button
            key={f.id}
            className="share-option-btn"
            onClick={() => {
              setActiveRoute(f.id);
              closeSearch();
            }}
          >
            {f.name}
          </button>
        ))}
      </div>
    </div>
  );
}

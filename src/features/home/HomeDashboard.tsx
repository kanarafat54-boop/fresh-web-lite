import { useState } from "react";
import { SearchIcon } from "../../components/Icons";
import UniversalCommandBar from "./components/UniversalCommandBar";
import FreshFlowNavigation from "./components/FreshFlowNavigation";
import { FeatureRegistry } from "../../app/registry/FeatureRegistry";
import { useLayout } from "../../app/contexts/useLayout";
import { runIntelligence, type IntelligenceResponse } from "../ai/intelligence";

type SearchMode = "instant" | "ai" | "research" | "private";

export default function HomeDashboard() {
  const { setActiveRoute } = useLayout();
  const [result, setResult] = useState<IntelligenceResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (query: string, mode: SearchMode) => {
    setError(null);
    setResult(null);
    if (mode === "instant") {
      const match = FeatureRegistry.getAll().find(
        (f) => f.searchable && f.name.toLowerCase().includes(query.toLowerCase()),
      );
      if (match) { setActiveRoute(match.id); return; }
      setError(`No workspace found for "${query}".`);
      return;
    }
    setLoading(true);
    try {
      setResult(await runIntelligence({
        prompt: query,
        query,
        task: "research",
        researchMode: mode === "private" ? "local" : "global",
        maxSources: mode === "research" ? 12 : 6,
      }));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Fresh search failed.");
    } finally { setLoading(false); }
  };

  return (
    <div className="home-dashboard">
      <UniversalCommandBar onSearch={handleSearch} />
      {loading && <p style={{ opacity: 0.7 }}>Fresh is searching…</p>}
      {error && <p className="auth-error">{error}</p>}
      {result && (
        <section className="fresh-global-research">
          <strong>Fresh Search Result</strong>
          <p>{result.text}</p>
          {result.sources?.map((source) => (
            <a key={`${source.url}-${source.title}`} href={source.url} target="_blank" rel="noreferrer">
              <span>{source.title}</span>{source.snippet && <small>{source.snippet}</small>}
            </a>
          ))}
        </section>
      )}
      <FreshFlowNavigation />
      <section className="home-discovery-note" aria-label="Fresh discovery principle">
        <SearchIcon size={20} />
        <div>
          <strong>Not another Reels clone</strong>
          <p>Fresh keeps Short Flow vertical for discovery, while the main experience stays centered on people, knowledge, media and choice.</p>
        </div>
      </section>
    </div>
  );
}

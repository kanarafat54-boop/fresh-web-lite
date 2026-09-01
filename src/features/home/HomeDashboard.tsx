import { FeedModule } from "../feed/components/FeedModule";
import { FilmIcon, SearchIcon } from "../../components/Icons";
import UniversalCommandBar from "./components/UniversalCommandBar";
import { FeatureRegistry } from "../../app/registry/FeatureRegistry";
import { useLayout } from "../../app/contexts/useLayout";
import { runIntelligence, type IntelligenceResponse } from "../ai/intelligence";
import { useState } from "react";

type SearchMode = "instant" | "ai" | "research" | "private";

/**
 * Home is the universal launch surface of Fresh Web Lite. Fresh Flow lives
 * on its own route (id: "flow") rather than being embedded here, so Home
 * stays the plain landing page: search, shortcuts, and the main feed.
 */
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
      if (match) {
        setActiveRoute(match.id);
        return;
      }
      setError(`No workspace found for "${query}".`);
      return;
    }

    setLoading(true);
    try {
      const response = await runIntelligence({
        prompt: query,
        query,
        task: "research",
        researchMode: mode === "private" ? "local" : "global",
        maxSources: mode === "research" ? 12 : 6,
      });
      setResult(response);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Fresh search failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="home-dashboard">
      <UniversalCommandBar onSearch={handleSearch} />

      {loading && <p style={{ opacity: 0.7 }}>Fresh is searching…</p>}
      {error && <p style={{ color: "var(--fresh-danger, #e0554f)" }}>{error}</p>}
      {result && (
        <section className="fresh-global-research">
          <strong>Fresh Search Result</strong>
          <p>{result.text}</p>
          {result.sources?.map((source) => (
            <a key={`${source.url}-${source.title}`} href={source.url} target="_blank" rel="noreferrer">
              <span>{source.title}</span>
              {source.snippet && <small>{source.snippet}</small>}
            </a>
          ))}
        </section>
      )}

      <section className="welcome-card">
        <FilmIcon size={36} />
        <div>
          <h2>Fresh Media</h2>
          <p>Posts, photos, short videos, long videos, news and live content.</p>
        </div>
      </section>

      <section className="dashboard-grid" aria-label="Media shortcuts">
        <button className="dashboard-card creator" onClick={() => setActiveRoute("shorts")}>
          <FilmIcon size={30} />
          <h3>Short Videos</h3>
          <p>Open the Shorts experience.</p>
        </button>
        <button className="dashboard-card creator" onClick={() => setActiveRoute("flow")}>
          <SearchIcon size={30} />
          <h3>Fresh Flow</h3>
          <p>Home, Long Videos, News/Posts, AR/VR, Podcasts, Live, Learn and more in one discovery surface.</p>
        </button>
        <button className="dashboard-card search" onClick={() => setActiveRoute("software")}>
          <SearchIcon size={30} />
          <h3>Discover</h3>
          <p>Find Fresh content and software.</p>
        </button>
        <button className="dashboard-card wallet" onClick={() => setActiveRoute("studio")}>
          <FilmIcon size={30} />
          <h3>Creator Studio</h3>
          <p>Create and publish media.</p>
        </button>
      </section>

      <FeedModule />
    </div>
  );
}

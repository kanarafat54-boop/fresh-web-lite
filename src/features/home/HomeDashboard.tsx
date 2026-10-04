import { FilmIcon, SearchIcon, AIIcon, PlusIcon } from "../../components/Icons";
import UniversalCommandBar from "./components/UniversalCommandBar";
import { FeatureRegistry } from "../../app/registry/FeatureRegistry";
import { useLayout } from "../../app/contexts/useLayout";
import { runIntelligence, type IntelligenceResponse } from "../ai/intelligence";
import { useFreshId } from "../fresh-id/context/FreshIdContext";
import { useState } from "react";
import { FeedModule } from "../feed/components/FeedModule";
import "./HomeDashboard.css";

type SearchMode = "instant" | "ai" | "research" | "private";

const actions = [
  { id: "flow", label: "Open Flow", description: "Watch, read, listen and explore.", icon: FilmIcon, route: "fresh-flow" },
  { id: "create", label: "Create", description: "Make a video, post, audio or project.", icon: PlusIcon, route: "studio" },
  { id: "work", label: "Work", description: "Continue a task or open your workspace.", icon: AIIcon, route: "work" },
  { id: "profile", label: "Profile", description: "Identity, preferences and account.", icon: SearchIcon, route: "profile" },
];

function openAction(route: string, isAuthenticated: boolean, setActiveRoute: (route: string) => void) {
  if (route === "profile" && !isAuthenticated) {
    setActiveRoute("auth-signin");
    return;
  }
  setActiveRoute(route);
}

export default function HomeDashboard() {
  const { setActiveRoute } = useLayout();
  const { user, isAuthenticated } = useFreshId();
  const [result, setResult] = useState<IntelligenceResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const greeting = isAuthenticated && user?.email ? "Welcome back" : "Welcome to Fresh";

  const handleSearch = async (query: string, mode: SearchMode) => {
    setError(null);
    setResult(null);
    if (mode === "instant") {
      const match = FeatureRegistry.getAll().find((f) => f.searchable && f.name.toLowerCase().includes(query.toLowerCase()));
      if (match) { setActiveRoute(match.id); return; }
      setError(`Fresh could not find a matching workspace for "${query}". Try asking Fresh, searching content, or opening Flow.`);
      return;
    }
    setLoading(true);
    try {
      const response = await runIntelligence({ prompt: query, query, task: "research", researchMode: mode === "private" ? "local" : "global", maxSources: mode === "research" ? 12 : 6 });
      setResult(response);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Fresh search failed. Try again.");
    } finally { setLoading(false); }
  };

  return (
    <div className="home-dashboard">
      <section className="fresh-home-hero" aria-labelledby="fresh-home-title">
        <div className="fresh-home-hero-copy">
          <span className="fresh-home-eyebrow">YOUR FRESH HOME</span>
          <h1 id="fresh-home-title">{greeting}</h1>
          <p>One place to find what matters, continue what you started, and tell Fresh what you want done.</p>
        </div>
        <button type="button" className="fresh-home-ai-button" onClick={() => setActiveRoute("ai")}>
          <AIIcon size={20} /><span><strong>Ask Fresh</strong><small>Search, plan or act</small></span>
        </button>
      </section>

      <UniversalCommandBar onSearch={handleSearch} />

      <section className="fresh-home-actions" aria-labelledby="fresh-home-actions-title">
        <div className="fresh-home-section-heading">
          <div><span>GET STARTED</span><h2 id="fresh-home-actions-title">What do you want to do?</h2></div>
          <button type="button" onClick={() => setActiveRoute("fresh-flow")}>Open Flow</button>
        </div>
        <div className="fresh-home-action-grid">
          {actions.map(({ id, label, description, icon: Icon, route }) => (
            <button key={id} type="button" className="fresh-home-action-card" onClick={() => openAction(route, isAuthenticated, setActiveRoute)}>
              <span className="fresh-home-action-icon"><Icon size={22} /></span><span><strong>{label}</strong><small>{description}</small></span><b aria-hidden="true">›</b>
            </button>
          ))}
        </div>
      </section>

      <section className="fresh-home-continue" aria-labelledby="fresh-home-continue-title">
        <div className="fresh-home-section-heading"><div><span>CONTINUE</span><h2 id="fresh-home-continue-title">Pick up where you left off</h2></div></div>
        <div className="fresh-home-continue-grid">
          <button type="button" onClick={() => setActiveRoute("studio")}><FilmIcon size={20} /><span><strong>Fresh Studio</strong><small>Continue creating or editing</small></span><b>›</b></button>
          <button type="button" onClick={() => setActiveRoute("work")}><AIIcon size={20} /><span><strong>Fresh Work</strong><small>Continue a workspace task</small></span><b>›</b></button>
          <button type="button" onClick={() => setActiveRoute("saved")}><SearchIcon size={20} /><span><strong>Saved</strong><small>Return to something you kept</small></span><b>›</b></button>
        </div>
      </section>

      {loading && <div className="fresh-home-status" role="status">Fresh is working on that…</div>}
      {error && <div className="fresh-home-status is-error" role="alert">{error}</div>}
      {result && <section className="fresh-global-research" aria-label="Fresh search result"><strong>Fresh result</strong><p>{result.text}</p>{result.sources?.map((source) => <a key={`${source.url}-${source.title}`} href={source.url} target="_blank" rel="noreferrer"><span>{source.title}</span>{source.snippet && <small>{source.snippet}</small>}</a>)}</section>}

      <section className="fresh-home-feed" aria-label="Your Fresh feed">
        <div className="fresh-home-section-heading"><div><span>YOUR FEED</span><h2>What’s useful to you</h2></div><button type="button" onClick={() => setActiveRoute("fresh-flow")}>Explore Flow</button></div>
        <FeedModule />
      </section>
    </div>
  );
}

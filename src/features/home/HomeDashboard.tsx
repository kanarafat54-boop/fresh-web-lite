import { FilmIcon, SearchIcon, AIIcon, PlusIcon, WalletIcon, ProfileIcon } from "../../components/Icons";
import UniversalCommandBar from "./components/UniversalCommandBar";
import { FeatureRegistry } from "../../app/registry/FeatureRegistry";
import { useLayout } from "../../app/contexts/useLayout";
import { runIntelligence, type IntelligenceResponse } from "../ai/intelligence";
import { useFreshId } from "../fresh-id/context/FreshIdContext";
import { useEffect, useState } from "react";
import { FeedModule } from "../feed/components/FeedModule";
import "./HomeDashboard.css";

type SearchMode = "instant" | "ai" | "research" | "private";

// Keep the first screen focused on the destinations people use most.
// The full ecosystem directory lives in Explore instead of competing with Home.
const actions = [
  { id: "flow", label: "Fresh Flow", description: "Watch videos, read posts and listen.", icon: FilmIcon, route: "fresh-flow" },
  { id: "create", label: "Create", description: "Make a post, video or project.", icon: PlusIcon, route: "studio" },
  { id: "work", label: "Work", description: "Open your tasks and workspaces.", icon: AIIcon, route: "work" },
  { id: "explore", label: "Explore", description: "Find tools and connected ecosystems.", icon: SearchIcon, route: "discovery" },
  { id: "wallet", label: "Wallet", description: "View your wallet and payment tools.", icon: WalletIcon, route: "wallet" },
  { id: "profile", label: "Profile & settings", description: "Manage your identity and preferences.", icon: ProfileIcon, route: "profile" },
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
  const [experienceMode, setExperienceMode] = useState<"simple" | "standard" | "advanced">("simple");
  const [showGettingStarted, setShowGettingStarted] = useState(false);
  const [showMoreActions, setShowMoreActions] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem("fresh-experience-mode");
    if (saved === "simple" || saved === "standard" || saved === "advanced") setExperienceMode(saved);
  }, []);

  function changeExperienceMode(next: "simple" | "standard" | "advanced") {
    setExperienceMode(next);
    window.localStorage.setItem("fresh-experience-mode", next);
  }

  const name = user?.fullName || user?.username || null;
  const greeting = isAuthenticated && name ? `Good to see you, ${name}` : isAuthenticated ? "Welcome back" : "Welcome to Fresh";
  const primaryActions = actions.filter((action) => ["flow", "create", "explore"].includes(action.id));
  const additionalActions = actions.filter((action) => !["flow", "create", "explore"].includes(action.id));
  const visibleActions = experienceMode === "simple" ? primaryActions : actions;

  const handleSearch = async (query: string, mode: SearchMode) => {
    setError(null);
    setResult(null);
    if (mode === "instant") {
      const match = FeatureRegistry.getAll().find((f) => f.searchable && f.name.toLowerCase().includes(query.toLowerCase()));
      if (match) {
        setActiveRoute(match.id);
        return;
      }
      setError(`Fresh could not find a matching workspace for "${query}". Try asking Fresh, searching content, or opening Flow.`);
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
      setError(reason instanceof Error ? reason.message : "Fresh search failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="home-dashboard">
      <section className="fresh-home-hero" aria-labelledby="fresh-home-title">
        <div className="fresh-home-hero-copy">
          <span className="fresh-home-eyebrow">YOUR FRESH HOME</span>
          <h1 id="fresh-home-title">{greeting}</h1>
          <p>
            {isAuthenticated
              ? "Your place to connect, create, learn and get things done."
              : "Find what you need, discover something useful, or ask Fresh for help."}
          </p>
        </div>
        <button type="button" className="fresh-home-ai-button" onClick={() => setActiveRoute("ai")}>
          <AIIcon size={20} />
          <span>
            <strong>Ask Fresh AI</strong>
            <small>Get help, search or plan</small>
          </span>
        </button>
      </section>

      <section className={`fresh-home-help ${showGettingStarted ? "is-open" : ""}`} aria-label="Getting started help">
        <button type="button" className="fresh-home-help-toggle" aria-expanded={showGettingStarted} onClick={() => setShowGettingStarted((open) => !open)}>
          <span className="fresh-home-help-mark" aria-hidden="true">?</span>
          <span><strong>Need help getting started?</strong><small>Only open this if you need it</small></span>
          <span className="fresh-home-help-chevron" aria-hidden="true">{showGettingStarted ? "−" : "+"}</span>
        </button>
        {showGettingStarted && <div className="fresh-home-help-content">
          <p><strong>1. Choose a card.</strong> Each card opens a part of Fresh. The short line underneath explains what it does.</p>
          <p><strong>2. Ask for help.</strong> Use “Ask Fresh AI” when you are unsure what to do or need help finding something.</p>
          <p><strong>3. Make it easier to read.</strong> Open Profile &amp; settings to increase text size or choose a simpler home view.</p>
          <button type="button" onClick={() => setActiveRoute(isAuthenticated ? "settings" : "auth-signin")}>{isAuthenticated ? "Open settings" : "Sign in to manage settings"}</button>
        </div>}
      </section>

      {experienceMode !== "simple" && <section className="fresh-home-search" aria-label="Search Fresh">
        <UniversalCommandBar onSearch={handleSearch} />
      </section>}

      <section className="fresh-home-actions" aria-labelledby="fresh-home-actions-title">
        <div className="fresh-home-section-heading">
          <div>
            <span>QUICK ACCESS</span>
            <h2 id="fresh-home-actions-title">What do you want to do?</h2>
            <p>{experienceMode === "simple" ? "Start with a few clear choices. You can show more whenever you need." : "Choose a place to get started."}</p>
          </div>
        </div>
        <div className="fresh-home-action-grid">
          {visibleActions.map(({ id, label, description, icon: Icon, route }) => (
            <button key={id} type="button" className="fresh-home-action-card" onClick={() => openAction(route, isAuthenticated, setActiveRoute)}>
              <span className="fresh-home-action-icon"><Icon size={22} /></span>
              <span className="fresh-home-action-copy">
                <strong>{label}</strong>
                <small>{description}</small>
              </span>
              <b aria-hidden="true">›</b>
            </button>
          ))}
        </div>
        {experienceMode === "simple" && (
          <div className="fresh-home-more-actions">
            <button type="button" aria-expanded={showMoreActions} onClick={() => setShowMoreActions((open) => !open)}>
              {showMoreActions ? "Show fewer options" : "More options"} <span aria-hidden="true">{showMoreActions ? "−" : "+"}</span>
            </button>
            {showMoreActions && (
              <div className="fresh-home-action-grid fresh-home-extra-grid">
                {additionalActions.map(({ id, label, description, icon: Icon, route }) => (
                  <button key={id} type="button" className="fresh-home-action-card" onClick={() => openAction(route, isAuthenticated, setActiveRoute)}>
                    <span className="fresh-home-action-icon"><Icon size={22} /></span>
                    <span className="fresh-home-action-copy"><strong>{label}</strong><small>{description}</small></span>
                    <b aria-hidden="true">›</b>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {loading && <div className="fresh-home-status" role="status">Fresh is working on that…</div>}
      {error && <div className="fresh-home-status is-error" role="alert">{error}</div>}
      {result && (
        <section className="fresh-global-research" aria-label="Fresh search result">
          <strong>Fresh result</strong>
          <p>{result.text}</p>
          {result.sources?.map((source) => (
            <a key={`${source.url}-${source.title}`} href={source.url} target="_blank" rel="noreferrer">
              <span>{source.title}</span>
              {source.snippet && <small>{source.snippet}</small>}
            </a>
          ))}
        </section>
      )}

      {experienceMode !== "simple" && <section className="fresh-home-feed" aria-label="Your Fresh feed">
        <div className="fresh-home-section-heading">
          <div>
            <span>YOUR FEED</span>
            <h2>Pick up where you left off</h2>
          </div>
          <button type="button" onClick={() => setActiveRoute("fresh-flow")}>Open Fresh Flow</button>
        </div>
        <FeedModule />
      </section>}
    </div>
  );
}

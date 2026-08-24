import { FeedModule } from "../feed/components/FeedModule";
import { FilmIcon, SearchIcon } from "../../components/Icons";
import UniversalCommandBar from "./components/UniversalCommandBar";

type SearchMode = "instant" | "ai" | "research" | "private";

/**
 * Home is the universal launch surface of Fresh Web Lite.
 * The feed remains the source of truth for media while the command bar
 * provides the shared entry point for search, AI, voice and translation.
 */
export default function HomeDashboard() {
  const handleSearch = (query: string, mode: SearchMode) => {
    const params = new URLSearchParams({ q: query, mode });
    window.history.pushState({}, "", `/?${params.toString()}`);
    window.dispatchEvent(new CustomEvent("fresh:universal-search", { detail: { query, mode } }));
  };

  return (
    <div className="home-dashboard">
      <UniversalCommandBar onSearch={handleSearch} />

      <section className="welcome-card">
        <FilmIcon size={36} />
        <div>
          <h2>Fresh Media</h2>
          <p>Posts, photos, short videos, long videos, news and live content.</p>
        </div>
      </section>

      <section className="dashboard-grid" aria-label="Media shortcuts">
        <button className="dashboard-card creator" onClick={() => { window.location.href = "/shorts"; }}>
          <FilmIcon size={30} />
          <h3>Short Videos</h3>
          <p>Open the Shorts experience.</p>
        </button>
        <button className="dashboard-card search" onClick={() => { window.location.href = "/software"; }}>
          <SearchIcon size={30} />
          <h3>Discover</h3>
          <p>Find Fresh content and software.</p>
        </button>
        <button className="dashboard-card wallet" onClick={() => { window.location.href = "/studio"; }}>
          <FilmIcon size={30} />
          <h3>Creator Studio</h3>
          <p>Create and publish media.</p>
        </button>
      </section>

      <FeedModule />
    </div>
  );
}

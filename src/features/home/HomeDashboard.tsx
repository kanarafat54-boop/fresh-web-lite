import { FeedModule } from "../feed/components/FeedModule";
import { FilmIcon, SearchIcon, RadioIcon } from "../../components/Icons";

/**
 * Home is the public media surface of Fresh Web Lite.
 * Keep the existing FeedModule as the source of truth for posts instead of
 * replacing the feed with a static dashboard.
 */
export default function HomeDashboard() {
  return (
    <div className="home-dashboard">
      <section className="welcome-card">
        <FilmIcon size={36} />
        <div>
          <h2>Fresh Media</h2>
          <p>Posts, photos, short videos, long videos, news and live content.</p>
        </div>
      </section>

      <section className="dashboard-grid" aria-label="Media shortcuts">
        <button className="dashboard-card creator" onClick={() => window.history.pushState({}, "", "/shorts")}>
          <FilmIcon size={30} />
          <h3>Short Videos</h3>
          <p>Open the Shorts experience.</p>
        </button>
        <button className="dashboard-card search" onClick={() => window.history.pushState({}, "", "/software")}>
          <SearchIcon size={30} />
          <h3>Discover</h3>
          <p>Find Fresh content and software.</p>
        </button>
        <button className="dashboard-card wallet" onClick={() => window.history.pushState({}, "", "/studio")}>
          <RadioIcon size={30} />
          <h3>Creator Studio</h3>
          <p>Create and publish media.</p>
        </button>
      </section>

      <FeedModule />
    </div>
  );
}

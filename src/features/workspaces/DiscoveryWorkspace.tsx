import { useCallback, useRef, useState, type FormEvent } from "react";
import EcosystemSurface from "./EcosystemSurface";
import {
  searchPeople,
  searchPosts,
  searchVideos,
  type PersonResult,
  type PostResult,
  type VideoResult,
} from "../fresh-flow/core/searchService";
import "./WorkspacePage.css";

type SearchState =
  | { phase: "idle" }
  | { phase: "loading"; query: string }
  | { phase: "error"; query: string; message: string }
  | { phase: "done"; query: string; videos: VideoResult[]; posts: PostResult[]; people: PersonResult[]; partial: string[] };

const RESULTS_PER_KIND = 8;

/**
 * Discovery — FWL ecosystem #7.
 *
 * Universal search reuses Fresh's existing search service (full-text ranked
 * Shorts and Posts, plus public profiles). It does not create a second search
 * index and it does not invent results: anything it shows comes from the same
 * real data paths Fresh Flow already uses. If one source fails the others are
 * still shown and the failure is reported, never hidden.
 */
export default function DiscoveryWorkspace() {
  const [query, setQuery] = useState("");
  const [state, setState] = useState<SearchState>({ phase: "idle" });
  const latestRequest = useRef(0);

  const runSearch = useCallback(async (raw: string) => {
    const q = raw.trim();
    if (q.length < 2) return;
    const requestId = ++latestRequest.current;
    setState({ phase: "loading", query: q });

    const [videos, posts, people] = await Promise.allSettled([
      searchVideos(q, RESULTS_PER_KIND),
      searchPosts(q, RESULTS_PER_KIND),
      searchPeople(q, RESULTS_PER_KIND),
    ]);
    if (requestId !== latestRequest.current) return; // a newer search replaced this one

    const partial: string[] = [];
    const pick = <T,>(r: PromiseSettledResult<T[]>, label: string): T[] => {
      if (r.status === "fulfilled") return r.value;
      partial.push(label);
      return [];
    };
    const v = pick(videos, "Shorts");
    const p = pick(posts, "Posts");
    const pe = pick(people, "People");

    if (partial.length === 3) {
      setState({ phase: "error", query: q, message: "Search is unavailable right now. Please try again." });
      return;
    }
    setState({ phase: "done", query: q, videos: v, posts: p, people: pe, partial });
  }, []);

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    void runSearch(query);
  };

  return (
    <>
      <section className="workspace-page" aria-label="Universal search">
        <header className="workspace-hero">
          <span className="workspace-eyebrow">Search · Shorts · Posts · People</span>
          <h1>Universal search</h1>
          <p>Search across Fresh Flow and public profiles from one place.</p>
        </header>

        <form className="workspace-section" role="search" onSubmit={onSubmit}>
          <label htmlFor="discovery-search-input" className="workspace-eyebrow">
            What are you looking for?
          </label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input
              id="discovery-search-input"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search Shorts, posts and people"
              autoComplete="off"
              maxLength={120}
              style={{ flex: "1 1 220px", minWidth: 0 }}
            />
            <button type="submit" disabled={query.trim().length < 2 || state.phase === "loading"}>
              {state.phase === "loading" ? "Searching…" : "Search"}
            </button>
          </div>
          {query.trim().length > 0 && query.trim().length < 2 ? (
            <p className="workspace-empty" style={{ textAlign: "left", padding: "8px 0" }}>
              Type at least 2 characters.
            </p>
          ) : null}
        </form>

        <div aria-live="polite">
          {state.phase === "error" ? (
            <p className="workspace-empty" role="alert">
              {state.message}
            </p>
          ) : null}

          {state.phase === "done" ? <Results state={state} /> : null}
        </div>
      </section>

      <EcosystemSurface
        name="Discovery"
        eyebrow="Find · People · Knowledge · Opportunity"
        description="One place to find information, people, products, services, communities, and opportunities across Fresh."
        domains={[
          { id: "search", title: "Universal search", description: "Search Shorts, posts and people from the box above.", status: "live" },
          { id: "web", title: "Web discovery", description: "Connected web and research paths.", status: "pending" },
          { id: "news", title: "News", description: "News via Fresh Flow News/Posts.", status: "live" },
          { id: "places", title: "Places", description: "Places and location discovery.", status: "pending" },
          { id: "products", title: "Products", description: "Product discovery across Marketplace.", status: "surface" },
          { id: "services", title: "Services", description: "Service discovery and matching.", status: "pending" },
          { id: "people", title: "People", description: "Profiles and people search via Fresh ID.", status: "live" },
          { id: "communities", title: "Communities", description: "Community discovery.", status: "surface" },
          { id: "knowledge", title: "Knowledge", description: "Knowledge library and research themes.", status: "pending" },
          { id: "ai-rec", title: "AI recommendations", description: "Intent-based suggestions from Fresh AI.", status: "surface" },
          { id: "opp", title: "Opportunity discovery", description: "Routes into the Opportunity Engine surface.", status: "surface" },
        ]}
        note="Discovery owns find-intent. Fresh Flow owns media; Marketplace owns commerce listings. This surface coordinates — it does not invent results."
      />
    </>
  );
}

function Results({ state }: { state: Extract<SearchState, { phase: "done" }> }) {
  const { query, videos, posts, people, partial } = state;
  const total = videos.length + posts.length + people.length;

  return (
    <>
      {partial.length > 0 ? (
        <p className="workspace-empty" role="status" style={{ textAlign: "left", padding: "8px 0" }}>
          Some results could not load: {partial.join(", ")}.
        </p>
      ) : null}

      {total === 0 && partial.length === 0 ? (
        <p className="workspace-empty">No results for “{query}”. Try a different word.</p>
      ) : null}

      {videos.length > 0 ? (
        <section className="workspace-section">
          <h2>Shorts</h2>
          <ul className="workspace-list">
            {videos.map((v) => (
              <li key={v.id}>
                <h3>{v.caption || "Untitled short"}</h3>
                <p>
                  {v.authorName} · {v.likeCount} likes
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {posts.length > 0 ? (
        <section className="workspace-section">
          <h2>Posts</h2>
          <ul className="workspace-list">
            {posts.map((p) => (
              <li key={p.id}>
                <h3>{p.authorName}</h3>
                <p>{p.content}</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {people.length > 0 ? (
        <section className="workspace-section">
          <h2>People</h2>
          <ul className="workspace-list">
            {people.map((person) => (
              <li key={person.id}>
                <h3>{person.fullName || person.username || "Fresh member"}</h3>
                {person.username ? <p>@{person.username}</p> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}

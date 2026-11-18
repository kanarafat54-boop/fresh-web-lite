import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { isBrowsable, type DiscoveryItem, type DiscoveryResult } from "../../../core/discovery/globalDiscovery.ts";

const COPY: Record<string, { label: string; placeholder: string; heading: string; sources: string }> = {
  "fresh-news": { label: "Search news from around the world", placeholder: "A topic, place or event", heading: "News from across the web", sources: "the public feeds of news publishers (BBC, Al Jazeera, DW, France 24, NPR, The Guardian, allAfrica), which hold recent stories, and, when those find little, the GDELT news index, which reaches further back" },
  "fresh-music": { label: "Find songs and artists from any catalog", placeholder: "A song, artist or album", heading: "Music from the wider catalog", sources: "the Apple music catalog" },
  "books-reading": { label: "Find books from public libraries", placeholder: "A title, author or subject", heading: "Books beyond Fresh", sources: "Open Library and the Internet Archive" },
  learn: { label: "Find free lessons and textbooks", placeholder: "A subject you want to learn", heading: "Learning resources from open projects", sources: "Wikiversity and Wikibooks" },
  "research-knowledge": { label: "Search papers and encyclopedic knowledge", placeholder: "A research question or topic", heading: "Research and knowledge from open sources", sources: "OpenAlex and Wikipedia" },
};

type State = { phase: "idle" } | { phase: "loading"; headlines: boolean } | { phase: "error"; message: string } | { phase: "done"; result: DiscoveryResult };

function when(value?: string): string {
  if (!value) return "";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) || value.length < 8 ? value : d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

function Card({ item }: { item: DiscoveryItem }) {
  return (
    <li className="fresh-flow-discovery-card">
      {item.imageUrl && <img src={item.imageUrl} alt="" loading="lazy" referrerPolicy="no-referrer" />}
      <div>
        <h3><a href={item.url} target="_blank" rel="noopener noreferrer">{item.title}</a></h3>
        <p className="fresh-flow-discovery-meta">{[item.creator, item.source, when(item.publishedAt)].filter(Boolean).join(" · ")}</p>
        {item.summary && <p>{item.summary}</p>}
        {item.previewUrl && <audio controls preload="none" src={item.previewUrl} aria-label={`Preview of ${item.title}`} />}
        {item.access && <p className="fresh-flow-discovery-access">{item.access}</p>}
      </div>
    </li>
  );
}

/**
 * Search for a Fresh Flow system across open public catalogs. Always links to the original source; failures are shown, never hidden.
 * News also shows the latest headlines before anything is typed.
 */
export default function GlobalDiscoveryPanel({ systemId }: { systemId: string }) {
  const copy = COPY[systemId];
  const browsable = isBrowsable(systemId);
  const [query, setQuery] = useState("");
  const [state, setState] = useState<State>({ phase: "idle" });
  const run = useRef(0);

  const load = useCallback(async (q: string) => {
    const mine = ++run.current;
    setState({ phase: "loading", headlines: q === "" });
    try {
      const res = await fetch(`/api/discover?system=${encodeURIComponent(systemId)}&q=${encodeURIComponent(q)}`);
      const body = await res.json().catch(() => null) as (DiscoveryResult & { error?: string }) | null;
      if (mine !== run.current) return;
      if (!body || (!res.ok && !body.providers)) return setState({ phase: "error", message: body?.error ?? "Search is not available right now. Try again in a moment." });
      if (!res.ok) return setState({ phase: "error", message: `${body.providers.map((p) => p.error).filter(Boolean).join(" ")} Try again in a moment.` });
      setState({ phase: "done", result: body });
    } catch {
      if (mine === run.current) setState({ phase: "error", message: "Search could not be reached. Check your connection and try again." });
    }
  }, [systemId]);

  useEffect(() => {
    if (browsable) void load("");
    return () => { run.current += 1; };
  }, [browsable, load]);

  if (!copy) return null;

  function search(event: FormEvent) {
    event.preventDefault();
    const q = query.trim();
    if (q.length === 0 && browsable) return void load("");
    if (q.length < 2) return setState({ phase: "error", message: "Type at least 2 characters to search." });
    void load(q);
  }

  const loading = state.phase === "loading";
  const result = state.phase === "done" ? state.result : null;
  const missing = result ? result.providers.filter((p) => !p.ok) : [];

  return (
    <section className="fresh-flow-discovery" aria-label={copy.heading}>
      <h2>{copy.heading}</h2>
      <form onSubmit={search} role="search">
        <label className="fresh-flow-field-label" htmlFor={`discover-${systemId}`}>{copy.label}</label>
        <div className="fresh-flow-discovery-row">
          <input id={`discover-${systemId}`} value={query} maxLength={120} onChange={(e) => setQuery(e.target.value)} placeholder={copy.placeholder} />
          <button type="submit" className="fresh-flow-feature-primary" disabled={loading}>{loading ? "Searching…" : "Search"}</button>
        </div>
      </form>
      {state.phase === "idle" && <p className="fresh-flow-system-note">Results come from {copy.sources}. They are not limited to what is posted on Fresh. Each result opens at its original source.</p>}
      {state.phase === "loading" && state.headlines && <p className="fresh-flow-system-note" role="status">Loading the latest headlines…</p>}
      {state.phase === "error" && <p className="fresh-flow-inline-confirmation" role="alert">{state.message}</p>}
      {result && (
        <>
          <h3 className="fresh-flow-discovery-heading">{result.query ? `Results for “${result.query}”` : "Latest headlines"}</h3>
          {missing.map((p) => <p key={p.id} className="fresh-flow-inline-confirmation" role="status">{p.error}{result.items.length > 0 ? " Showing the other sources." : ""}</p>)}
          {result.providers.filter((p) => p.ok && p.note).map((p) => <p key={p.id} className="fresh-flow-discovery-access" role="status">{p.note}</p>)}
          {result.items.length === 0
            ? <p className="fresh-flow-system-note" role="status">{missing.length > 0 ? `Nothing found from the sources that answered. Try again in a moment.` : `No results for “${result.query}”. Try different words.`}</p>
            : <ul className="fresh-flow-discovery-list">{result.items.map((item) => <Card key={item.id} item={item} />)}</ul>}
          <p className="fresh-flow-discovery-credit">Sources that answered: {result.providers.filter((p) => p.ok).map((p) => p.label).join(", ") || "none"}. Fresh links to the original and does not host or copy it.</p>
        </>
      )}
    </section>
  );
}

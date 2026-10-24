import { useRef, useState, type FormEvent } from "react";
import { WebSearchError, type SearchApiResponse } from "./webSearchClient";
import "./FreshWebSearch.css";

type Phase =
  | { phase: "idle" }
  | { phase: "loading"; query: string }
  | { phase: "error"; query: string; code: string; message: string; retryable: boolean }
  | { phase: "done"; data: SearchApiResponse };

const dateFmt = (iso: string | null) => (iso && !Number.isNaN(Date.parse(iso)) ? new Date(iso).toISOString().slice(0, 10) : null);
const hostOf = (url: string) => { try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return url; } };

export interface FreshWebSearchViewProps {
  signedIn: boolean;
  search: (query: string, signal: AbortSignal) => Promise<SearchApiResponse>;
}

/** Presentational search surface. Everything shown comes from the API response; nothing is invented. */
export default function FreshWebSearchView({ signedIn, search }: FreshWebSearchViewProps) {
  const [value, setValue] = useState("");
  const [state, setState] = useState<Phase>({ phase: "idle" });
  const abort = useRef<AbortController | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const query = value.trim();
    if (!query) return;
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;
    setState({ phase: "loading", query });
    try {
      const data = await search(query, controller.signal);
      if (!controller.signal.aborted) setState({ phase: "done", data });
    } catch (e) {
      if (controller.signal.aborted || (e as Error).name === "AbortError") return;
      const err = e instanceof WebSearchError ? e : null;
      setState({ phase: "error", query, code: err?.code ?? "unknown_error", message: err?.message ?? "Search failed unexpectedly.", retryable: err?.retryable ?? true });
    }
  }

  return (
    <section className="fws" aria-labelledby="fws-title" data-testid="fresh-web-search">
      <header className="fws-header">
        <h1 id="fws-title">Fresh Web Search</h1>
        <p>Search pages Fresh has crawled and indexed itself. Every result shows its source, retrieval date and the exact passage.</p>
      </header>

      {!signedIn ? (
        <p className="fws-note" role="status">Sign in to search the Fresh index.</p>
      ) : (
        <form className="fws-form" role="search" onSubmit={submit}>
          <label htmlFor="fws-query">Search the Fresh index</label>
          <div className="fws-row">
            <input id="fws-query" type="search" value={value} maxLength={500} autoComplete="off" onChange={(e) => setValue(e.target.value)} placeholder="e.g. coral bleaching ocean temperatures" />
            <button type="submit" disabled={state.phase === "loading" || !value.trim()}>{state.phase === "loading" ? "Searching…" : "Search"}</button>
          </div>
        </form>
      )}

      <div aria-live="polite" aria-busy={state.phase === "loading"} className="fws-live">
        {state.phase === "loading" && <p className="fws-note" role="status">Searching the Fresh index…</p>}

        {state.phase === "error" && (
          <div className="fws-error" role="alert">
            <strong>Search could not be completed.</strong>
            <p>{state.message}</p>
            <p className="fws-meta">Error code: {state.code}{state.retryable ? " · You can try again." : ""}</p>
          </div>
        )}

        {state.phase === "done" && <Results data={state.data} />}
      </div>
    </section>
  );
}

function Results({ data }: { data: SearchApiResponse }) {
  const empty = data.results.length === 0;
  return (
    <div className="fws-results" data-testid="fws-results">
      <p className="fws-summary" role="status">
        {empty ? `No results for “${data.query}”.` : `${data.results.length} result${data.results.length === 1 ? "" : "s"} for “${data.query}”`}
        {data.indexedDocuments !== null && ` · ${data.indexedDocuments} indexed document${data.indexedDocuments === 1 ? "" : "s"}`} · {data.tookMs} ms
      </p>

      {data.warnings.length > 0 && (
        <ul className="fws-warnings" aria-label="Notices">{data.warnings.map((w) => <li key={w}>{w}</li>)}</ul>
      )}

      {!empty && (
        <ol className="fws-list">
          {data.results.map((r) => (
            <li key={r.documentId} className="fws-item">
              <h2><a href={r.url} target="_blank" rel="noopener noreferrer">{r.title}</a></h2>
              <p className="fws-meta">
                <span>{hostOf(r.url)}</span>
                {dateFmt(r.publishedAt) && <span>Published {dateFmt(r.publishedAt)}</span>}
                <span>Retrieved {dateFmt(r.retrievedAt)}</span>
                {r.language && <span lang="en">Language {r.language}</span>}
                <span>Score {r.score}</span>
              </p>
              {r.passages.slice(0, 2).map((p) => (
                <blockquote key={p.id} cite={r.url} className="fws-passage">{p.text}</blockquote>
              ))}
            </li>
          ))}
        </ol>
      )}

      <p className="fws-meta" data-testid="fws-persistence">
        {data.persistence.status === "persisted" && `Saved ${data.persistence.evidence} evidence passage${data.persistence.evidence === 1 ? "" : "s"} from ${data.persistence.sources} source${data.persistence.sources === 1 ? "" : "s"} to Fresh Intelligence.`}
        {data.persistence.status === "skipped" && `Evidence was not saved: ${data.persistence.reason}`}
        {data.persistence.status === "failed" && `Evidence could not be saved (${data.persistence.error.code}).`}
        {" "}Passages are retrieved text, not verified facts.
      </p>
    </div>
  );
}

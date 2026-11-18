import { useMemo, useState } from "react";
import type { IntelligenceResponse, IntelligenceSource, IntelligenceSourceKind } from "../../ai/intelligence/intelligenceConnectors";
import "./FreshResearchResults.css";

type ResultTab = "all" | "web" | "news" | "images" | "videos";
const TABS: Array<{ id: ResultTab; label: string }> = [
  { id: "all", label: "All" },
  { id: "web", label: "Web" },
  { id: "news", label: "News" },
  { id: "images", label: "Images" },
  { id: "videos", label: "Videos" },
];

function canonicalUrl(value: string): string {
  try {
    const url = new URL(value);
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) {
      if (/^(utm_|fbclid$|gclid$|ref$)/i.test(key)) url.searchParams.delete(key);
    }
    url.hostname = url.hostname.toLowerCase().replace(/^www\./, "");
    url.pathname = url.pathname.replace(/\/$/, "") || "/";
    return url.toString();
  } catch {
    return value.trim();
  }
}

function kindOf(source: IntelligenceSource): IntelligenceSourceKind {
  return source.kind ?? "web";
}

function sourceLabel(source: IntelligenceSource): string {
  try { return new URL(source.url).hostname.replace(/^www\./, ""); }
  catch { return source.provider || "Source"; }
}

function dateLabel(value?: string): string | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
}

export default function FreshResearchResults({ result }: { result: IntelligenceResponse }) {
  const [tab, setTab] = useState<ResultTab>("all");
  const sources = useMemo(() => {
    const seen = new Set<string>();
    return (result.sources ?? []).filter((source) => {
      const key = canonicalUrl(source.url);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [result.sources]);
  const visible = tab === "all" ? sources : sources.filter((source) => kindOf(source) === (tab === "images" ? "image" : tab === "videos" ? "video" : tab));
  const verification = result.verification;
  const mediaTab = tab === "images" || tab === "videos";

  return (
    <section className="fresh-research-results" aria-label="Fresh research results">
      <header className="fresh-research-results__heading">
        <div>
          <span className="fresh-research-results__eyebrow">FRESH RESEARCH</span>
          <h2>Research overview</h2>
        </div>
        <span className="fresh-research-results__source-count">{sources.length} unique {sources.length === 1 ? "source" : "sources"}</span>
      </header>

      <div className="fresh-research-results__answer">
        <h3>Summary</h3>
        <p>{result.text}</p>
      </div>

      {verification && (
        <div className="fresh-research-results__verification" aria-label="Source coverage">
          <span><strong>{verification.uniqueDomains}</strong> unique domains</span>
          <span><strong>{verification.passes}</strong> research passes</span>
          <span><strong>{verification.sourceDiversity}</strong> source diversity</span>
          <span><strong>{verification.confidence}</strong> system assessment</span>
        </div>
      )}

      {result.warnings?.length ? (
        <div className="fresh-research-results__warnings" role="status">
          {result.warnings.map((warning, index) => <p key={index}>{warning}</p>)}
        </div>
      ) : null}

      <nav className="fresh-research-results__tabs" aria-label="Research result categories">
        {TABS.map((item) => (
          <button key={item.id} type="button" className={tab === item.id ? "is-active" : ""} onClick={() => setTab(item.id)} aria-pressed={tab === item.id}>
            {item.label}
            {item.id === "all" ? <span>{sources.length}</span> : <span>{sources.filter((source) => kindOf(source) === (item.id === "images" ? "image" : item.id === "videos" ? "video" : item.id)).length}</span>}
          </button>
        ))}
      </nav>

      <div className="fresh-research-results__list">
        {visible.length ? visible.map((source) => (
          <article className="fresh-research-source" key={canonicalUrl(source.url)}>
            <div className="fresh-research-source__meta">
              <span>{sourceLabel(source)}</span>
              <span>{kindOf(source)}</span>
              {dateLabel(source.publishedAt) && <time dateTime={source.publishedAt}>{dateLabel(source.publishedAt)}</time>}
            </div>
            <a href={source.url} target="_blank" rel="noreferrer">
              <strong>{source.title}</strong>
            </a>
            {source.snippet && <p>{source.snippet}</p>}
          </article>
        )) : (
          <div className="fresh-research-results__empty">
            <strong>{mediaTab ? `No ${tab} were returned for this search.` : "No sources in this category."}</strong>
            <p>{mediaTab ? "Fresh will only show media when a connected provider returns real media results and attribution. It will not invent thumbnails or previews." : "Try another category or broaden your search."}</p>
          </div>
        )}
      </div>
      <p className="fresh-research-results__note">Sources are retrieved references, not automatic proof of every statement. Check the original pages and their publication dates.</p>
    </section>
  );
}

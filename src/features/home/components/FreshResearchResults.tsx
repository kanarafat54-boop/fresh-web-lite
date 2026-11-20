import { useMemo, useState } from "react";
import type { IntelligenceResponse, IntelligenceSource, IntelligenceSourceKind } from "../../ai/intelligence/intelligenceConnectors";
import FreshAnswerEvidence from "./FreshAnswerEvidence";
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
    if (url.protocol !== "https:" && url.protocol !== "http:") return "";
    url.hash = "";
    for (const key of [...url.searchParams.keys()]) {
      if (/^(utm_|fbclid$|gclid$|ref$)/i.test(key)) url.searchParams.delete(key);
    }
    url.hostname = url.hostname.toLowerCase().replace(/^www\./, "");
    url.pathname = url.pathname.replace(/\/$/, "") || "/";
    return url.toString();
  } catch {
    return "";
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

function cleanSnippet(source: IntelligenceSource): string {
  const snippet = (source.snippet ?? "").trim();
  const title = source.title.trim();
  if (!snippet || !title) return snippet;
  if (snippet.toLocaleLowerCase().startsWith(title.toLocaleLowerCase())) {
    return snippet.slice(title.length).trim().replace(/^[:.]+/, "").trim();
  }
  return snippet;
}

function faviconUrl(source: IntelligenceSource): string | null {
  try {
    const url = new URL(source.url);
    return url.protocol === "https:" || url.protocol === "http:" ? new URL("/favicon.ico", url.origin).toString() : null;
  } catch { return null; }
}

export default function FreshResearchResults({ result, onRetryBroaderSearch }: { result: IntelligenceResponse; onRetryBroaderSearch?: () => void }) {
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
          <h2>What’s happening</h2>
        </div>
        <span className="fresh-research-results__source-count">{sources.length} unique {sources.length === 1 ? "source" : "sources"}</span>
      </header>

      {result.answerEvidence?.statements.length
        ? <FreshAnswerEvidence evidence={result.answerEvidence} sources={sources} />
        : (
          <div className="fresh-research-results__answer">
            <h3>What we found</h3>
            <p>{result.text}</p>
          </div>
        )}

      {verification && (
        <div className="fresh-research-results__verification" aria-label="Source coverage">
          <span><strong>{verification.uniqueDomains}</strong> unique domains</span>
          {verification.newsSources !== undefined && <span><strong>{verification.newsSources}</strong> news sources</span>}
          {Number.isFinite(verification.passes) && <span><strong>{verification.passes}</strong> research passes</span>}
          <span><strong>{verification.sourceDiversity}</strong> source diversity</span>
          <span><strong>{verification.confidence}</strong> system assessment</span>
        </div>
      )}

      {result.warnings?.length ? (
        <div className="fresh-research-results__warnings" role="status">
          {result.warnings.map((warning, index) => <p key={index}>{warning}</p>)}
          {onRetryBroaderSearch && verification && (verification.sourceDiversity === "low" || verification.newsSources === 0) && (
            <button type="button" className="fresh-research-results__retry" onClick={onRetryBroaderSearch}>Retry with broader news search</button>
          )}
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
              <time dateTime={source.publishedAt || undefined}>{dateLabel(source.publishedAt) ?? "Publication date unavailable"}</time>
            </div>
            <div className="fresh-research-source__title">
              {faviconUrl(source) && <img src={faviconUrl(source)!} alt="" aria-hidden="true" loading="lazy" onError={(event) => { event.currentTarget.hidden = true; }} />}
              <a href={source.url} target="_blank" rel="noreferrer"><strong>{source.title}</strong><span aria-hidden="true"> ↗</span></a>
            </div>
            {cleanSnippet(source) && <p>{cleanSnippet(source)}</p>}
            <a className="fresh-research-source__open" href={source.url} target="_blank" rel="noreferrer">Open original source ↗</a>
            {source.evidencePassport && (
              <details className="fresh-research-passport">
                <summary>Evidence passport · {source.evidencePassport.id}</summary>
                <dl>
                  <div><dt>Record issuer</dt><dd>{source.evidencePassport.issuer}</dd></div>
                  <div><dt>Ledger persistence</dt><dd>{result.intelligencePersisted === true ? "Confirmed in Fresh ledger" : result.intelligencePersisted === false ? "Not confirmed stored" : "Storage status unavailable"}</dd></div>
                  <div><dt>Publisher domain</dt><dd>{source.evidencePassport.source.publisherDomain}</dd></div>
                  <div><dt>Passport issued</dt><dd>{source.evidencePassport.issuedAt}</dd></div>
                  <div><dt>Observed by Fresh</dt><dd>{source.evidencePassport.source.observedAt}</dd></div>
                  <div><dt>Exact material fingerprinted</dt><dd>{source.evidencePassport.capturedMaterial.text}</dd></div>
                  <div><dt>Captured by</dt><dd>{source.evidencePassport.source.retrievalProvider}</dd></div>
                  <div><dt>Captured material</dt><dd>{source.evidencePassport.capturedMaterial.kind === "publisher_excerpt" ? "Publisher excerpt" : "Title only"}</dd></div>
                  <div><dt>SHA-256 fingerprint</dt><dd><code>{source.evidencePassport.capturedMaterial.digest}</code></dd></div>
                  <div><dt>Publisher authenticity</dt><dd>Not independently verified</dd></div>
                  <div><dt>Claim support</dt><dd>Requires checking the captured content against the specific claim</dd></div>
                </dl>
                <p>{source.evidencePassport.limitations[0]} {source.evidencePassport.limitations[1]}</p>
              </details>
            )}
          </article>
        )) : (
          <div className="fresh-research-results__empty">
            <strong>{mediaTab ? `No ${tab} were returned for this search.` : "No sources in this category."}</strong>
            <p>{mediaTab ? "Fresh will only show media when a connected provider returns real media results and attribution. It will not invent thumbnails or previews." : "Try another category or broaden your search."}</p>
          </div>
        )}
      </div>
      <p className="fresh-research-results__note">What confirms this? Open the original pages below to see the publisher, the information they reported, and when it was published. A source is useful only when its actual content supports the point being made.</p>
    </section>
  );
}

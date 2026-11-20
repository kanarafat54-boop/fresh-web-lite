import { useMemo } from "react";
import { quoteMatchesPassport, type AnswerEvidence, type AnswerStatement, type NoPassageReason, type PassageSupport } from "../../../core/research/claimEvidence.js";
import type { IntelligenceSource } from "../../ai/intelligence/intelligenceConnectors";

const REASONS: Record<NoPassageReason, string> = {
  too_short: "Too short to check against a source.",
  low_overlap: "No captured source passage contains these words.",
  number_missing: "A source uses similar words, but not these numbers or dates.",
  negation_differs: "A source with similar words says something different, possibly the opposite.",
  no_sources: "No source text was captured to check this against.",
};

const dateLabel = (value?: string): string | null => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
};
const httpUrl = (value: string): string | undefined => (/^https?:\/\//i.test(value) ? value : undefined);

type Checked = AnswerStatement & { recheckFailed: boolean };

function Quote({ passage }: { passage: PassageSupport }) {
  const published = dateLabel(passage.publishedAt);
  return (
    <blockquote className="fresh-claims__quote">
      <p>“{passage.quote}”</p>
      <footer>
        <a href={httpUrl(passage.sourceUrl)} target="_blank" rel="noreferrer">{passage.publisherDomain}</a>
        <span>{published ? `Published ${published}` : "No publication date given"}</span>
        <span>Captured {dateLabel(passage.observedAt) ?? passage.observedAt}</span>
        {passage.capturedKind === "title_only" && <span>Title only</span>}
        <span>{passage.strength === "strong" ? "Strong match" : "Partial match"}: {passage.matchedTerms.join(", ")}</span>
        <code>{passage.passportId}</code>
      </footer>
    </blockquote>
  );
}

/**
 * The answer, one statement at a time. A statement is shown as backed only when a quote from a captured source passage is
 * found AND re-checks against that source's saved text in this same response. Anything else says it is not confirmed.
 */
export default function FreshAnswerEvidence({ evidence, sources }: { evidence: AnswerEvidence; sources: readonly IntelligenceSource[] }) {
  const statements = useMemo<Checked[]>(() => {
    const passports = new Map(sources.flatMap((source) => (source.evidencePassport ? [[source.evidencePassport.id, source.evidencePassport] as const] : [])));
    return evidence.statements.map((statement) => {
      const passages = statement.passages.filter((passage) => { const passport = passports.get(passage.passportId); return Boolean(passport) && quoteMatchesPassport(passage, passport!); });
      const recheckFailed = statement.support === "passage_found" && passages.length === 0;
      return { ...statement, passages, support: recheckFailed ? "no_passage_found" : statement.support, recheckFailed };
    });
  }, [evidence, sources]);
  const claims = statements.filter((statement) => statement.kind === "claim");
  const backed = claims.filter((statement) => statement.support === "passage_found");
  const unbacked = claims.length - backed.length;

  return (
    <div className="fresh-research-results__answer fresh-claims">
      <h3>What we found</h3>
      {claims.length > 0 && (
        <p className="fresh-claims__summary" role="status">
          {backed.length} of {claims.length} {claims.length === 1 ? "statement has" : "statements have"} a matching passage in the sources Fresh captured.
          {unbacked > 0 && ` ${unbacked} ${unbacked === 1 ? "is" : "are"} not confirmed by any captured source.`}
        </p>
      )}
      <ol className="fresh-claims__list">
        {statements.map((statement) => {
          if (statement.kind === "note") return <li key={statement.id} className="fresh-claims__note">{statement.text}</li>;
          const found = statement.support === "passage_found";
          const strong = found && statement.passages[0].strength === "strong";
          return (
            <li key={statement.id} className={`fresh-claims__item ${found ? (strong ? "is-backed" : "is-partial") : "is-unbacked"}`}>
              <details>
                <summary>
                  <span className="fresh-claims__text">{statement.text}</span>
                  <span className="fresh-claims__chip">{found ? (strong ? "Passage found" : "Partial match") : "No matching passage"}</span>
                </summary>
                {found
                  ? statement.passages.map((passage) => <Quote key={passage.passportId} passage={passage} />)
                  : <p className="fresh-claims__why">{statement.recheckFailed ? "The saved quote could not be re-checked against the source text, so it is not shown as support." : REASONS[statement.reason ?? "low_overlap"]}</p>}
              </details>
            </li>
          );
        })}
      </ol>
      <details className="fresh-claims__limits">
        <summary>What “matching passage” means</summary>
        <ul>{evidence.limitations.map((limit) => <li key={limit}>{limit}</li>)}</ul>
      </details>
    </div>
  );
}

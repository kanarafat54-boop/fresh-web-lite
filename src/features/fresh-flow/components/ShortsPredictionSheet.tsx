import { useEffect, useRef, useState } from "react";
import { useFreshId } from "../../fresh-id/context/FreshIdContext";
import { PREDICTION_NOTICE, stateLabel, MIN_RESOLVED_FOR_HIT_RATE, type Outcome, type PredictionWithState, type TrackRecord } from "../core/predictions";
import { loadAuthorTrackRecord, loadShortPredictions, publishPrediction, recordOutcome } from "../core/predictionsService";
import "./shortsContextPanel.css";

type Props = { shortId: string; authorId: string; authorName: string; onClose: () => void };

/** View, publish and resolve predictions attached to a Short (Prediction Ledger on Fresh Proof). */
export default function ShortsPredictionSheet({ shortId, authorId, authorName, onClose }: Props) {
  const { user, isGuest } = useFreshId();
  const isAuthor = Boolean(user) && !isGuest && user?.id === authorId;
  const [predictions, setPredictions] = useState<PredictionWithState[] | null>(null);
  const [record, setRecord] = useState<TrackRecord | null>(null);
  const [available, setAvailable] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [problems, setProblems] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [statement, setStatement] = useState("");
  const [criteria, setCriteria] = useState("");
  const [resolvesOn, setResolvesOn] = useState("");
  const [probability, setProbability] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [evidence, setEvidence] = useState("");
  const closeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function refresh() {
    try {
      const [forShort, forAuthor] = await Promise.all([loadShortPredictions(shortId), loadAuthorTrackRecord(authorId)]);
      setPredictions(forShort.predictions);
      setAvailable(forShort.available);
      setRecord(forAuthor.available ? forAuthor.record : null);
    } catch { setError("Fresh could not load predictions. Check your connection and try again."); }
  }
  useEffect(() => { void refresh(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [shortId, authorId]);

  async function publish() {
    if (busy) return;
    setBusy(true);
    setProblems([]);
    const outcome = await publishPrediction(shortId, {
      statement, criteria, resolvesOn, acknowledged,
      probability: probability.trim() ? Number(probability) : null,
      sourceUrl: sourceUrl.trim() || null,
    });
    setBusy(false);
    if (outcome.ok) { setStatement(""); setCriteria(""); setResolvesOn(""); setProbability(""); setSourceUrl(""); setAcknowledged(false); await refresh(); }
    else setProblems(outcome.problems);
  }

  async function resolve(prediction: PredictionWithState, outcome: Outcome) {
    if (busy) return;
    setBusy(true);
    setProblems([]);
    const result = await recordOutcome(prediction, outcome, evidence.trim() || null, null);
    setBusy(false);
    if (result.ok) { setEvidence(""); await refresh(); } else setProblems(result.problems);
  }

  return (
    <div className="shorts-sheet-backdrop" onClick={onClose}>
      <div className="shorts-sheet" role="dialog" aria-modal="true" aria-label="Predictions" onClick={(event) => event.stopPropagation()}>
        <div className="shorts-sheet-header">
          <h3>Predictions</h3>
          <button ref={closeRef} type="button" className="shorts-sheet-close" onClick={onClose} aria-label="Close">✕</button>
        </div>
        {error ? <p role="alert">{error}</p> : null}
        {!available ? <p className="shorts-why-note">Predictions are not available yet.</p> : null}
        {available && predictions === null && !error ? <p>Loading…</p> : null}
        {available && predictions && predictions.length === 0 ? <p>No predictions on this Short.</p> : null}
        {predictions?.map((p) => (
          <article key={p.key} className="shorts-context-section">
            <h4>{stateLabel(p.state)}{p.probability != null ? ` · ${p.probability}% sure` : ""}</h4>
            <p><strong>{p.statement}</strong></p>
            <p>Judged by: {p.criteria}</p>
            <p>Date: {p.resolvesOn}. Published {new Date(p.publishedAt).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}. Wording is locked.</p>
            {p.sourceUrl ? <p><a href={p.sourceUrl} target="_blank" rel="noopener noreferrer">Source</a></p> : null}
            {p.resolution ? <p>{p.resolution.evidenceUrl ? <a href={p.resolution.evidenceUrl} target="_blank" rel="noopener noreferrer">Evidence</a> : "No evidence link."} Recorded by the creator.</p> : null}
            {isAuthor && !p.resolution ? (
              <div>
                {p.state === "due" ? <input type="url" inputMode="url" placeholder="Link to the evidence (https://…)" value={evidence} onChange={(e) => setEvidence(e.target.value)} aria-label="Evidence link" /> : null}
                <div className="shorts-history-confirm">
                  {p.state === "due" ? <><button type="button" disabled={busy} onClick={() => void resolve(p, "hit")}>It happened</button><button type="button" disabled={busy} onClick={() => void resolve(p, "miss")}>It did not</button><button type="button" disabled={busy} onClick={() => void resolve(p, "void")}>Cannot be judged</button></> : null}
                  <button type="button" disabled={busy} onClick={() => void resolve(p, "withdrawn")}>Withdraw</button>
                </div>
              </div>
            ) : null}
          </article>
        ))}
        {record && record.total > 0 ? (
          <section className="shorts-context-section">
            <h4>{authorName}'s track record</h4>
            <p>{record.total} prediction{record.total === 1 ? "" : "s"}: {record.hits} hit, {record.misses} miss, {record.withdrawn} withdrawn, {record.voids} void, {record.open + record.due} not yet judged.</p>
            <p>{record.hitRate != null ? `Hit rate ${record.hitRate}% (hits out of hits, misses and withdrawals).` : `No hit rate until ${MIN_RESOLVED_FOR_HIT_RATE} predictions are judged.`}</p>
            {record.calibration ? <p>Stated confidence averaged {record.calibration.statedAverage}%; {record.calibration.actual}% happened.</p> : null}
            <p className="shorts-why-note">Outcomes are recorded by the creator. There is no independent review yet, so check the evidence link.</p>
          </section>
        ) : null}
        {isAuthor && available && predictions && predictions.length === 0 ? (
          <section className="shorts-context-section">
            <h4>Make a prediction</h4>
            <ul className="shorts-why-list">{PREDICTION_NOTICE.map((line) => <li key={line}>{line}</li>)}</ul>
            <label>Prediction<textarea value={statement} maxLength={280} onChange={(e) => setStatement(e.target.value)} rows={2} /></label>
            <label>How it will be judged<textarea value={criteria} maxLength={500} onChange={(e) => setCriteria(e.target.value)} rows={2} placeholder="What outcome, measured how, from what source" /></label>
            <label>Date it can be judged<input type="date" value={resolvesOn} onChange={(e) => setResolvesOn(e.target.value)} /></label>
            <label>How sure are you, 1 to 99% (optional)<input type="number" min={1} max={99} inputMode="numeric" value={probability} onChange={(e) => setProbability(e.target.value)} /></label>
            <label>Source (optional)<input type="url" inputMode="url" value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} placeholder="https://…" /></label>
            <label className="shorts-check"><input type="checkbox" checked={acknowledged} onChange={(e) => setAcknowledged(e.target.checked)} /> I understand this is an opinion, not advice, and cannot be edited.</label>
            {problems.length ? <ul role="alert" className="shorts-why-list">{problems.map((p) => <li key={p}>{p}</li>)}</ul> : null}
            <div className="shorts-history-confirm"><button type="button" disabled={busy} onClick={() => void publish()}>{busy ? "Publishing…" : "Publish prediction"}</button></div>
          </section>
        ) : problems.length ? <ul role="alert" className="shorts-why-list">{problems.map((p) => <li key={p}>{p}</li>)}</ul> : null}
      </div>
    </div>
  );
}

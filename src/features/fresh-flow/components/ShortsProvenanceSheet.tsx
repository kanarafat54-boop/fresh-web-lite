import { useEffect, useRef, useState } from "react";
import { useFreshId } from "../../fresh-id/context/FreshIdContext";
import { NOTE_MAX, ORIGINS, PROVENANCE_NOTICE, originLabel, type Declaration, type Origin } from "../core/provenance";
import { checkAuthorChain, declareProvenance, loadProvenance } from "../core/provenanceService";
import "./shortsContextPanel.css";

type Props = { shortId: string; authorId: string; authorName: string; onClose: () => void };

/** Where a Short comes from, as declared by its creator and recorded on Fresh Proof. */
export default function ShortsProvenanceSheet({ shortId, authorId, authorName, onClose }: Props) {
  const { user, isGuest } = useFreshId();
  const isAuthor = Boolean(user) && !isGuest && user?.id === authorId;
  const [declarations, setDeclarations] = useState<Declaration[] | null>(null);
  const [available, setAvailable] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [problems, setProblems] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [origin, setOrigin] = useState<Origin | "">("");
  const [tools, setTools] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [note, setNote] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [integrity, setIntegrity] = useState<string | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function refresh() {
    try {
      const result = await loadProvenance(shortId, authorId);
      setDeclarations(result.declarations);
      setAvailable(result.available);
    } catch { setError("Fresh could not load the origin. Check your connection and try again."); }
  }
  useEffect(() => { void refresh(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [shortId, authorId]);

  async function declare() {
    if (busy) return;
    setBusy(true);
    setProblems([]);
    const outcome = await declareProvenance(shortId, { origin, tools, sourceUrl, note, acknowledged });
    setBusy(false);
    if (outcome.ok) { setOrigin(""); setTools(""); setSourceUrl(""); setNote(""); setAcknowledged(false); await refresh(); }
    else setProblems(outcome.problems);
  }

  async function check() {
    setIntegrity("Checking…");
    const result = await checkAuthorChain(authorId);
    setIntegrity(result === null ? "Fresh could not run the check right now." : result.ok ? `Checked ${result.checked} record${result.checked === 1 ? "" : "s"} by ${authorName}: none were altered after publishing.` : "Warning: a record in this creator's history does not match its seal.");
  }

  const current = declarations?.[0] ?? null;

  return (
    <div className="shorts-sheet-backdrop" onClick={onClose}>
      <div className="shorts-sheet" role="dialog" aria-modal="true" aria-label="Origin of this Short" onClick={(event) => event.stopPropagation()}>
        <div className="shorts-sheet-header">
          <h3>Origin of this Short</h3>
          <button ref={closeRef} type="button" className="shorts-sheet-close" onClick={onClose} aria-label="Close">✕</button>
        </div>
        {error ? <p role="alert">{error}</p> : null}
        {!available ? <p className="shorts-why-note">Origin declarations are not available yet.</p> : null}
        {available && declarations === null && !error ? <p>Loading…</p> : null}
        {available && declarations && !current ? <p>{authorName} has not declared where this Short comes from. That is not a sign it is good or bad; there is simply no declaration.</p> : null}
        {current ? (
          <section className="shorts-context-section">
            <h4>{originLabel(current.origin)} · declared by {authorName}</h4>
            {current.tools ? <p>Tools: {current.tools}</p> : null}
            {current.note ? <p>{current.note}</p> : null}
            {current.sourceUrl ? <p><a href={current.sourceUrl} target="_blank" rel="noopener noreferrer">Source or credit</a></p> : null}
            <p className="shorts-why-note">Recorded {new Date(current.declaredAt).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}{current.recordHash ? ` · seal ${current.recordHash.slice(0, 12)}` : ""}</p>
          </section>
        ) : null}
        {declarations && declarations.length > 1 ? (
          <section className="shorts-context-section">
            <h4>Earlier declarations</h4>
            <ul className="shorts-why-list">{declarations.slice(1).map((d) => <li key={d.seq}>{originLabel(d.origin)}, {new Date(d.declaredAt).toLocaleDateString()}</li>)}</ul>
          </section>
        ) : null}
        <ul className="shorts-why-list">{PROVENANCE_NOTICE.map((line) => <li key={line}>{line}</li>)}</ul>
        {available ? (
          <div className="shorts-history-confirm">
            <button type="button" onClick={() => void check()}>Check records were not altered</button>
          </div>
        ) : null}
        {integrity ? <p role="status" className="shorts-why-note">{integrity}</p> : null}
        {isAuthor && available ? (
          <section className="shorts-context-section">
            <h4>{current ? "Add a new declaration" : "Declare the origin"}</h4>
            <label>Where does it come from?
              <select value={origin} onChange={(e) => setOrigin(e.target.value as Origin | "")}>
                <option value="">Choose…</option>
                {ORIGINS.map((o) => <option key={o.id} value={o.id}>{o.label}: {o.help}</option>)}
              </select>
            </label>
            <label>Tools used (optional, required for AI)<input value={tools} maxLength={200} onChange={(e) => setTools(e.target.value)} /></label>
            <label>Link to the original or credit (optional)<input type="url" inputMode="url" value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} placeholder="https://…" /></label>
            <label>Note (optional)<textarea value={note} maxLength={NOTE_MAX} rows={2} onChange={(e) => setNote(e.target.value)} /></label>
            <label className="shorts-check"><input type="checkbox" checked={acknowledged} onChange={(e) => setAcknowledged(e.target.checked)} /> This is accurate and cannot be edited.</label>
            {problems.length ? <ul role="alert" className="shorts-why-list">{problems.map((p) => <li key={p}>{p}</li>)}</ul> : null}
            <div className="shorts-history-confirm"><button type="button" disabled={busy} onClick={() => void declare()}>{busy ? "Recording…" : "Record declaration"}</button></div>
          </section>
        ) : null}
      </div>
    </div>
  );
}

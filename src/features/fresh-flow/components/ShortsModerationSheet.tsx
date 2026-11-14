import { useCallback, useEffect, useRef, useState } from "react";
import { decisionsFor, targetLabel, validateReason, type AppealItem, type QueueItem, type ReportDecision } from "../core/moderationReview";
import { decideAppeal, decideReport, loadAppealQueue, loadReviewQueue } from "../core/moderationReviewService";
import "./shortsContextPanel.css";
import "./shortsModeration.css";

type Tab = "reports" | "appeals";

/** Reviewer queue: reports to act on, and creators' appeals. Only reviewers (admins) reach it, and the database refuses everyone else. */
export default function ShortsModerationSheet({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<Tab>("reports");
  const [reports, setReports] = useState<QueueItem[] | null>(null);
  const [appeals, setAppeals] = useState<AppealItem[] | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const closeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const refresh = useCallback(async () => {
    const [r, a] = await Promise.all([loadReviewQueue("open"), loadAppealQueue("open")]);
    setReports(r.items);
    setAppeals(a.items);
    setUnavailable(r.unavailable || a.unavailable);
    setMessage(r.message ?? a.message ?? null);
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);

  const note = (id: string) => notes[id] ?? "";

  async function act(id: string, run: (reason: string) => ReturnType<typeof decideReport>, needsReason: boolean) {
    const check = validateReason(note(id));
    if (needsReason && !check.ok) { setMessage(check.error); return; }
    setBusyId(id);
    setMessage(null);
    const outcome = await run(check.ok ? check.value : "");
    setBusyId(null);
    if (!outcome.ok) { setMessage(outcome.message); return; }
    setNotes((current) => { const { [id]: _removed, ...rest } = current; void _removed; return rest; });
    await refresh();
  }

  return (
    <div className="shorts-sheet-backdrop" onClick={onClose}>
      <div className="shorts-sheet shorts-moderation" role="dialog" aria-modal="true" aria-label="Review queue" onClick={(event) => event.stopPropagation()}>
        <div className="shorts-sheet-header">
          <h3>Review queue</h3>
          <button ref={closeRef} type="button" className="shorts-sheet-close" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="shorts-moderation-tabs" role="tablist">
          <button type="button" role="tab" aria-selected={tab === "reports"} className={tab === "reports" ? "active" : ""} onClick={() => setTab("reports")}>Reports{reports ? ` (${reports.length})` : ""}</button>
          <button type="button" role="tab" aria-selected={tab === "appeals"} className={tab === "appeals" ? "active" : ""} onClick={() => setTab("appeals")}>Appeals{appeals ? ` (${appeals.length})` : ""}</button>
        </div>
        {message ? <p role="alert" className="shorts-why-note">{message}</p> : null}
        {unavailable ? <p className="shorts-why-note">Moderation review is not available yet.</p> : null}
        {!unavailable && tab === "reports" ? (
          reports === null ? <p>Loading…</p> : reports.length === 0 ? <p>No open reports.</p> : (
            <ul className="shorts-moderation-list">
              {reports.map((item) => (
                <li key={item.reportId}>
                  <div className="shorts-moderation-head"><strong>{targetLabel(item.targetType)}</strong><span>{item.reportCount > 1 ? `${item.reportCount} reports` : "1 report"}{item.reason ? ` · ${item.reason}` : ""}</span></div>
                  {item.preview ? <blockquote>{item.preview}</blockquote> : <p className="shorts-why-note">No preview (the content may be gone).</p>}
                  {item.details ? <p className="shorts-why-note">Reporter said: {item.details}</p> : null}
                  {item.targetState && item.targetState !== "visible" ? <p className="shorts-why-note">Currently {item.targetState}.</p> : null}
                  <textarea aria-label="Reason" placeholder="Reason (shown to the creator when content is hidden)" maxLength={500} value={note(item.reportId)} onChange={(event) => setNotes((c) => ({ ...c, [item.reportId]: event.target.value }))} />
                  <div className="shorts-history-confirm">
                    {decisionsFor(item.targetType).map((d) => (
                      <button key={d.id} type="button" disabled={busyId === item.reportId} onClick={() => void act(item.reportId, (reason) => decideReport(item.reportId, d.id as ReportDecision, reason), d.needsReason)}>{d.label}</button>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          )
        ) : null}
        {!unavailable && tab === "appeals" ? (
          appeals === null ? <p>Loading…</p> : appeals.length === 0 ? <p>No open appeals.</p> : (
            <ul className="shorts-moderation-list">
              {appeals.map((item) => (
                <li key={item.appealId}>
                  <div className="shorts-moderation-head"><strong>{targetLabel(item.targetType)} appeal</strong><span>Decision: {item.decision}{item.decisionReason ? ` — ${item.decisionReason}` : ""}</span></div>
                  {item.preview ? <blockquote>{item.preview}</blockquote> : null}
                  <p>Creator says: {item.message}</p>
                  <textarea aria-label="Note" placeholder="Note to the creator" maxLength={500} value={note(item.appealId)} onChange={(event) => setNotes((c) => ({ ...c, [item.appealId]: event.target.value }))} />
                  <div className="shorts-history-confirm">
                    <button type="button" disabled={busyId === item.appealId} onClick={() => void act(item.appealId, (reason) => decideAppeal(item.appealId, true, reason), true)}>Overturn (restore)</button>
                    <button type="button" disabled={busyId === item.appealId} onClick={() => void act(item.appealId, (reason) => decideAppeal(item.appealId, false, reason), true)}>Uphold decision</button>
                  </div>
                </li>
              ))}
            </ul>
          )
        ) : null}
      </div>
    </div>
  );
}

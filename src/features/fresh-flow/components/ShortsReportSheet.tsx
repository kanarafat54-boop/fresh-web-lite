import { useEffect, useRef, useState } from "react";
import { COPYRIGHT_NOTE, MAX_DETAILS, REPORT_NOTE, REPORT_TARGETS, categoriesFor, type ReportCategoryId, type ReportTargetType } from "../core/shortsReporting";
import { submitReport, type ReportResult } from "../core/shortsReportingService";
import "./shortsContextPanel.css";

type Props = {
  targetType: ReportTargetType;
  targetId: string;
  /** Signed-in viewer id, or null for a guest. */
  userId: string | null;
  soundName?: string;
  onClose: () => void;
  /** Called after a report was saved, so the caller can hide the content for the viewer. */
  onSent?: (result: ReportResult) => void;
};

/** One reporting sheet for Shorts, comments, profiles and sounds: a category and an optional explanation. */
export default function ShortsReportSheet({ targetType, targetId, userId, soundName, onClose, onSent }: Props) {
  const [category, setCategory] = useState<ReportCategoryId | null>(null);
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ReportResult | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const noun = REPORT_TARGETS[targetType].noun;

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function send() {
    if (!userId || busy) return;
    setBusy(true);
    setError(null);
    try {
      const outcome = await submitReport(userId, { targetType, targetId, category, details, soundName });
      setResult(outcome);
      if (outcome.status === "sent") onSent?.(outcome);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Fresh could not save your report. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="shorts-sheet-backdrop" onClick={onClose}>
      <div className="shorts-sheet" role="dialog" aria-modal="true" aria-label={`Report this ${noun}`} onClick={(event) => event.stopPropagation()}>
        <div className="shorts-sheet-header">
          <h3>Report this {noun}</h3>
          <button ref={closeRef} type="button" className="shorts-sheet-close" onClick={onClose} aria-label="Close">✕</button>
        </div>
        {!userId ? (
          <p>Sign in to report. Reports are tied to your account so they can be reviewed fairly.</p>
        ) : result ? (
          <div role="status">
            <p>{result.status === "duplicate" ? `You already reported this ${noun}. It is still saved for review.` : `Thanks. Your report on this ${noun} is saved for review.`}</p>
            {result.status === "sent" && !result.explanationSaved ? <p className="shorts-why-note">Your explanation could not be saved yet, so only the category was recorded.</p> : null}
            <button type="button" className="shorts-why-controls" onClick={onClose}>Done</button>
          </div>
        ) : (
          <form onSubmit={(event) => { event.preventDefault(); void send(); }}>
            <fieldset className="shorts-report-fields">
              <legend>What is wrong?</legend>
              {categoriesFor(targetType).map((item) => (
                <label key={item.id} className={category === item.id ? "selected" : ""}>
                  <input type="radio" name="report-category" value={item.id} checked={category === item.id} onChange={() => setCategory(item.id)} />
                  <span><strong>{item.label}</strong><small>{item.hint}</small></span>
                </label>
              ))}
            </fieldset>
            {category === "copyright" ? <p className="shorts-why-note">{COPYRIGHT_NOTE}</p> : null}
            <label className="shorts-report-details">
              <span>Anything else we should know? (optional)</span>
              <textarea value={details} maxLength={MAX_DETAILS} rows={3} onChange={(event) => setDetails(event.target.value)} />
              <small>{details.length}/{MAX_DETAILS}</small>
            </label>
            {error ? <p role="alert">{error}</p> : null}
            <p className="shorts-why-note">{REPORT_NOTE}</p>
            <button type="submit" className="shorts-why-controls" disabled={!category || busy}>{busy ? "Sending…" : "Send report"}</button>
          </form>
        )}
      </div>
    </div>
  );
}

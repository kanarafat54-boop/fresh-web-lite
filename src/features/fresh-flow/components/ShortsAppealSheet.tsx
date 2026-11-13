import { useEffect, useRef, useState } from "react";
import { MAX_APPEAL, MIN_APPEAL, validateAppeal, type ReviewTarget } from "../core/moderationReview";
import { submitAppeal } from "../core/moderationReviewService";
import "./shortsContextPanel.css";
import "./shortsModeration.css";

type Props = { targetType: ReviewTarget; targetId: string; what: string; onClose: () => void; onSent?: () => void };

/** The creator's appeal form for content a reviewer hid or removed. One appeal per decision. */
export default function ShortsAppealSheet({ targetType, targetId, what, onClose, onSent }: Props) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const closeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function send() {
    const check = validateAppeal(text);
    if (!check.ok) { setError(check.error); return; }
    setBusy(true);
    setError(null);
    const outcome = await submitAppeal(targetType, targetId, check.value);
    setBusy(false);
    if (!outcome.ok) { setError(outcome.message); return; }
    setSent(true);
    onSent?.();
  }

  return (
    <div className="shorts-sheet-backdrop" onClick={onClose}>
      <div className="shorts-sheet" role="dialog" aria-modal="true" aria-label="Appeal a decision" onClick={(event) => event.stopPropagation()}>
        <div className="shorts-sheet-header">
          <h3>Appeal this decision</h3>
          <button ref={closeRef} type="button" className="shorts-sheet-close" onClick={onClose} aria-label="Close">✕</button>
        </div>
        {sent ? <p role="status">Your appeal was sent. A reviewer will look at it. If they restore your {what}, it will show again.</p> : (
          <>
            <p className="shorts-why-note">Tell the reviewer why your {what} should be restored. You can appeal each decision once.</p>
            <textarea aria-label="Why should it be restored?" className="shorts-moderation-text" value={text} maxLength={MAX_APPEAL} onChange={(event) => setText(event.target.value)} placeholder={`At least ${MIN_APPEAL} characters`} />
            {error ? <p role="alert" className="shorts-why-note">{error}</p> : null}
            <div className="shorts-history-confirm">
              <button type="button" disabled={busy} onClick={() => void send()}>{busy ? "Sending…" : "Send appeal"}</button>
              <button type="button" onClick={onClose}>Cancel</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

import { useEffect, useRef } from "react";
import { explainShort, mutedOverlap, type WhyInput } from "../core/shortsWhy";
import "./shortsContextPanel.css";

type Props = { input: WhyInput; onClose: () => void; onOpenControls: () => void };

/** "Why am I seeing this?" Lists only reasons backed by real signals and links to the controls that change them. */
export default function ShortsWhySheet({ input, onClose, onOpenControls }: Props) {
  const closeRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const reasons = explainShort(input);
  const overlap = mutedOverlap(input);
  return (
    <div className="shorts-sheet-backdrop" onClick={onClose}>
      <div className="shorts-sheet" role="dialog" aria-modal="true" aria-label="Why am I seeing this?" onClick={(event) => event.stopPropagation()}>
        <div className="shorts-sheet-header">
          <h3>Why am I seeing this?</h3>
          <button ref={closeRef} type="button" className="shorts-sheet-close" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <ul className="shorts-why-list">
          {reasons.map((reason) => <li key={reason.id}>{reason.text}</li>)}
        </ul>
        {overlap.length > 0 ? <p className="shorts-why-note">You asked to see less of {overlap.map((t) => `#${t}`).join(", ")}. Other signals still brought this Short up.</p> : null}
        {input.signedIn ? <button type="button" className="shorts-why-controls" onClick={onOpenControls}>Change what Fresh shows me</button> : null}
      </div>
    </div>
  );
}

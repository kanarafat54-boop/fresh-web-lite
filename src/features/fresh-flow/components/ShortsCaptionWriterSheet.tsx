import { useEffect, useMemo, useRef, useState } from "react";
import { cuesFromTranscript, shiftCues, type CaptionCue } from "../core/shortsCaptions";
import "./shortsContextPanel.css";
import "./shortsModeration.css";

type Props = {
  /** Length of the video in seconds, read from the player. */
  durationSeconds: number;
  /** Saves the cues; resolves when stored. Throws with a plain message on failure. */
  onSave: (cues: CaptionCue[]) => Promise<void>;
  onClose: () => void;
};

const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${(seconds % 60).toFixed(1).padStart(4, "0")}`;

/** Type what is said; Fresh times the lines across the video. An estimate the creator reviews, not speech recognition. */
export default function ShortsCaptionWriterSheet({ durationSeconds, onSave, onClose }: Props) {
  const [text, setText] = useState("");
  const [offset, setOffset] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const preview = useMemo(() => {
    if (!text.trim()) return { cues: [] as CaptionCue[], error: null as string | null };
    const built = cuesFromTranscript(text, durationSeconds);
    return built.error ? built : { cues: shiftCues(built.cues, offset, durationSeconds), error: null };
  }, [text, offset, durationSeconds]);

  async function save() {
    if (busy) return;
    if (preview.error) { setError(preview.error); return; }
    if (preview.cues.length === 0) { setError("Write what is said in the video first."); return; }
    setBusy(true);
    setError(null);
    try { await onSave(preview.cues); onClose(); }
    catch (cause) { setError(cause instanceof Error && cause.message ? `Captions could not be saved: ${cause.message}` : "Captions could not be saved."); }
    finally { setBusy(false); }
  }

  return (
    <div className="shorts-sheet-backdrop" onClick={onClose}>
      <div className="shorts-sheet shorts-moderation" role="dialog" aria-modal="true" aria-label="Write captions" onClick={(event) => event.stopPropagation()}>
        <div className="shorts-sheet-header">
          <h3>Write captions</h3>
          <button ref={closeRef} type="button" className="shorts-sheet-close" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <p className="shorts-why-note">Type what is said. Fresh spreads the lines across the {Math.round(durationSeconds)}-second video by length. This is an estimate, not speech recognition: check it against the video and shift the timing, or upload a .vtt file for exact timing.</p>
        <textarea className="shorts-moderation-text" aria-label="What is said in the video" value={text} onChange={(event) => setText(event.target.value)} placeholder="One sentence or line at a time" />
        <div className="shorts-history-confirm">
          <button type="button" onClick={() => setOffset((value) => Math.round((value - 0.5) * 10) / 10)}>Earlier 0.5s</button>
          <button type="button" onClick={() => setOffset((value) => Math.round((value + 0.5) * 10) / 10)}>Later 0.5s</button>
          <span className="shorts-why-note">Shift: {offset > 0 ? "+" : ""}{offset}s</span>
        </div>
        {preview.error ? <p role="alert" className="shorts-why-note">{preview.error}</p> : null}
        {preview.cues.length > 0 ? (
          <ol className="shorts-why-list" aria-label="Preview">
            {preview.cues.slice(0, 6).map((cue, index) => <li key={index}>{clock(cue.start)} to {clock(cue.end)}: {cue.text}</li>)}
            {preview.cues.length > 6 ? <li>…and {preview.cues.length - 6} more lines</li> : null}
          </ol>
        ) : null}
        {error ? <p role="alert" className="shorts-why-note">{error}</p> : null}
        <div className="shorts-history-confirm">
          <button type="button" disabled={busy || preview.cues.length === 0} onClick={() => void save()}>{busy ? "Saving…" : "Save captions"}</button>
          <button type="button" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

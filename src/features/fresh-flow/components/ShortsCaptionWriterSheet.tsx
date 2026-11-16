import { useEffect, useMemo, useRef, useState } from "react";
import { cuesFromTranscript, shiftCues, type CaptionCue } from "../core/shortsCaptions";
import { cuesFromSpeech, languageName, modelForLanguage, SPEECH_LANGUAGES } from "../core/speechCues";
// Shorts reuses Creator Studio's on-device speech engine (one engine, one live CI check), not a second copy.
import { decodeForSpeech, transcribeSamples, MAX_SPEECH_SECONDS, SPEECH_RATE } from "../../fresh-studio/video-studio/speechEngine";
import { wordsToCues } from "../../fresh-studio/video-studio/speech";
import "./shortsContextPanel.css";
import "./shortsModeration.css";

type Props = {
  /** Length of the video in seconds, read from the player. */
  durationSeconds: number;
  /** The video file, so its audio can be read on this device for automatic captions. */
  mediaUrl?: string;
  /** Saves the cues; resolves when stored. Throws with a plain message on failure. */
  onSave: (cues: CaptionCue[], language?: string) => Promise<void>;
  onClose: () => void;
};

const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${(seconds % 60).toFixed(1).padStart(4, "0")}`;

/** Type what is said; Fresh times the lines across the video. An estimate the creator reviews, not speech recognition. */
export default function ShortsCaptionWriterSheet({ durationSeconds, mediaUrl, onSave, onClose }: Props) {
  const [text, setText] = useState("");
  const [offset, setOffset] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const deviceLanguage = (typeof navigator !== "undefined" ? navigator.language : "en").toLowerCase().split("-")[0];
  const [language, setLanguage] = useState(SPEECH_LANGUAGES.some((l) => l.code === deviceLanguage) ? deviceLanguage : "");
  const [accurate, setAccurate] = useState(false);
  const [autoStatus, setAutoStatus] = useState<string | null>(null);
  const [autoCues, setAutoCues] = useState<CaptionCue[] | null>(null);
  const [working, setWorking] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const canAuto = Boolean(mediaUrl) && typeof Worker !== "undefined";

  async function generate() {
    if (working || !mediaUrl) return;
    const controller = new AbortController();
    abortRef.current = controller;
    setWorking(true); setError(null); setAutoCues(null); setAutoStatus("Reading the video's audio on your device…");
    try {
      const response = await fetch(mediaUrl);
      if (!response.ok) throw new Error("Fresh could not read the video's audio.");
      const samples = await decodeForSpeech(await response.blob());
      if (!samples) throw new Error(`Fresh could not read audio from this video, or it is longer than ${MAX_SPEECH_SECONDS / 60} minutes.`);
      const seconds = samples.length / SPEECH_RATE;
      const words = await transcribeSamples(samples, {
        model: modelForLanguage(language, accurate && language === "en"), language: languageName(language), signal: controller.signal,
        onProgress: (p) => setAutoStatus(p.stage === "download" ? `Getting the speech model (first time only) ${Math.round(p.fraction * 100)}%` : "Listening and writing captions… this can take a minute."),
      });
      const cues = cuesFromSpeech(wordsToCues(words).map((c) => ({ text: c.text, start: c.start, end: c.end })), seconds);
      if (cues.length === 0) throw new Error("Fresh did not hear clear speech to caption. You can type the captions instead.");
      setAutoCues(cues); setAutoStatus(null);
    } catch (cause) {
      setAutoStatus(null);
      setError(cause instanceof Error && cause.message ? cause.message : "Captions could not be made on this device.");
    } finally { setWorking(false); abortRef.current = null; }
  }

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
    if (autoCues) {
      const cues = autoCues.map((c) => ({ ...c, text: c.text.trim() })).filter((c) => c.text);
      if (cues.length === 0) { setError("Every caption line is empty."); return; }
      setBusy(true); setError(null);
      try { await onSave(cues, language || undefined); onClose(); }
      catch (cause) { setError(cause instanceof Error && cause.message ? `Captions could not be saved: ${cause.message}` : "Captions could not be saved."); }
      finally { setBusy(false); }
      return;
    }
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
          <button ref={closeRef} type="button" className="shorts-sheet-close" onClick={() => { abortRef.current?.abort(); onClose(); }} aria-label="Close">✕</button>
        </div>
        {canAuto ? (
          <section className="shorts-context-section" aria-label="Automatic captions">
            <h4>Automatic captions</h4>
            <p className="shorts-why-note">Fresh listens to this video's audio on your device and writes captions. The audio is not uploaded. The first time, your browser downloads an open-source speech model from Hugging Face and keeps it for next time. It can mishear, so you review every line before saving.</p>
            <label>Language spoken
              <select value={language} onChange={(e) => setLanguage(e.target.value)} disabled={working}>
                <option value="">Detect automatically</option>
                {SPEECH_LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.name.charAt(0).toUpperCase() + l.name.slice(1)}</option>)}
              </select>
            </label>
            {language === "en" ? <label className="shorts-check"><input type="checkbox" checked={accurate} disabled={working} onChange={(e) => setAccurate(e.target.checked)} /> More accurate (bigger download, slower)</label> : null}
            <div className="shorts-history-confirm">
              <button type="button" disabled={working} onClick={() => void generate()}>{working ? "Working…" : autoCues ? "Generate again" : "Make captions from speech"}</button>
              {working ? <button type="button" onClick={() => abortRef.current?.abort()}>Stop</button> : null}
            </div>
            {autoStatus ? <p role="status" className="shorts-why-note">{autoStatus}</p> : null}
            {autoCues ? (
              <>
                <p className="shorts-why-note">Check and fix each line, then save. Timing comes from the speech.</p>
                <ol className="shorts-why-list" aria-label="Automatic captions to review">
                  {autoCues.map((cue, index) => (
                    <li key={index}>{clock(cue.start)}: <input aria-label={`Caption ${index + 1}`} value={cue.text.replace(/\n/g, " ")} maxLength={300} onChange={(e) => setAutoCues((all) => all ? all.map((c, i) => i === index ? { ...c, text: e.target.value } : c) : all)} /></li>
                  ))}
                </ol>
              </>
            ) : null}
          </section>
        ) : mediaUrl ? <p className="shorts-why-note">Automatic captions need a browser that can run the speech engine. You can still type the captions below or upload a .vtt file.</p> : null}
        <p className="shorts-why-note">Or type what is said. Fresh spreads the lines across the {Math.round(durationSeconds)}-second video by length. This is an estimate, not speech recognition: check it against the video and shift the timing, or upload a .vtt file for exact timing.</p>
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
          <button type="button" disabled={busy || (!autoCues && preview.cues.length === 0)} onClick={() => void save()}>{busy ? "Saving…" : "Save captions"}</button>
          <button type="button" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

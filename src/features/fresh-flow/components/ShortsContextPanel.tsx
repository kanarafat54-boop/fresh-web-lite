import { useEffect, useRef, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { buildContextGoal, buildProvenance, interpretAskResponse, type AskPayload, type ContextResult, type ContextShort } from "../core/shortsContext";
import "./shortsContextPanel.css";

type Props = { short: ContextShort; onClose: () => void; onOpenInFreshAI: (prompt: string) => void };

/**
 * Context and sources for one Short. The details come from the platform; the evidence check only runs
 * when the viewer presses the button, because it sends the Short's caption to Fresh AI.
 */
export default function ShortsContextPanel({ short, onClose, onOpenInFreshAI }: Props) {
  const [phase, setPhase] = useState<"idle" | "checking" | "done">("idle");
  const [result, setResult] = useState<ContextResult | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => { window.removeEventListener("keydown", onKey); abortRef.current?.abort(); };
  }, [onClose]);

  async function runCheck() {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setPhase("checking");
    setResult(null);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      const response = await fetch("/api/ai/ask", {
        method: "POST",
        signal: controller.signal,
        headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ goal: buildContextGoal(short), route: "/flow/shorts", conversation: [] }),
      });
      const payload = (await response.json().catch(() => null)) as AskPayload | null;
      if (controller.signal.aborted) return;
      setResult(interpretAskResponse(response.ok, payload));
      setPhase("done");
    } catch {
      if (controller.signal.aborted) return;
      setResult(interpretAskResponse(false, null));
      setPhase("done");
    }
  }

  const provenance = buildProvenance(short);

  return (
    <div className="shorts-context-backdrop" onClick={onClose}>
      <section className="shorts-context-panel" role="dialog" aria-modal="true" aria-labelledby="shorts-context-title" onClick={(event) => event.stopPropagation()}>
        <header>
          <h2 id="shorts-context-title">Context and sources</h2>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Close">×</button>
        </header>

        <h3>About this Short</h3>
        <dl className="shorts-context-facts">
          {provenance.map((row) => (<div key={row.label}><dt>{row.label}</dt><dd>{row.value}</dd></div>))}
        </dl>

        <h3>Evidence check</h3>
        <p className="shorts-context-note">Fresh AI reads the caption and looks for trustworthy sources. Pressing the button sends the caption to Fresh AI. It is an automated check, not a human fact-check.</p>

        {phase !== "checking" && (
          <button type="button" className="shorts-context-primary" onClick={() => void runCheck()}>
            {phase === "done" ? "Check again" : "Check this Short's claims"}
          </button>
        )}
        {phase === "checking" && <p className="shorts-context-status" role="status">Checking sources…</p>}

        {result && (
          <div className={`shorts-context-result ${result.state}`} role="status">
            <strong>{result.label}</strong>
            <p>{result.explanation}</p>
            {result.answer && <p className="shorts-context-answer">{result.answer}</p>}
            {result.sources.length > 0 && (
              <ul className="shorts-context-sources" aria-label="Sources">
                {result.sources.map((source, index) => (
                  <li key={`${source.host}-${index}`}>
                    {source.url ? <a href={source.url} target="_blank" rel="noopener noreferrer">{source.host}</a> : <span>{source.host}</span>}
                    {source.snippet && <small>{source.snippet}</small>}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <button type="button" className="shorts-context-secondary" onClick={() => onOpenInFreshAI(buildContextGoal(short))}>Continue in Fresh AI</button>
      </section>
    </div>
  );
}

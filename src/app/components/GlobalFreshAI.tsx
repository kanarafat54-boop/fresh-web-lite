import { FormEvent, useState } from "react";
import { useLayout } from "../contexts/useLayout";
import { supabase } from "../../lib/supabase";
import "./GlobalFreshAI.css";

type AskResponse = { answer?: string; confidence?: string; source?: string; error?: string };

export default function GlobalFreshAI() {
  const { activeRoute } = useLayout();
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function ask(event?: FormEvent) {
    event?.preventDefault();
    const goal = prompt.trim();
    if (!goal || loading) return;
    setLoading(true);
    setError(null);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      const response = await fetch("/api/ai/ask", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ goal, route: activeRoute ?? "/" }),
      });
      const payload = (await response.json()) as AskResponse;
      if (!response.ok) throw new Error(payload.error ?? `Fresh AI request failed (${response.status})`);
      setAnswer(payload.answer ?? "Fresh AI completed the request without a text answer.");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Fresh AI could not complete that request.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button className="global-fresh-ai-trigger" type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-controls="global-fresh-ai-panel">
        <span className="global-fresh-ai-mark">F</span>
        <span>Fresh AI</span>
      </button>
      {open && (
        <aside className="global-fresh-ai-panel" id="global-fresh-ai-panel" aria-label="Fresh AI assistant">
          <div className="global-fresh-ai-header">
            <div><strong>Fresh AI</strong><small>Here wherever you work</small></div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close Fresh AI">×</button>
          </div>
          <p className="global-fresh-ai-context">You are in <strong>{activeRoute || "Home"}</strong>. Ask Fresh AI to explain, plan, find, summarize, or help you take the next step.</p>
          <form onSubmit={ask}>
            <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="What do you want Fresh AI to help with?" rows={3} aria-label="Ask Fresh AI" />
            <button type="submit" disabled={loading || !prompt.trim()}>{loading ? "Thinking..." : "Ask Fresh AI"}</button>
          </form>
          {error && <p className="global-fresh-ai-error">{error}</p>}
          {answer && <div className="global-fresh-ai-answer"><span>Fresh AI</span><p>{answer}</p></div>}
          <button className="global-fresh-ai-full" type="button" onClick={() => setOpen(false)}>Open full Fresh AI →</button>
        </aside>
      )}
    </>
  );
}

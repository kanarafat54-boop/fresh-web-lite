import { useState, type FormEvent } from "react";
import { useLayout } from "../contexts/useLayout";
import { supabase } from "../../lib/supabase";
import "./GlobalFreshAI.css";

type Evidence = { title: string; url: string; snippet?: string; domain?: string; kind?: string; publishedAt?: string };
type AskResponse = { answer?: string; confidence?: string; source?: string; error?: string; evidence?: Evidence[]; verification?: { uniqueSources: number; uniqueDomains: number; sourceDiversity: string; confidence: string } | null };

export default function GlobalFreshAI() {
  const { activeRoute, setActiveRoute } = useLayout();
  const [open, setOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [verification, setVerification] = useState<AskResponse["verification"]>(null);
  const [source, setSource] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function ask(event?: FormEvent) {
    event?.preventDefault();
    const goal = prompt.trim();
    if (!goal || loading) return;
    setLoading(true); setError(null); setEvidence([]); setVerification(null); setSource(null);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      const response = await fetch("/api/ai/ask", { method: "POST", headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ goal, route: activeRoute ?? "/" }) });
      const payload = await response.json() as AskResponse;
      if (!response.ok) throw new Error(payload.error ?? `Fresh AI request failed (${response.status})`);
      setAnswer(payload.answer ?? "Fresh AI completed the request without a text answer."); setEvidence(payload.evidence ?? []); setVerification(payload.verification ?? null); setSource(payload.source ?? null);
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Fresh AI could not complete that request."); }
    finally { setLoading(false); }
  }

  function openFullAI() { setOpen(false); setActiveRoute("ai"); }

  return <>
    <button className="global-fresh-ai-trigger" type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-controls="global-fresh-ai-panel"><span className="global-fresh-ai-mark">F</span><span>Fresh AI</span></button>
    {open && <aside className="global-fresh-ai-panel" id="global-fresh-ai-panel" aria-label="Fresh AI assistant">
      <div className="global-fresh-ai-header"><div><strong>Fresh AI</strong><small>Intelligence + evidence, wherever you work</small></div><button type="button" onClick={() => setOpen(false)} aria-label="Close Fresh AI">×</button></div>
      <p className="global-fresh-ai-context">You are in <strong>{activeRoute || "Home"}</strong>. Ask Fresh AI to explain, plan, find, summarize, or help you take the next step.</p>
      <form onSubmit={ask}><textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="Ask anything about people, work, learning, creators, markets, news…" rows={3} aria-label="Ask Fresh AI" /><button type="submit" disabled={loading || !prompt.trim()}>{loading ? "Thinking + checking…" : "Ask Fresh AI"}</button></form>
      {error && <p className="global-fresh-ai-error">{error}</p>}
      {answer && <div className="global-fresh-ai-answer"><span>Fresh AI</span><p>{answer}</p>{source && <small>{source}</small>}{verification && <div style={{ marginTop: 10, fontSize: 12, opacity: .75 }}><strong>Proof:</strong> {verification.confidence} confidence · {verification.uniqueSources} sources · {verification.uniqueDomains} domains · {verification.sourceDiversity} diversity</div>}{evidence.length > 0 && <div style={{ marginTop: 10, display: "grid", gap: 6 }}><strong style={{ fontSize: 12 }}>Evidence</strong>{evidence.slice(0, 5).map((item) => <a key={item.url} href={item.url} target="_blank" rel="noreferrer" style={{ fontSize: 12, lineHeight: 1.35, color: "inherit" }}>{item.title}<small style={{ display: "block", opacity: .6 }}>{item.domain ?? new URL(item.url).hostname}</small></a>)}</div>}</div>}
      <button className="global-fresh-ai-full" type="button" onClick={openFullAI}>Open full Fresh AI →</button>
    </aside>}
  </>;
}

import { useState, type FormEvent } from "react";
import { useLayout } from "../contexts/useLayout";
import { supabase } from "../../lib/supabase";
import "./GlobalFreshAI.css";

type Evidence = { title: string; snippet?: string; kind?: string; publishedAt?: string };
type AskResponse = { answer?: string; confidence?: string; source?: string; error?: string; evidence?: Evidence[]; verification?: { uniqueSources: number; uniqueDomains: number; sourceDiversity: string; confidence: string; contradictionsDetected?: boolean } | null; proof?: { mode: string; evidenceCount: number; provenance: string } };

const kindLabel: Record<string, string> = { web: "Web evidence", news: "News evidence", video: "Video evidence", image: "Image evidence", music: "Music evidence" };

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
      <div className="global-fresh-ai-header"><div><strong>Fresh AI</strong><small>Research, reasoning and proof inside Fresh</small></div><button type="button" onClick={() => setOpen(false)} aria-label="Close Fresh AI">×</button></div>
      <p className="global-fresh-ai-context">You are in <strong>{activeRoute || "Home"}</strong>. Ask anything. Fresh can research the public web, compare evidence and organize the result for this workspace.</p>
      <form onSubmit={ask}><textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="Ask about people, work, learning, creators, markets, music, videos, images, news…" rows={3} aria-label="Ask Fresh AI" /><button type="submit" disabled={loading || !prompt.trim()}>{loading ? "Researching + verifying…" : "Ask Fresh AI"}</button></form>
      {error && <p className="global-fresh-ai-error">{error}</p>}
      {answer && <div className="global-fresh-ai-answer">
        <span>Fresh AI</span>
        <p>{answer}</p>
        {source && <small>{source}</small>}
        {verification && <div style={{ marginTop: 10, padding: 10, borderRadius: 12, background: "rgba(0,0,0,.04)", fontSize: 12 }}>
          <strong>Fresh Proof</strong>
          <div style={{ marginTop: 4 }}>{verification.confidence} confidence · {verification.uniqueSources} independent results · {verification.uniqueDomains} distinct domains</div>
          <div style={{ marginTop: 3 }}>{verification.sourceDiversity} evidence diversity{verification.contradictionsDetected ? " · conflicting evidence detected" : " · cross-checked"}</div>
        </div>}
        {evidence.length > 0 && <div style={{ marginTop: 10, display: "grid", gap: 7 }}>
          <strong style={{ fontSize: 12 }}>Evidence used by Fresh</strong>
          {evidence.slice(0, 5).map((item, index) => <div key={`${index}-${item.title}`} style={{ padding: 9, border: "1px solid rgba(0,0,0,.09)", borderRadius: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><strong style={{ fontSize: 12 }}>{item.title}</strong><span style={{ fontSize: 10, opacity: .6 }}>{kindLabel[item.kind ?? "web"] ?? "Evidence"}</span></div>
            {item.snippet && <small style={{ display: "block", marginTop: 5, lineHeight: 1.4, opacity: .75 }}>{item.snippet}</small>}
          </div>)}
        </div>}
        <small style={{ display: "block", marginTop: 10, opacity: .55 }}>Fresh keeps provenance internally. This view shows the evidence and verification state without turning the answer into a directory of external links.</small>
      </div>}
      <button className="global-fresh-ai-full" type="button" onClick={openFullAI}>Open full Fresh AI →</button>
    </aside>}
  </>;
}

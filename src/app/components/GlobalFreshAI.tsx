import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useLayout } from "../contexts/useLayout";
import { useTheme } from "../providers/ThemeProvider";
import { supabase } from "../../lib/supabase";
import "./GlobalFreshAI.css";

type Evidence = { title: string; snippet?: string; kind?: string; publishedAt?: string };
type AskResponse = { answer?: string; confidence?: string; source?: string; error?: string; evidence?: Evidence[]; verification?: { uniqueSources?: number; uniqueDomains?: number; sourceDiversity?: string; confidence?: string; contradictionsDetected?: boolean } | null; proof?: { mode?: string; evidenceCount?: number; provenance?: string } };
const kindLabel: Record<string, string> = { web: "Web evidence", news: "News evidence", video: "Video evidence", image: "Image evidence", music: "Music evidence" };

export default function GlobalFreshAI() {
  const { activeRoute } = useLayout();
  const { theme, toggle } = useTheme();
  const [open, setOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [verification, setVerification] = useState<AskResponse["verification"]>(null);
  const [source, setSource] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const suggestions = useMemo(() => {
    const route = (activeRoute || "home").toLowerCase();
    if (route.includes("short")) return ["Find the best ideas in this Shorts feed", "Explain this video", "Turn this into a post", "Research this creator"];
    if (route.includes("learn")) return ["Teach me this step by step", "Make a study plan", "Quiz me on this", "Find stronger sources"];
    if (route.includes("wallet") || route.includes("crypto")) return ["Explain this market move", "Compare these assets", "Check the risks", "Summarize the latest news"];
    if (route.includes("profile")) return ["Improve my profile", "Find relevant connections", "Organize my work", "Draft my next post"];
    if (route.includes("work") || route.includes("studio")) return ["Plan this project", "Review my workflow", "Find blockers", "Build the next step"];
    return ["Research something for me", "Compare the evidence", "Explain this clearly", "Help me build it"];
  }, [activeRoute]);

  useEffect(() => {
    const onOpen = () => { setOpen(true); setFullscreen(true); };
    const onSuggestion = (event: Event) => {
      const value = (event as CustomEvent<{ prompt?: string }>).detail?.prompt;
      if (value) setPrompt(value);
      setOpen(true); setFullscreen(true);
    };
    window.addEventListener("fresh-ai-open", onOpen);
    window.addEventListener("fresh-ai-suggestion", onSuggestion);
    return () => { window.removeEventListener("fresh-ai-open", onOpen); window.removeEventListener("fresh-ai-suggestion", onSuggestion); };
  }, []);

  async function ask(event?: FormEvent) {
    event?.preventDefault();
    const goal = prompt.trim();
    if (!goal || loading) return;
    setLoading(true); setError(null); setAnswer(null); setEvidence([]); setVerification(null); setSource(null); setOpen(true);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      const response = await fetch("/api/ai/ask", { method: "POST", headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ goal, route: activeRoute ?? "/" }) });
      const payload = await response.json() as AskResponse;
      if (!response.ok) throw new Error(payload.error ?? `Fresh AI request failed (${response.status})`);
      setAnswer(payload.answer ?? "Fresh AI completed the request without a text answer.");
      setEvidence(Array.isArray(payload.evidence) ? payload.evidence : []);
      setVerification(payload.verification ?? null);
      setSource(payload.source ?? null);
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : "Fresh AI could not complete that request."); }
    finally { setLoading(false); }
  }

  function useSuggestion(value: string) { setPrompt(value); setFullscreen(true); setOpen(true); }
  function openFullAI() { setOpen(false); setFullscreen(true); }
  function closeAI() { setFullscreen(false); setOpen(false); }

  const content = <div className={fullscreen ? "global-fresh-ai-shell is-fullscreen" : "global-fresh-ai-shell"}>
    <div className="global-fresh-ai-header">
      <div><strong>Fresh AI</strong><small>Research, reasoning and proof inside Fresh</small></div>
      <div className="global-fresh-ai-header-actions"><button type="button" onClick={toggle} aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}>{theme === "dark" ? "☀" : "☾"}</button><button type="button" onClick={() => setFullscreen((value) => !value)} aria-label={fullscreen ? "Exit full screen" : "Open full screen"}>{fullscreen ? "↙" : "↗"}</button><button type="button" onClick={closeAI} aria-label="Close Fresh AI">×</button></div>
    </div>
    <p className="global-fresh-ai-context">You are in <strong>{activeRoute || "Home"}</strong>. Fresh can research, reason, compare evidence and organize the result for this workspace.</p>
    <div className="global-fresh-ai-suggestions" aria-label="Fresh AI suggestions">{suggestions.map((item) => <button key={item} type="button" onClick={() => useSuggestion(item)}>{item}</button>)}</div>
    <form onSubmit={ask}><textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="Ask anything… Fresh will choose the right reasoning path." rows={fullscreen ? 5 : 3} aria-label="Ask Fresh AI" /><button type="submit" disabled={loading || !prompt.trim()}>{loading ? "Researching + verifying…" : "Ask Fresh AI"}</button></form>
    {error && <p className="global-fresh-ai-error">Fresh AI could not complete that request. {error}</p>}
    {answer && <div className="global-fresh-ai-answer"><span>Fresh AI</span><p>{answer}</p>{source && <small>{source}</small>}{verification && <div className="global-fresh-ai-proof"><strong>Fresh Proof</strong><div>{verification.confidence ?? "Uncalibrated"} confidence · {verification.uniqueSources ?? 0} independent results · {verification.uniqueDomains ?? 0} distinct domains</div><div>{verification.sourceDiversity ?? "Evidence diversity not reported"}{verification.contradictionsDetected ? " · conflicting evidence detected" : " · cross-checked"}</div></div>}{evidence.length > 0 && <div className="global-fresh-ai-evidence"><strong>Evidence used by Fresh</strong>{evidence.slice(0, 8).map((item, index) => <div className="global-fresh-ai-evidence-item" key={`${index}-${item.title}`}><div><strong>{item.title}</strong><span>{kindLabel[item.kind ?? "web"] ?? "Evidence"}</span></div>{item.snippet && <small>{item.snippet}</small>}</div>)}</div>}<small className="global-fresh-ai-note">Provenance is retained internally; the workspace shows the evidence and verification state without exposing a directory of external links.</small></div>}
    {!fullscreen && <button className="global-fresh-ai-full" type="button" onClick={openFullAI}>Open full Fresh AI →</button>}
  </div>;

  return <><button className="global-fresh-ai-trigger" type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-controls="global-fresh-ai-panel"><span className="global-fresh-ai-mark">F</span><span>Fresh AI</span></button>{open && !fullscreen && <aside className="global-fresh-ai-panel" id="global-fresh-ai-panel" aria-label="Fresh AI assistant">{content}</aside>}{fullscreen && <div className="global-fresh-ai-overlay" role="dialog" aria-modal="true" aria-label="Fresh AI full screen workspace">{content}</div>}</>;
}

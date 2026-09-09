import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import "./FreshAIHome.css";
import { createFreshAIWorkspaceContext } from "../../../core/fresh-ai/FreshAIWorkspaceContext";

type Turn = { id: string; role: "user" | "assistant"; content: string; pending?: boolean };
type Evidence = { title: string; snippet?: string; url?: string };
type ApiResponse = { answer?: string; error?: string; requestId?: string; evidence?: Evidence[]; confidence?: string; source?: string; model?: string; status?: string };
type Mode = "chat" | "research" | "create" | "build" | "learn" | "act";
const modes: Array<[Mode, string, string]> = [["chat", "Chat", "Ask anything"], ["research", "Research", "Search and verify"], ["create", "Create", "Write and generate"], ["build", "Build", "Code and ship"], ["learn", "Learn", "Learn with context"], ["act", "Act", "Use approved tools"]];
const surfaces = [["Chat & Connect", "Converse, translate, remember and connect"], ["Workspace", "Projects, files, tasks and decisions"], ["Design & Creator", "Design, image, video and audio"], ["Code & Software", "Build, debug, test and deploy"], ["Research", "Investigate, compare and verify"], ["Academy", "Teach, practice and remember"], ["Wallet & Trust", "Analyze, protect and verify"], ["Automation", "Turn goals into governed workflows"]];

function freshPrompt(prompt: string, route: string, conversation: Turn[], signal?: AbortSignal) {
  return fetch("/api/ai/ask", { method: "POST", signal, headers: { "content-type": "application/json" }, body: JSON.stringify({ goal: prompt, route, conversation: conversation.slice(-12).map(({ role, content }) => ({ role, content })) }) });
}

export default function FreshAIHome() {
  const route = typeof window === "undefined" ? "/ai" : window.location.pathname;
  const context = useMemo(() => createFreshAIWorkspaceContext(route), [route]);
  const [mode, setMode] = useState<Mode>("chat");
  const [draft, setDraft] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [meta, setMeta] = useState<ApiResponse>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [voice, setVoice] = useState(false);
  const [listening, setListening] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const composerRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    const open = (event: Event) => {
      const prompt = (event as CustomEvent<{ prompt?: string }>).detail?.prompt;
      if (prompt) setDraft(prompt);
      composerRef.current?.focus();
    };
    window.addEventListener("fresh-ai-open", open);
    return () => window.removeEventListener("fresh-ai-open", open);
  }, []);

  useEffect(() => {
    const el = composerRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(Math.max(el.scrollHeight, 54), 180)}px`;
  }, [draft]);

  async function send() {
    const text = draft.trim();
    if (!text || loading) return;
    const user: Turn = { id: crypto.randomUUID(), role: "user", content: text };
    const pending: Turn = { id: crypto.randomUUID(), role: "assistant", content: "", pending: true };
    const controller = new AbortController();
    abortRef.current = controller;
    setTurns((current) => [...current, user, pending]);
    setDraft("");
    setError(null);
    setEvidence([]);
    setMeta({});
    setLoading(true);
    try {
      const response = await freshPrompt(text, route, [...turns, user], controller.signal);
      const payload = (await response.json()) as ApiResponse;
      if (!response.ok) throw new Error(payload.error || `Fresh AI request failed (${response.status})`);
      const answer = payload.answer?.trim() || "Fresh AI completed the request without a text answer.";
      setTurns((current) => current.map((turn) => turn.id === pending.id ? { ...turn, content: answer, pending: false } : turn));
      setEvidence(Array.isArray(payload.evidence) ? payload.evidence : []);
      setMeta(payload);
    } catch (reason) {
      if (reason instanceof DOMException && reason.name === "AbortError") {
        setTurns((current) => current.filter((turn) => turn.id !== pending.id));
      } else {
        const message = reason instanceof Error ? reason.message : "Fresh AI could not complete that request.";
        setError(message);
        setTurns((current) => current.map((turn) => turn.id === pending.id ? { ...turn, content: "", pending: false } : turn));
      }
    } finally {
      abortRef.current = null;
      setLoading(false);
    }
  }

  function stop() { abortRef.current?.abort(); }
  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void send(); } }
  function copy(text: string, id: string) { void navigator.clipboard?.writeText(text); setCopied(id); window.setTimeout(() => setCopied(null), 1400); }

  function startVoice() {
    const browserWindow = window as Window & { SpeechRecognition?: new () => any; webkitSpeechRecognition?: new () => any };
    const Recognition = browserWindow.SpeechRecognition ?? browserWindow.webkitSpeechRecognition;
    if (!Recognition) { setVoice((value) => !value); return; }
    const recognition = new Recognition();
    recognition.lang = navigator.language || "en-US";
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.onresult = (event: any) => setDraft(Array.from(event.results).map((result: any) => result[0]?.transcript || "").join(""));
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    setListening(true);
    recognition.start();
  }

  return <main className="fresh-ai-main">
    <header className="fresh-ai-main-header">
      <div className="fresh-ai-main-brand"><div className="fresh-ai-main-mark">F</div><div><span>FRESH AI</span><h1>One intelligence. Everywhere.</h1><p>Ask anything. Fresh understands the space you're in and chooses the right capabilities, knowledge, models and tools.</p></div></div>
      <div className="fresh-ai-main-header-actions"><button type="button" onClick={startVoice}>{listening ? "Listening…" : voice ? "Voice on" : "Voice"}</button><button type="button" onClick={() => window.dispatchEvent(new CustomEvent("fresh-ai-open"))}>Open companion</button></div>
    </header>

    <section className="fresh-ai-workspace" aria-label="Fresh AI conversation workspace">
      <div className="fresh-ai-answer-space">
        <div className="fresh-ai-context-strip"><span>LIVE CONTEXT</span><b>{context.featureName}</b><em>{context.surface}</em><small>{context.capabilities.length} capabilities · {context.toolNamespaces.length} tool spaces</small></div>
        {turns.length === 0 ? <div className="fresh-ai-empty"><div className="fresh-ai-empty-orb">F</div><h2>What are we working on?</h2><p>Chat with Fresh, research a question, create something, build software, learn, or ask Fresh to work with the space you're in.</p><div className="fresh-ai-starters">{["Help me think through an idea", "Research something for me", "Build the next step", "Explain this to me"].map((item) => <button key={item} type="button" onClick={() => { setDraft(item); composerRef.current?.focus(); }}>{item}</button>)}</div></div> : <div className="fresh-ai-message-list" aria-live="polite">{turns.map((turn) => <article className={`fresh-ai-message ${turn.role}`} key={turn.id}><div className="fresh-ai-avatar">{turn.role === "assistant" ? "F" : "You"}</div><div className="fresh-ai-message-body">{turn.pending ? <div className="fresh-ai-thinking"><span></span><span></span><span></span><b>Fresh is working…</b></div> : <div className="fresh-ai-message-text">{turn.content}</div>}{turn.role === "assistant" && !turn.pending && <div className="fresh-ai-message-actions"><button type="button" onClick={() => copy(turn.content, turn.id)}>{copied === turn.id ? "Copied" : "Copy"}</button><button type="button" onClick={() => setDraft("Improve that answer")}>Regenerate</button><button type="button">Helpful</button><button type="button">Needs work</button></div>}</div></article>)}</div>}
        {error && <div className="fresh-ai-error"><b>Fresh AI couldn't complete that.</b><span>{error}</span><button type="button" onClick={() => setError(null)}>Dismiss</button></div>}
        {evidence.length > 0 && <section className="fresh-ai-evidence"><div><span>PROOF</span><b>{meta.confidence ?? "Verified"} · {evidence.length} sources</b></div>{evidence.slice(0, 6).map((item, index) => <div className="fresh-ai-source" key={`${item.title}-${index}`}><strong>{item.title}</strong><small>{item.snippet || item.url || "Source used by Fresh"}</small></div>)}</section>}
      </div>

      <aside className="fresh-ai-right-rail">
        <section><span className="rail-label">ACTIVE SPACE</span><h3>{context.featureName}</h3><p>Fresh follows this context into the same intelligence system.</p><div className="rail-tags"><b>surface:{context.surface}</b><b>feature:{context.featureId}</b><b>model:{context.activeModelId}</b></div></section>
        <section><span className="rail-label">FRESH POWERS</span><div className="rail-powers">{context.capabilities.slice(0, 12).map((power) => <button key={power} type="button" onClick={() => { setDraft(`Use your ${power} capability to help me.`); composerRef.current?.focus(); }}>{power}</button>)}</div></section>
        <section><span className="rail-label">MODELS & VOICE</span>{context.models.map((model) => <div className="rail-model" key={model.id}><span>{model.family === "voice" ? "◉" : "✦"}</span><div><b>{model.name}</b><small>{model.family} · {model.available ? "ready" : "unavailable"}</small></div></div>)}</section>
      </aside>
    </section>

    <section className="fresh-ai-composer" aria-label="Fresh AI message composer"><div className="composer-mode-row">{modes.map(([id, label, hint]) => <button type="button" key={id} className={mode === id ? "active" : ""} onClick={() => { setMode(id); if (id !== "chat") setDraft(`${label}: `); }}>{label}<small>{hint}</small></button>)}<span>Fresh Auto · context aware</span></div><div className="composer-box"><button type="button" className="composer-icon" aria-label="Add attachment">＋</button><textarea ref={composerRef} value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={onKeyDown} placeholder="Message Fresh AI…" rows={1} aria-label="Message Fresh AI"/><button type="button" className="composer-icon" onClick={startVoice} aria-label="Voice input">{listening ? "●" : "◉"}</button>{loading ? <button type="button" className="composer-send stop" onClick={stop} aria-label="Stop generation">■</button> : <button type="button" className="composer-send" onClick={() => void send()} disabled={!draft.trim()} aria-label="Send message">↑</button>}</div><div className="composer-hint"><span>Enter to send · Shift+Enter for a new line</span><span>{context.models.filter((model) => model.available).length} model endpoints · Device Voice · governed actions</span></div></section>

    <section className="fresh-ai-everywhere"><div><span>AI EVERYWHERE</span><h2>The same Fresh AI, inside every part of Fresh.</h2></div><div className="everywhere-grid">{surfaces.map(([name, description]) => <button type="button" key={name} onClick={() => { setDraft(`I'm working in ${name}. ${description}. Help me here.`); composerRef.current?.focus(); }}><strong>{name}</strong><small>{description}</small><b>Use Fresh here →</b></button>)}</div></section>
    <footer><b>Fresh AI · one identity</b><span>Memory · Knowledge · Research · Truth · Skills · Models · Voice · Tools · ARA6 · Verification</span></footer>
  </main>;
}

import { useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { useLayout } from "../contexts/useLayout";
import { useTheme } from "../providers/ThemeProvider";
import { supabase } from "../../lib/supabase";
import { createFreshAIWorkspaceContext } from "../../core/fresh-ai/FreshAIWorkspaceContext";
import { conversationService } from "../../features/ai/services/conversationService";
import { freshSecureVault } from "../../core/crypto/FreshSecureVault";
import FreshAIRichText from "./FreshAIRichText";
import "./FreshAIUnified.css";
import "./FreshAIVault.css";
import "./FreshAIArtifactPresentation.css";

type Turn = { role: "user" | "assistant"; content: string; createdAt: string };
type Evidence = { title: string; snippet?: string };
type Attachment = { id: string; name: string; mimeType: string; size: number; url?: string };
type DimensionalArtifact = {
  engine: string;
  dimension: number;
  kind: string;
  title: string;
  mimeType: string;
  data: unknown;
  previewDataUrl?: string;
};
type AskPayload = {
  requestId?: string;
  conversationId?: string | null;
  answer?: string;
  error?: string;
  source?: string;
  evidence?: Evidence[];
  image?: { url?: string; dataUrl?: string; assetId?: string; model: string; size: string };
  native?: boolean;
  dimensionalArtifact?: DimensionalArtifact;
  status?: "completed" | "approval-required" | "failed";
};

const modes = ["Chat", "Research", "Create", "Build", "Learn", "Act"] as const;
const capabilities = [
  ["◈", "Research", "Find, compare and verify information"],
  ["✦", "Create", "Images, media and native artifacts"],
  ["⌘", "Build", "Code, systems and engineering"],
  ["◇", "Analyze", "Understand files, data and context"],
  ["◎", "Learn", "Teach, explain and build knowledge"],
  ["✓", "Verify", "Check evidence and trust"],
  ["↗", "Act", "Governed actions and automation"],
  ["▱", "Organize", "Projects, memory and workspace"],
] as const;

export default function FreshAIUnified() {
  const { activeRoute } = useLayout();
  const { theme, toggle } = useTheme();
  const context = useMemo(() => createFreshAIWorkspaceContext(activeRoute ?? "/"), [activeRoute]);
  const isAI = (activeRoute ?? "").replace(/\/$/, "").toLowerCase() === "/ai";
  const [open, setOpen] = useState(isAI);
  const [draft, setDraft] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [mode, setMode] = useState<(typeof modes)[number]>("Chat");
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [image, setImage] = useState<AskPayload["image"]>();
  const [artifact, setArtifact] = useState<DimensionalArtifact>();
  const [requestId, setRequestId] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [source, setSource] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Record<string, number>>({});
  const [voice, setVoice] = useState(false);
  const [constellation, setConstellation] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [vaultUnlocked, setVaultUnlocked] = useState(() => freshSecureVault.status().unlocked);
  const [vaultPassphrase, setVaultPassphrase] = useState("");
  const [vaultBusy, setVaultBusy] = useState(false);
  const [vaultMessage, setVaultMessage] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const messagesRef = useRef<HTMLElement | null>(null);
  const stickRef = useRef(true);

  useEffect(() => { if (isAI) setOpen(true); }, [isAI]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: loading ? "auto" : "smooth" }); }, [turns, loading]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        if (!token) return;
        const response = await fetch("/api/ai/conversations", { headers: { authorization: `Bearer ${token}` } });
        if (!response.ok) return;
        const payload = await response.json() as { conversation?: { id: string } | null; turns?: Array<{ role: "user" | "assistant"; content: string; created_at: string }> };
        if (cancelled || !payload.conversation) return;
        setConversationId(payload.conversation.id);
        const rawTurns = (payload.turns ?? []).map((turn) => ({ role: turn.role, content: turn.content, createdAt: turn.created_at }));
        const opened = await conversationService.openTurns(rawTurns);
        if (cancelled) return;
        setTurns(opened.map((turn) => ({ role: turn.role, content: turn.content, createdAt: turn.createdAt })));
      } catch {}
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const handler = (event: Event) => {
      const prompt = (event as CustomEvent<{ prompt?: string }>).detail?.prompt;
      if (!prompt) return;
      setDraft(prompt);
      setOpen(true);
      requestAnimationFrame(() => inputRef.current?.focus());
    };
    window.addEventListener("fresh-ai-open", handler);
    return () => window.removeEventListener("fresh-ai-open", handler);
  }, []);

  async function unlockVault() {
    if (vaultBusy) return;
    setVaultBusy(true);
    setVaultMessage(null);
    try {
      if (vaultPassphrase.trim().length >= 8) {
        await conversationService.unlockVault(vaultPassphrase.trim());
        setVaultPassphrase("");
        setVaultMessage("Vault unlocked — history can be sealed at rest.");
      } else {
        await conversationService.unlockEphemeral();
        setVaultMessage("Ephemeral vault unlocked for this session only.");
      }
      setVaultUnlocked(true);
    } catch (reason) {
      setVaultMessage(reason instanceof Error ? reason.message : "Unable to unlock vault.");
      setVaultUnlocked(false);
    } finally {
      setVaultBusy(false);
    }
  }

  function lockVault() {
    conversationService.lockVault();
    setVaultUnlocked(false);
    setVaultMessage("Vault locked.");
  }

  async function sealRecentTurns(userText: string, assistantText: string, activeConversationId: string | null, token: string | undefined) {
    if (!freshSecureVault.status().unlocked || !activeConversationId || !token || !assistantText) return;
    try {
      const sealedUser = await conversationService.sealForStorage(userText, "fresh-ai-conversation");
      const sealedAssistant = await conversationService.sealForStorage(assistantText, "fresh-ai-conversation");
      if (!sealedUser.encrypted || !sealedAssistant.encrypted) return;
      await fetch("/api/ai/conversations", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
        body: JSON.stringify({
          conversationId: activeConversationId,
          action: "seal-latest",
          sealedUserContent: sealedUser.payload,
          sealedAssistantContent: sealedAssistant.payload,
        }),
      });
    } catch {
      // Sealing is best-effort; do not fail the visible answer path.
    }
  }

  function resizeInput() {
    const element = inputRef.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${Math.min(element.scrollHeight, 180)}px`;
  }
  function onScroll() {
    const element = messagesRef.current;
    if (element) stickRef.current = element.scrollHeight - element.scrollTop - element.clientHeight < 100;
  }

  async function uploadFiles(files: FileList | null) {
    if (!files?.length || uploading) return;
    setUploading(true);
    setError(null);
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("Sign in to attach files to Fresh AI.");
      const uploaded: Attachment[] = [];
      for (const file of Array.from(files)) {
        const form = new FormData();
        form.set("file", file);
        const response = await fetch("/api/ai/upload", { method: "POST", headers: { authorization: `Bearer ${token}` }, body: form });
        const payload = await response.json() as { asset?: Attachment; error?: string };
        if (!response.ok || !payload.asset) throw new Error(payload.error || `Unable to attach ${file.name}`);
        uploaded.push(payload.asset);
      }
      setAttachments((current) => [...current, ...uploaded]);
      setDraft((current) => `${current}${current ? "\n" : ""}${uploaded.map((file) => `[Attached: ${file.name} · ${file.id}]`).join("\n")}`);
      requestAnimationFrame(resizeInput);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Fresh AI could not attach the selected files.");
    } finally {
      setUploading(false);
    }
  }

  async function submit(goal: string, approve = false) {
    if (!goal || loading || uploading) return;
    const now = new Date().toISOString();
    const previous = turns.slice(-12);
    setTurns((current) => [...current, { role: "user", content: goal, createdAt: now }, { role: "assistant", content: "", createdAt: new Date().toISOString() }]);
    setDraft("");
    setAttachments([]);
    requestAnimationFrame(resizeInput);
    setLoading(true);
    setError(null);
    setEvidence([]);
    setImage(undefined);
    setArtifact(undefined);
    setSource(null);
    setPendingAction(null);
    stickRef.current = true;
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      const response = await fetch("/api/ai/ask", {
        method: "POST",
        signal: controller.signal,
        headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ goal, route: activeRoute ?? "/", mode: mode.toLowerCase(), model: "fresh-unified-1", voiceModel: context.activeVoiceModelId, conversationId, conversation: previous, workspaceContext: context, approve, image: mode === "Create" ? { size: "1024x1024", quality: "auto" } : undefined }),
      });
      const payload = await response.json() as AskPayload;
      if (!response.ok) throw new Error(payload.error || `Fresh AI request failed (${response.status})`);
      setTurns((current) => {
        const copy = [...current];
        const last = copy[copy.length - 1];
        if (last?.role === "assistant") copy[copy.length - 1] = { ...last, content: payload.answer || "Fresh AI completed the request." };
        return copy;
      });
      setRequestId(payload.requestId ?? null);
      setConversationId(payload.conversationId ?? conversationId);
      setSource(payload.native ? "Fresh Native Engine" : payload.source ?? "Fresh AI");
      setEvidence(Array.isArray(payload.evidence) ? payload.evidence : []);
      setImage(payload.image);
      setArtifact(payload.dimensionalArtifact);
      setPendingAction(payload.status === "approval-required" ? goal : null);
      await sealRecentTurns(goal, payload.answer || "Fresh AI completed the request.", payload.conversationId ?? conversationId, token);
      if (voice && payload.answer && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(new SpeechSynthesisUtterance(payload.answer));
      }
    } catch (reason) {
      if (reason instanceof DOMException && reason.name === "AbortError") return;
      const message = reason instanceof Error ? reason.message : "Fresh AI could not complete that request.";
      setError(message);
      setTurns((current) => current[current.length - 1]?.role === "assistant" && !current[current.length - 1].content ? current.slice(0, -1) : current);
    } finally {
      abortRef.current = null;
      setLoading(false);
    }
  }

  function ask(event?: FormEvent) { event?.preventDefault(); void submit(draft.trim()); }
  function stop() { abortRef.current?.abort(); setLoading(false); setPendingAction(null); }
  function keyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void submit(draft.trim()); }
  }
  function approvePendingAction() { if (pendingAction && !loading) void submit(pendingAction, true); }
  function cancelPendingAction() { setPendingAction(null); }
  function suggestion(text: string) { setDraft(text); setOpen(true); requestAnimationFrame(() => inputRef.current?.focus()); }
  function regenerate() { const userTurn = [...turns].reverse().find((turn) => turn.role === "user"); if (userTurn && !loading) void submit(userTurn.content); }
  async function feedbackFor(id: string, rating: number) {
    if (feedback[id]) return;
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) return;
      const response = await fetch("/api/ai/feedback", { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${token}` }, body: JSON.stringify({ requestId: id, rating, correct: rating >= 4 }) });
      if (response.ok) setFeedback((current) => ({ ...current, [id]: rating }));
    } catch {}
  }
  function speak(text: string) { if (!("speechSynthesis" in window)) return; window.speechSynthesis.cancel(); window.speechSynthesis.speak(new SpeechSynthesisUtterance(text)); }

  const capabilityPanel = constellation ? (
    <div className="fresh-ai-constellation" role="dialog" aria-label="Fresh AI capabilities">
      <div className="fresh-ai-constellation-head"><div><b>Fresh Intelligence</b><small>Choose a capability. Fresh keeps one intelligence underneath.</small></div><button type="button" onClick={() => setConstellation(false)} aria-label="Close capabilities">×</button></div>
      <div className="fresh-ai-capability-grid">
        {capabilities.map(([icon, name, description]) => (
          <button key={name} type="button" onClick={() => { const nextMode = name === "Research" ? "Research" : name === "Create" ? "Create" : name === "Build" ? "Build" : name === "Learn" ? "Learn" : name === "Act" ? "Act" : "Chat"; setMode(nextMode); setConstellation(false); inputRef.current?.focus(); }}>
            <i>{icon}</i><span><b>{name}</b><small>{description}</small></span><em>›</em>
          </button>
        ))}
      </div>
    </div>
  ) : null;

  const messageList = turns.length === 0 ? (
    <div className="fresh-ai-unified-welcome"><div className="fresh-ai-welcome-crystal">✦</div><h2>What can Fresh help you do?</h2><p>One intelligence for conversation, knowledge, creation, work and action across Fresh Web Lite.</p><div className="fresh-ai-suggestions">{["Understand something", "Research this", "Create an image", "Generate a 3D object"].map((text) => <button key={text} type="button" onClick={() => suggestion(text)}><span>◇</span>{text}</button>)}</div></div>
  ) : turns.map((turn, index) => (
    <article key={`${turn.createdAt}-${index}`} className={`fresh-ai-unified-message ${turn.role}`}>
      <div className="fresh-ai-unified-avatar">{turn.role === "assistant" ? <span>✦</span> : "You"}</div>
      <div><small>{turn.role === "assistant" ? "Fresh AI" : "You"}</small>{turn.role === "assistant" ? <FreshAIRichText text={turn.content || ""} /> : <p>{turn.content}</p>}
        {turn.role === "assistant" && index === turns.length - 1 && turn.content ? <nav><button type="button" onClick={() => void navigator.clipboard?.writeText(turn.content)}>Copy</button><button type="button" onClick={regenerate}>Regenerate</button><button type="button" onClick={() => speak(turn.content)}>Read aloud</button>{requestId ? <><button type="button" onClick={() => void feedbackFor(requestId, 5)} disabled={Boolean(feedback[requestId])}>👍</button><button type="button" onClick={() => void feedbackFor(requestId, 1)} disabled={Boolean(feedback[requestId])}>👎</button></> : null}</nav> : null}
      </div>
    </article>
  ));

  const evidencePanel = evidence.length > 0 ? <aside className="fresh-ai-unified-evidence"><strong>✓ Verified evidence · {evidence.length}</strong>{evidence.map((item, index) => <div key={`${item.title}-${index}`}><span>{item.title}</span>{item.snippet ? <small>{item.snippet}</small> : null}</div>)}</aside> : null;
  const artifactPanel = artifact ? <aside className="fresh-ai-unified-evidence"><strong>◇ Fresh Native · {artifact.dimension}D · {artifact.engine}</strong>{artifact.previewDataUrl ? <img src={artifact.previewDataUrl} alt={`${artifact.dimension}D Fresh native artifact preview`} /> : null}<small>{artifact.title} · {artifact.kind} · {artifact.mimeType}</small><pre>{JSON.stringify(artifact.data, null, 2)}</pre></aside> : null;
  const imagePanel = image ? <div className="fresh-ai-unified-image">{image.url || image.dataUrl ? <img src={image.url || image.dataUrl} alt="Generated by Fresh AI" /> : null}<small>{image.model} · {image.size}{image.assetId ? " · saved to Fresh media" : ""}</small></div> : null;
  const actionPanel = pendingAction ? <aside className="fresh-ai-action-approval"><strong>Action approval required</strong><span>Fresh prepared a governed action but did not execute it without your approval.</span><div><button type="button" onClick={approvePendingAction} disabled={loading}>Approve & execute</button><button type="button" onClick={cancelPendingAction} disabled={loading}>Cancel</button></div></aside> : null;
  const errorPanel = error ? <div className="fresh-ai-unified-error"><b>Fresh AI couldn't complete that request.</b><span>{error}</span><button type="button" onClick={() => { const userTurn = [...turns].reverse().find((turn) => turn.role === "user"); setError(null); if (userTurn) void submit(userTurn.content); }}>Retry</button></div> : null;

  const body = <div className="fresh-ai-unified-shell">
    <header><div className="fresh-ai-unified-brand"><button className="fresh-ai-unified-orb" type="button" onClick={() => setConstellation((current) => !current)} aria-label="Open Fresh AI capabilities"><span>✦</span></button><div><strong>Fresh AI</strong><small>One intelligence. Everywhere.</small></div></div><div className="fresh-ai-unified-actions"><span>{context.featureName}</span><button type="button" onClick={toggle} aria-label="Toggle theme">{theme === "dark" ? "☀" : "☾"}</button>{!isAI ? <button type="button" onClick={() => setOpen(false)} aria-label="Close">×</button> : null}</div></header>
    {capabilityPanel}
    <div className="fresh-ai-unified-context"><span className="fresh-ai-context-diamond">◇</span>{context.surface}<span>·</span>{context.featureName}<span>·</span>{conversationId ? `Session ${conversationId.slice(0, 8)}` : "New session"}</div>
    <section className="fresh-ai-unified-messages" ref={messagesRef} onScroll={onScroll}>{messageList}{loading ? <div className="fresh-ai-progress"><span className="fresh-ai-progress-diamond">◇</span><div><b>Fresh is working</b><small>Understanding · retrieving · checking · preparing</small></div></div> : null}{evidencePanel}{artifactPanel}{imagePanel}{actionPanel}{errorPanel}<div ref={endRef} /></section>
    <div className="fresh-ai-unified-composer"><div className="fresh-ai-composer-hint"><span className="fresh-ai-hint-diamond">◇</span><small>{mode} mode · Context aware</small></div>
      <div className="fresh-ai-vault-bar" aria-label="Fresh AI vault">
        <span className="fresh-ai-vault-label">{vaultUnlocked ? "🔓 Vault unlocked" : "🔒 Vault locked"}</span>
        {!vaultUnlocked ? (
          <>
            <input
              type="password"
              autoComplete="current-password"
              placeholder="Passphrase (8+ chars) or leave empty for session key"
              value={vaultPassphrase}
              onChange={(event) => setVaultPassphrase(event.target.value)}
              disabled={vaultBusy}
            />
            <button type="button" onClick={() => void unlockVault()} disabled={vaultBusy}>{vaultBusy ? "Unlocking…" : "Unlock"}</button>
          </>
        ) : (
          <button type="button" onClick={lockVault} disabled={vaultBusy}>Lock</button>
        )}
        {vaultMessage ? <small className="fresh-ai-vault-msg">{vaultMessage}</small> : <small className="fresh-ai-vault-msg">At-rest seal only — live AI requests still use plaintext on the server.</small>}
      </div>
      <form onSubmit={ask}><button className="fresh-ai-add" type="button" onClick={() => setConstellation((current) => !current)} aria-label="Open capabilities">＋</button><textarea ref={inputRef} rows={1} value={draft} onChange={(event) => { setDraft(event.target.value); resizeInput(); }} onKeyDown={keyDown} placeholder="Message Fresh AI…" /><button className={`fresh-ai-voice ${voice ? "active" : ""}`} type="button" onClick={() => setVoice((current) => !current)} aria-label="Toggle voice">{voice ? "◉" : "◌"}</button><button className="fresh-ai-send" type="submit" disabled={!draft.trim() || loading || uploading} aria-label="Send">↑</button></form>
      <div className="fresh-ai-composer-tools"><label className="fresh-ai-attach">⌕ {uploading ? "Uploading…" : "Attach"}<input type="file" multiple onChange={(event) => { void uploadFiles(event.target.files); event.currentTarget.value = ""; }} /></label><div className="fresh-ai-mode-strip">{modes.map((item) => <button key={item} className={mode === item ? "active" : ""} type="button" onClick={() => setMode(item)}>{item}</button>)}</div><span>{loading ? "Fresh is working…" : uploading ? "Securing files…" : "Enter to send · Shift+Enter for newline"}</span>{loading ? <button type="button" onClick={stop}>Stop</button> : null}</div>
      {attachments.length > 0 ? <div className="fresh-ai-composer-attachments" aria-label="Attached files">{attachments.map((file) => <span key={file.id}>◇ {file.name}</span>)}</div> : null}
      <small className="fresh-ai-unified-status"><span>✦</span> {source || "Fresh AI"} · Vault {vaultUnlocked ? "unlocked (at-rest seal available)" : "locked"} · Memory · Research · Governed tools</small>
    </div>
  </div>;

  if (isAI) return <main className="fresh-ai-unified-page">{body}</main>;
  return <>{!open ? <button className="fresh-ai-unified-trigger" type="button" onClick={() => setOpen(true)}><span>✦</span>Fresh AI</button> : null}{open ? <div className="fresh-ai-unified-overlay" role="dialog" aria-label="Fresh AI">{body}</div> : null}</>;
}

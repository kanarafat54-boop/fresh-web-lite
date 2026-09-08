import { useState } from "react";
import { runIntelligence } from "../../intelligence";
import type { IntelligenceConversationTurn } from "../../intelligence/intelligenceConnectors";

interface ChatMessage {
  id: number;
  role: "assistant" | "user";
  text: string;
  sources?: { url: string; title: string }[];
}

const quickPrompts = [
  ["Research", "Research this with current evidence and explain the key findings."],
  ["Build", "Help me design and build this idea step by step."],
  ["Analyze", "Analyze this and show me the strongest options and trade-offs."],
  ["Plan", "Turn this goal into a practical plan I can execute."],
] as const;

export default function ConversationPanel() {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState("Ready");
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 1, role: "assistant", text: "Welcome to Fresh AI. What would you like to accomplish today?" },
  ]);

  async function send(value = message) {
    const input = value.trim();
    if (!input || sending) return;

    const conversation: IntelligenceConversationTurn[] = messages
      .slice(-8)
      .map(({ role, text }) => ({ role, content: text }));

    setMessages((current) => [...current, { id: Date.now(), role: "user", text: input }]);
    setMessage("");
    setSending(true);
    setStatus("Thinking");

    try {
      setStatus("Understanding your goal");
      const response = await runIntelligence({
        prompt: input,
        query: input,
        conversation,
      });
      setStatus(response.sources?.length ? "Research complete" : "Reasoning complete");
      setMessages((current) => [
        ...current,
        {
          id: Date.now() + 1,
          role: "assistant",
          text: response.text,
          sources: response.sources
            ?.filter((source) => Boolean(source.url))
            .slice(0, 3)
            .map((source) => ({ url: source.url, title: source.title })),
        },
      ]);
    } catch (err) {
      setStatus("Needs attention");
      setMessages((current) => [
        ...current,
        { id: Date.now() + 1, role: "assistant", text: `Something went wrong: ${err instanceof Error ? err.message : "unknown error"}` },
      ]);
    } finally {
      setSending(false);
      window.setTimeout(() => setStatus("Ready"), 900);
    }
  }

  return (
    <section className="conversation-card">
      <div className="conversation-header">
        <h2>Fresh AI</h2>
        <small aria-live="polite">{status}</small>
      </div>

      <div className="conversation-history" aria-live="polite">
        {messages.map((m) => (
          <div key={m.id} className={m.role === "assistant" ? "assistant-message" : "user-message"} style={{ whiteSpace: "pre-line" }}>
            {m.text}
            {m.sources && m.sources.length > 0 && (
              <div className="conversation-sources">
                {m.sources.map((source) => (
                  <a key={source.url} href={source.url} target="_blank" rel="noreferrer">
                    {source.title}
                  </a>
                ))}
              </div>
            )}
          </div>
        ))}
        {sending && <div className="assistant-message">Fresh AI is working…</div>}
      </div>

      <div className="conversation-composer" aria-label="Fresh AI composer">
        <div className="conversation-quick-actions" aria-label="Fresh AI quick actions">
          {quickPrompts.map(([title, prompt]) => (
            <button
              key={title}
              type="button"
              onClick={() => void send(prompt)}
              disabled={sending}
            >
              {title}
            </button>
          ))}
        </div>
        <div className="conversation-input">
          <input
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Describe your goal..."
            onKeyDown={(event) => event.key === "Enter" && void send()}
            disabled={sending}
            aria-label="Message Fresh AI"
          />
          <button onClick={() => void send()} disabled={sending || !message.trim()}>
            {sending ? "Working…" : "Send"}
          </button>
        </div>
      </div>
    </section>
  );
}

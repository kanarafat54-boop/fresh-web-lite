import { useState } from "react";
import { runIntelligence } from "../../intelligence";

interface ChatMessage {
  id: number;
  role: "assistant" | "user";
  text: string;
  sources?: { url: string; title: string }[];
}

export default function ConversationPanel() {
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: 1, role: "assistant", text: "Welcome to Fresh AI. What would you like to accomplish today?" },
  ]);

  async function send() {
    const input = message.trim();
    if (!input || sending) return;

    setMessages((current) => [...current, { id: Date.now(), role: "user", text: input }]);
    setMessage("");
    setSending(true);

    try {
      const response = await runIntelligence({ prompt: input, query: input });
      setMessages((current) => [
        ...current,
        {
          id: Date.now() + 1,
          role: "assistant",
          text: response.text,
          sources: response.sources?.slice(0, 3).map((s) => ({ url: s.url, title: s.title })),
        },
      ]);
    } catch (err) {
      setMessages((current) => [
        ...current,
        { id: Date.now() + 1, role: "assistant", text: `Something went wrong: ${err instanceof Error ? err.message : "unknown error"}` },
      ]);
    } finally {
      setSending(false);
    }
  }

  return (
    <section className="conversation-card">
      <h2>Fresh AI</h2>
      <div className="conversation-history">
        {messages.map((m) => (
          <div key={m.id} className={m.role === "assistant" ? "assistant-message" : "user-message"} style={{ whiteSpace: "pre-line" }}>
            {m.text}
            {m.sources && m.sources.length > 0 && (
              <div style={{ marginTop: 6, fontSize: "0.85em", opacity: 0.8 }}>
                {m.sources.map((s) => (
                  <a key={s.url} href={s.url} target="_blank" rel="noreferrer" style={{ display: "block" }}>{s.title}</a>
                ))}
              </div>
            )}
          </div>
        ))}
        {sending && <div className="assistant-message">Fresh AI is thinking…</div>}
      </div>
      <div className="conversation-input">
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Describe your goal..."
          onKeyDown={(e) => e.key === "Enter" && void send()}
          disabled={sending}
        />
        <button onClick={() => void send()} disabled={sending}>Send</button>
      </div>
    </section>
  );
}

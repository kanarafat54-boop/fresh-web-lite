import { useState } from "react";
import { executionKernel } from "../../../../core/kernel/executionKernel";
import { useFreshId } from "../../../fresh-id/context/FreshIdContext";

interface ChatMessage {
  id: number;
  role: "assistant" | "user";
  text: string;
}

export default function ConversationPanel() {
  const { user } = useFreshId();
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 1,
      role: "assistant",
      text: "Welcome to Fresh AI. What would you like to accomplish today?",
    },
  ]);

  function send() {
    if (!message.trim()) return;

    const userId = user?.id ?? "guest";
    const input = message.trim();

    const userMsg: ChatMessage = { id: Date.now(), role: "user", text: input };

    let responseText: string;
    try {
      const result = executionKernel.execute({ userId, input });

      if (result.decision === "deny") {
        responseText = "That request was declined by the decision engine.";
      } else if (result.plan && result.plan.steps.length > 0) {
        const stepLines = result.plan.steps
          .map((s) => `• ${s.title}${s.requiresApproval ? " (needs approval)" : ""}`)
          .join("\n");
        responseText = `Plan created:\n${stepLines}`;
      } else {
        responseText = "I couldn't match that to a known capability yet.";
      }
    } catch (err: any) {
      responseText = `Something went wrong processing that: ${err.message ?? "unknown error"}`;
    }

    const assistantMsg: ChatMessage = {
      id: Date.now() + 1,
      role: "assistant",
      text: responseText,
    };

    setMessages((current) => [...current, userMsg, assistantMsg]);
    setMessage("");
  }

  return (
    <section className="conversation-card">
      <h2>Fresh AI</h2>

      <div className="conversation-history">
        {messages.map((m) => (
          <div
            key={m.id}
            className={m.role === "assistant" ? "assistant-message" : "user-message"}
            style={{ whiteSpace: "pre-line" }}
          >
            {m.text}
          </div>
        ))}
      </div>

      <div className="conversation-input">
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Describe your goal..."
          onKeyDown={(e) => e.key === "Enter" && send()}
        />
        <button onClick={send}>Send</button>
      </div>
    </section>
  );
}

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useLayout } from "../contexts/useLayout";
import { useTheme } from "../providers/ThemeProvider";
import { supabase } from "../../lib/supabase";
import "./GlobalFreshAI.css";

type Evidence = {
  title: string;
  snippet?: string;
  kind?: string;
  publishedAt?: string;
};

type PipelineEvent = {
  stage: string;
  status: string;
  detail?: string;
  metrics?: Record<string, number>;
};

type Governance = {
  autonomousSelfModification?: boolean;
  improvementProposalsRequireApproval?: boolean;
  highImpactActionsRequireApproval?: boolean;
  reversibleImprovementsOnly?: boolean;
} | null;

type ConversationTurn = {
  role: "user" | "assistant";
  content: string;
  createdAt?: string;
};

type AskResponse = {
  requestId?: string;
  answer?: string;
  confidence?: string;
  source?: string;
  error?: string;
  evidence?: Evidence[];
  pipeline?: PipelineEvent[];
  governance?: Governance;
  verification?: {
    uniqueSources?: number;
    uniqueDomains?: number;
    sourceDiversity?: string;
    confidence?: string;
    contradictionsDetected?: boolean;
  } | null;
  proof?: {
    mode?: string;
    evidenceCount?: number;
    provenance?: string;
  };
};

const kindLabel: Record<string, string> = {
  web: "Web",
  news: "News",
  video: "Video",
  image: "Image",
  music: "Music",
};

const baseSuggestions = [
  "Research this for me",
  "Compare the evidence",
  "Explain this clearly",
  "Build the next step",
  "Find risks and unknowns",
  "Turn this into a plan",
];

function suggestionsForRoute(route: string | undefined): string[] {
  const value = (route || "home").toLowerCase();

  if (value.includes("short")) {
    return [
      "Find the best ideas in this Shorts feed",
      "Explain this video",
      "Turn this into a post",
      "Research this creator",
      ...baseSuggestions.slice(4),
    ];
  }

  if (value.includes("learn")) {
    return [
      "Teach me this step by step",
      "Make a study plan",
      "Quiz me on this",
      "Find stronger sources",
      ...baseSuggestions.slice(4),
    ];
  }

  if (value.includes("wallet") || value.includes("crypto")) {
    return [
      "Explain this market move",
      "Compare these assets",
      "Check the risks",
      "Summarize the latest news",
      ...baseSuggestions.slice(4),
    ];
  }

  if (value.includes("profile")) {
    return [
      "Improve my profile",
      "Find relevant connections",
      "Organize my work",
      "Draft my next post",
      ...baseSuggestions.slice(4),
    ];
  }

  if (value.includes("work") || value.includes("studio")) {
    return [
      "Plan this project",
      "Review my workflow",
      "Find blockers",
      "Build the next step",
      ...baseSuggestions.slice(4),
    ];
  }

  return baseSuggestions;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export default function GlobalFreshAI() {
  const { activeRoute } = useLayout();
  const { theme, toggle } = useTheme();

  const [open, setOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [answer, setAnswer] = useState<string | null>(null);
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [pipeline, setPipeline] = useState<PipelineEvent[]>([]);
  const [verification, setVerification] = useState<AskResponse["verification"]>(null);
  const [governance, setGovernance] = useState<Governance>(null);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<"up" | "down" | null>(null);
  const [source, setSource] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversation, setConversation] = useState<ConversationTurn[]>([]);

  const suggestions = useMemo(
    () => suggestionsForRoute(activeRoute),
    [activeRoute],
  );

  useEffect(() => {
    const openFreshAI = () => {
      setOpen(true);
      setFullscreen(true);
    };

    const handleSuggestion = (event: Event) => {
      const value = (event as CustomEvent<{ prompt?: string }>).detail?.prompt;
      if (!value) return;

      setPrompt(value);
      setOpen(true);
      setFullscreen(true);
    };

    window.addEventListener("fresh-ai-open", openFreshAI);
    window.addEventListener("fresh-ai-suggestion", handleSuggestion);

    return () => {
      window.removeEventListener("fresh-ai-open", openFreshAI);
      window.removeEventListener("fresh-ai-suggestion", handleSuggestion);
    };
  }, []);

  async function ask(event?: FormEvent) {
    event?.preventDefault();

    const goal = prompt.trim();
    if (!goal || loading) return;

    const previous = conversation.slice(-8);
    setLoading(true);
    setError(null);
    setAnswer(null);
    setEvidence([]);
    setPipeline([]);
    setVerification(null);
    setGovernance(null);
    setRequestId(null);
    setFeedback(null);
    setSource(null);
    setOpen(true);

    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;

      const response = await fetch("/api/ai/ask", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(token ? { authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          goal,
          route: activeRoute ?? "/",
          conversation: previous,
        }),
      });

      const payload = (await response.json()) as AskResponse;
      if (!response.ok) {
        throw new Error(
          payload.error ?? `Fresh AI request failed (${response.status})`,
        );
      }

      const nextAnswer =
        typeof payload.answer === "string"
          ? payload.answer
          : "Fresh AI completed the request without a text answer.";
      const now = new Date().toISOString();
      const newTurns: ConversationTurn[] = [
        { role: "user", content: goal, createdAt: now },
        { role: "assistant", content: nextAnswer, createdAt: now },
      ];

      setRequestId(
        typeof payload.requestId === "string" ? payload.requestId : null,
      );
      setAnswer(nextAnswer);
      setConversation((turns) => [...turns, ...newTurns].slice(-16));
      setEvidence(Array.isArray(payload.evidence) ? payload.evidence : []);
      setPipeline(Array.isArray(payload.pipeline) ? payload.pipeline : []);
      setGovernance(
        isObject(payload.governance) ? payload.governance : null,
      );
      setVerification(
        isObject(payload.verification) ? payload.verification : null,
      );
      setSource(typeof payload.source === "string" ? payload.source : null);
      setPrompt("");
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : "Fresh AI could not complete that request.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function sendFeedback(value: "up" | "down") {
    if (!requestId || feedback || loading) return;

    setFeedback(value);

    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) return;

      await fetch("/api/ai/feedback", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          requestId,
          rating: value === "up" ? 5 : 1,
          correct: value === "up",
        }),
      });
    } catch {
      // Feedback is best effort and must not interrupt the AI experience.
    }
  }

  function useSuggestion(value: string) {
    setPrompt(value);
    setOpen(true);
    setFullscreen(true);
  }

  function close() {
    setFullscreen(false);
    setOpen(false);
  }

  const content = (
    <div
      className={
        fullscreen
          ? "global-fresh-ai-shell is-fullscreen"
          : "global-fresh-ai-shell"
      }
    >
      <div className="global-fresh-ai-header">
        <div className="global-fresh-ai-brand">
          <span className="global-fresh-ai-orb">F</span>
          <div>
            <strong>Fresh AI</strong>
            <small>
              Understands your goal, context and desired outcome
            </small>
          </div>
        </div>

        <div className="global-fresh-ai-header-actions">
          <button type="button" onClick={toggle}>
            {theme === "dark" ? "☀" : "☾"}
          </button>
          <button
            type="button"
            onClick={() => setFullscreen((value) => !value)}
          >
            {fullscreen ? "↙" : "↗"}
          </button>
          <button type="button" onClick={close}>
            ×
          </button>
        </div>
      </div>

      <p className="global-fresh-ai-context">
        You are in <strong>{activeRoute || "Home"}</strong>. Fresh interprets
        your goal before choosing research, tools or actions.
      </p>

      <form onSubmit={ask}>
        <textarea
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          placeholder="Tell Fresh what you want to accomplish…"
          rows={fullscreen ? 6 : 3}
          aria-label="Tell Fresh AI what you want to accomplish"
        />
        <div className="global-fresh-ai-form-footer">
          <span>
            {loading
              ? "Understanding your goal · resolving context · choosing the path"
              : "Fresh chooses the smallest useful path automatically"}
          </span>
          <button type="submit" disabled={loading || !prompt.trim()}>
            {loading ? "Understanding…" : "Ask Fresh AI"}
          </button>
        </div>
      </form>

      {answer && (
        <div className="global-fresh-ai-answer">
          <span>Fresh AI</span>
          <p>{answer}</p>

          {source && <small>{source}</small>}

          {pipeline.length > 0 && (
            <div className="global-fresh-ai-pipeline">
              <strong>Fresh Intelligence Path</strong>
              <div>
                {pipeline.map((item) => (
                  <span
                    key={item.stage}
                    data-status={item.status}
                    title={item.detail}
                  >
                    {item.stage}
                  </span>
                ))}
              </div>
            </div>
          )}

          {verification && (
            <div className="global-fresh-ai-proof">
              <strong>Fresh Proof</strong>
              <div>
                {verification.confidence ?? "Uncalibrated"} confidence ·{" "}
                {verification.uniqueSources ?? 0} independent results ·{" "}
                {verification.uniqueDomains ?? 0} distinct domains
              </div>
              <div>
                {verification.sourceDiversity ??
                  "Evidence diversity not reported"}
                {verification.contradictionsDetected
                  ? " · conflicting evidence detected"
                  : " · cross-checked"}
              </div>
            </div>
          )}

          {governance && (
            <div className="global-fresh-ai-governance">
              <strong>Governance</strong>
              <span>
                {governance.autonomousSelfModification
                  ? "Autonomous mutation enabled"
                  : "Self-modification locked"}
              </span>
              <span>
                {governance.highImpactActionsRequireApproval
                  ? "High-impact actions require approval"
                  : "High-impact actions open"}
              </span>
              <span>
                {governance.reversibleImprovementsOnly
                  ? "Improvements must be reversible"
                  : "Irreversible improvements allowed"}
              </span>
            </div>
          )}

          {evidence.length > 0 && (
            <div className="global-fresh-ai-evidence">
              <strong>Evidence used by Fresh</strong>
              {evidence.slice(0, 8).map((item, index) => (
                <div
                  className="global-fresh-ai-evidence-item"
                  key={`${index}-${item.title}`}
                >
                  <div>
                    <strong>{item.title}</strong>
                    <span>{kindLabel[item.kind ?? "web"] ?? "Evidence"}</span>
                  </div>
                  {item.snippet && <small>{item.snippet}</small>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {error && (
        <p className="global-fresh-ai-error">
          Fresh AI could not complete that request. {error}
        </p>
      )}

      {answer && (
        <div
          className="global-fresh-ai-suggestions"
          aria-label="Fresh AI next actions"
        >
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => useSuggestion(suggestion)}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}

      {requestId && answer && (
        <div className="global-fresh-ai-feedback">
          <span>Was this useful?</span>
          <button
            type="button"
            onClick={() => sendFeedback("up")}
            disabled={Boolean(feedback)}
          >
            Helpful
          </button>
          <button
            type="button"
            onClick={() => sendFeedback("down")}
            disabled={Boolean(feedback)}
          >
            Needs work
          </button>
          {feedback && <small>Feedback recorded for governed improvement.</small>}
        </div>
      )}

      <div className="global-fresh-ai-bottom-actions">
        <span>Persistent cognitive fabric</span>
        <span>Memory · Knowledge · Tools · Evaluation · Improvement</span>
      </div>

      {!fullscreen && (
        <button
          className="global-fresh-ai-full"
          type="button"
          onClick={() => setFullscreen(true)}
        >
          Open full Fresh AI →
        </button>
      )}
    </div>
  );

  return (
    <>
      {!fullscreen && (
        <button
          className="global-fresh-ai-trigger"
          type="button"
          onClick={() => setOpen((value) => !value)}
        >
          <span className="global-fresh-ai-mark">F</span>
          <span>Fresh AI</span>
        </button>
      )}

      {open && !fullscreen && (
        <aside
          className="global-fresh-ai-panel"
          aria-label="Fresh AI assistant"
        >
          {content}
        </aside>
      )}

      {fullscreen && (
        <div
          className="global-fresh-ai-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Fresh AI full screen workspace"
        >
          {content}
        </div>
      )}
    </>
  );
}

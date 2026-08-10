import { useMemo, useState } from "react";
import { useFreshCore } from "../../app/providers/FreshCoreProvider";
import { useFreshId } from "../fresh-id/context/FreshIdContext";
import "./FreshFirstExperience.css";

type Intent = {
  id: string;
  title: string;
  description: string;
  prompt: string;
};

const intents: Intent[] = [
  { id: "build", title: "Build something", description: "Turn an idea into a project, product, or plan.", prompt: "I want to build something" },
  { id: "learn", title: "Learn something", description: "Understand a subject with Fresh as your learning partner.", prompt: "I want to learn something" },
  { id: "find", title: "Find something", description: "Search the connected web and organize what matters.", prompt: "I want to find something" },
  { id: "create", title: "Create something", description: "Write, design, publish, edit, or develop with AI beside you.", prompt: "I want to create something" },
  { id: "connect", title: "Connect with people", description: "Discover people, communities, collaborators, and opportunities.", prompt: "I want to connect with people" },
  { id: "business", title: "Start a business", description: "Plan, build, operate, and grow a business from one workspace.", prompt: "I want to start a business" },
  { id: "money", title: "Manage money", description: "Explore Fresh Wallet, treasury, payments, and financial tools.", prompt: "I want to manage money" },
  { id: "explore", title: "Explore Fresh", description: "See what the connected Fresh ecosystem can do for you.", prompt: "I want to explore Fresh" },
];

export default function FreshFirstExperience() {
  const { ready } = useFreshCore();
  const { user, loading } = useFreshId();
  const [intent, setIntent] = useState<Intent | null>(null);
  const [input, setInput] = useState("");

  const greeting = useMemo(() => {
    const name = user?.user_metadata?.full_name ?? user?.user_metadata?.name;
    return name ? `Welcome, ${name}.` : "Welcome to Fresh.";
  }, [user]);

  if (!ready || loading) return null;

  return (
    <section className="fresh-first" aria-label="Fresh first experience">
      <div className="fresh-first__hero">
        <span className="fresh-first__eyebrow">Fresh Intelligence</span>
        <h1>{greeting}</h1>
        <p className="fresh-first__headline">One account. One intelligent world.</p>
        <p className="fresh-first__intro">
          Tell Fresh what you want to accomplish. We will help you find the right tools,
          knowledge, people, and workspace instead of making you learn where everything lives.
        </p>

        <div className="fresh-first__composer">
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            placeholder="Tell Fresh what you want to accomplish…"
            rows={3}
            aria-label="Tell Fresh what you want to accomplish"
          />
          <button
            type="button"
            disabled={!input.trim()}
            onClick={() => setIntent({
              id: "custom",
              title: "Your goal",
              description: "Fresh will use this as the starting context for your next step.",
              prompt: input.trim(),
            })}
          >
            Start with Fresh AI
          </button>
        </div>
      </div>

      <div className="fresh-first__section">
        <div className="fresh-first__section-heading">
          <div>
            <span className="fresh-first__eyebrow">Start anywhere</span>
            <h2>What are you here to do?</h2>
          </div>
          <span className="fresh-first__privacy">You stay in control of what Fresh remembers.</span>
        </div>

        <div className="fresh-first__grid">
          {intents.map((item) => (
            <button
              type="button"
              className="fresh-first__intent"
              key={item.id}
              onClick={() => setIntent(item)}
            >
              <strong>{item.title}</strong>
              <span>{item.description}</span>
            </button>
          ))}
        </div>
      </div>

      {intent && (
        <div className="fresh-first__next" role="status">
          <div>
            <span className="fresh-first__eyebrow">Fresh understood</span>
            <h2>{intent.title}</h2>
            <p>{intent.description}</p>
            <code>{intent.prompt}</code>
          </div>
          <button type="button" onClick={() => setIntent(null)}>Change direction</button>
        </div>
      )}
    </section>
  );
}

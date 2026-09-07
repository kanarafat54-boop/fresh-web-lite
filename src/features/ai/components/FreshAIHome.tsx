import { useState } from "react";
import "./FreshAIHome.css";
import DashboardLayout from "./dashboard/DashboardLayout";
import { DashboardProvider } from "../providers/DashboardProvider";
import "../intelligence";
import "../../../core/ara6/bootstrap";

const suggestions = [
  ["Research", "Research a question and compare evidence"],
  ["Build", "Design or debug something with Fresh"],
  ["Learn", "Teach a topic step by step"],
  ["Analyze", "Compare options and expose trade-offs"],
  ["Create", "Draft, transform or generate an idea"],
  ["Plan", "Turn a goal into an executable plan"],
] as const;

export default function FreshAIHome() {
  const [activeSuggestion, setActiveSuggestion] = useState("");

  function chooseSuggestion(title: string, description: string) {
    setActiveSuggestion(title);
    window.dispatchEvent(new CustomEvent("fresh-ai-suggestion", { detail: { prompt: description } }));
    window.dispatchEvent(new CustomEvent("fresh-ai-open"));
  }

  return (
    <DashboardProvider>
      <div className="fresh-ai-home">
        <section className="fresh-ai-hero" aria-labelledby="fresh-ai-title">
          <div className="fresh-ai-orb" aria-hidden="true"><span>F</span></div>
          <div className="fresh-ai-hero-copy">
            <span className="fresh-ai-eyebrow">FRESH INTELLIGENCE</span>
            <h1 id="fresh-ai-title">Fresh <em>AI</em></h1>
            <p>Research, reasoning, creation and execution — one intelligence layer across your Fresh workspace.</p>
          </div>
          <div className="fresh-ai-capability-row" aria-label="Fresh AI capabilities">
            {['Research', 'Reason', 'Proof', 'Create', 'Plan', 'Act'].map((item) => <span key={item}>{item}</span>)}
          </div>
        </section>

        <section className="fresh-ai-ask-card" aria-label="Start with Fresh AI">
          <div><strong>What should Fresh help you do?</strong><span>Fresh adapts to the workspace, device and task.</span></div>
          <button type="button" onClick={() => window.dispatchEvent(new CustomEvent("fresh-ai-open"))}>Open Fresh AI ↗</button>
        </section>

        <section className="fresh-ai-suggestion-section" aria-labelledby="fresh-ai-suggestions-title">
          <div className="fresh-ai-section-heading"><div><span>AI SUGGESTIONS</span><h2 id="fresh-ai-suggestions-title">Start anywhere</h2></div><small>Context-aware across Fresh</small></div>
          <div className="fresh-ai-suggestion-grid">
            {suggestions.map(([title, description]) => (
              <button key={title} type="button" className={activeSuggestion === title ? "active" : ""} onClick={() => chooseSuggestion(title, description)}>
                <span className="fresh-ai-suggestion-icon">✦</span><strong>{title}</strong><small>{description}</small>
              </button>
            ))}
          </div>
        </section>

        <section className="fresh-ai-dashboard-section" aria-label="Fresh AI command center">
          <div className="fresh-ai-section-heading"><div><span>COMMAND CENTER</span><h2>Intelligence at a glance</h2></div></div>
          <DashboardLayout />
        </section>
      </div>
    </DashboardProvider>
  );
}

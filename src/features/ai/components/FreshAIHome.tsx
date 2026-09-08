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

const intelligenceHorizon = [
  ["Extremely broad competence", "Outperform humans across nearly all intellectual tasks, not just a narrow specialty."],
  ["Reliable self-improvement", "Improve its own models, tools or architecture in a sustained way."],
  ["Advanced strategic planning", "Manage long-horizon goals and complex multi-step decisions beyond the best human performance."],
  ["Scientific and creative discovery", "Generate new theories, designs and solutions faster and more deeply than human researchers."],
  ["Wide transfer learning", "Apply knowledge across domains with little additional training."],
  ["Strong social and environmental understanding", "Operate effectively in human, cultural and real-world settings."],
  ["General cognitive superiority", "Exceed the best human minds across virtually all important cognitive domains."],
  ["Creative and strategic reasoning", "Produce novel ideas and long-term plans beyond top-human capability."],
  ["Fast adaptation", "Apply knowledge to new situations with little or no retraining."],
  ["Autonomous self-improvement", "Improve methods or architecture without requiring human help."],
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

        <section className="fresh-ai-horizon" aria-labelledby="fresh-ai-horizon-title">
          <details>
            <summary>
              <span><b>INTELLIGENCE HORIZON</b><strong id="fresh-ai-horizon-title">Beyond human-level intelligence</strong></span>
              <small>Hypothetical · no single agreed standard</small>
            </summary>
            <div className="fresh-ai-horizon-body">
              <p>If AI goes beyond superintelligence, there is no single agreed standard yet because that stage is still hypothetical. A more speculative post-ASI concept describes intelligence that not only exceeds humans but can reshape its own capabilities and environment at massive scale.</p>
              <p>The important distinction is that such a system would be judged not only by raw capability, but also by <strong>alignment, autonomy, resilience, integrity, morality, embodiment and embeddedness</strong> if it is to function safely in the world.</p>
              <div className="fresh-ai-horizon-grid">
                {intelligenceHorizon.map(([title, description]) => (
                  <article key={title}><strong>{title}</strong><span>{description}</span></article>
                ))}
              </div>
              <p className="fresh-ai-horizon-note"><strong>Consciousness is not required by many definitions.</strong> The main capability test is broad, human-exceeding performance across virtually all relevant intellectual domains.</p>
            </div>
          </details>
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

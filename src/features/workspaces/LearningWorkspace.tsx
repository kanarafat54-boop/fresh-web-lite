import { useState } from "react";
import { knowledgeGraph } from "../../core/fresh-ai/knowledge/knowledgeGraph";
import "./WorkspacePage.css";

const SEED_NODES = [
  { id: "ai", type: "topic", label: "Artificial Intelligence" },
  { id: "fresh", type: "project", label: "Fresh Web Lite" },
  { id: "design", type: "topic", label: "Design Systems" },
  { id: "treasury", type: "domain", label: "Fresh Treasury" },
];
const SEED_EDGES = [
  { id: "e1", from: "fresh", to: "ai", relation: "uses" },
  { id: "e2", from: "fresh", to: "design", relation: "applies" },
  { id: "e3", from: "fresh", to: "treasury", relation: "owns" },
];

SEED_NODES.forEach((n) => knowledgeGraph.addNode(n));
SEED_EDGES.forEach((e) => knowledgeGraph.addEdge(e));

const RELATION_LABEL: Record<string, string> = {
  uses: "uses",
  applies: "applies",
  owns: "owns",
  related: "relates to",
};

export default function LearningWorkspace() {
  const [selected, setSelected] = useState<string | null>("fresh");
  const nodes = knowledgeGraph.getNodes();
  const node = selected ? knowledgeGraph.getNode(selected) : undefined;
  const connections = selected ? knowledgeGraph.getConnections(selected) : [];

  return (
    <section className="workspace-page" aria-label="Learning workspace">
      <header className="workspace-hero">
        <span className="workspace-eyebrow">Learn · Knowledge · Academy</span>
        <h1>Fresh Academy</h1>
        <p>
          Explore the connected knowledge graph. Fresh turns what you learn into a living,
          queryable map of topics, projects, and the relationships between them.
        </p>
      </header>

      <section className="workspace-section">
        <h2>Knowledge map</h2>
        <div className="workspace-grid">
          {nodes.map((n) => (
            <button
              key={n.id}
              className={`workspace-card ${selected === n.id ? "workspace-pill" : ""}`}
              onClick={() => setSelected(n.id)}
            >
              <h3>{n.label}</h3>
              <p>{n.type}</p>
            </button>
          ))}
        </div>
      </section>

      {node && (
        <section className="workspace-section">
          <h2>Relationships — {node.label}</h2>
          {connections.length === 0 ? (
            <p className="workspace-empty">No relationships recorded yet.</p>
          ) : (
            <ul className="workspace-list">
              {connections.map((e) => {
                const otherId = e.from === node.id ? e.to : e.from;
                const other = knowledgeGraph.getNode(otherId);
                const direction = e.from === node.id ? "→" : "←";
                return (
                  <li key={e.id}>
                    <h3>{other?.label ?? otherId}</h3>
                    <p>{direction} {RELATION_LABEL[e.relation] ?? e.relation}</p>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}
    </section>
  );
}

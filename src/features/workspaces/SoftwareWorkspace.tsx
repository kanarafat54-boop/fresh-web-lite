import { useState } from "react";
import { ara6Engine } from "../../core/ara6/engine";
import { ara6Orchestrator, type Workflow } from "../../core/ara6/orchestrator";
import { toolRegistry } from "../../core/ara6/toolRegistry";
import { capabilityRegistry } from "../../core/ara6/capabilityRegistry";
import "../../core/ara6/defaultTools";
import "../../core/ara6/defaultCapabilities";
import type { AraTask } from "../../core/ara6/task";
import "./WorkspacePage.css";

const WORKFLOW_SEED: Workflow = {
  id: "wf-seed",
  name: "Fresh boot",
  description: "Initialize the Fresh runtime on first launch",
  tasks: [],
  status: "completed",
  createdAt: new Date().toISOString(),
};

if (ara6Orchestrator.listWorkflows().length === 0) {
  ara6Orchestrator.createWorkflow(WORKFLOW_SEED);
}

export default function SoftwareWorkspace() {
  const [title, setTitle] = useState("");
  const [tick, setTick] = useState(0);

  const workflows = ara6Orchestrator.listWorkflows();
  const tasks = ara6Engine.list();
  const tools = toolRegistry.list();
  const capabilities = capabilityRegistry.list();

  function addTask() {
    const trimmed = title.trim();
    if (!trimmed) return;
    const task: AraTask = {
      id: `t-${Date.now()}`,
      title: trimmed,
      description: "Created from Software workspace",
      ecosystem: "developer",
      status: "pending",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    ara6Engine.create(task);
    setTitle("");
    setTick((t) => t + 1);
  }

  function runTask(id: string) {
    ara6Engine.start(id);
    setTick((t) => t + 1);
  }

  function completeTask(id: string) {
    ara6Engine.complete(id);
    setTick((t) => t + 1);
  }

  void tick;

  return (
    <section className="workspace-page" aria-label="Software workspace">
      <header className="workspace-hero">
        <span className="workspace-eyebrow">Ara6 · Build · Orchestrate</span>
        <h1>Software Studio</h1>
        <p>
          Build and orchestrate with the Ara6 runtime — create tasks, run workflows, and inspect the
          registered tools and capabilities that power the Fresh ecosystem.
        </p>
      </header>

      <section className="workspace-section">
        <h2>Registered tools</h2>
        <div className="workspace-grid">
          {tools.map((t) => (
            <div key={t.id} className="workspace-card">
              <h3>{t.name}</h3>
              <p>{t.description}</p>
              <div className="workspace-meta">
                <span className="workspace-badge">{t.category}</span>
                <span className="workspace-badge">v{t.version}</span>
                <span className={`workspace-pill ${t.enabled ? "" : "workspace-badge"}`}>
                  {t.enabled ? "enabled" : "disabled"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="workspace-section">
        <h2>Capabilities</h2>
        <ul className="workspace-list">
          {capabilities.map((c) => (
            <li key={c.id}>
              <h3>{c.name}</h3>
              <p>{c.description}</p>
              <div className="workspace-meta">
                {c.tools.map((tool) => (
                  <span key={tool} className="workspace-badge">{tool}</span>
                ))}
                {c.ecosystems.map((eco) => (
                  <span key={eco} className="workspace-pill">{eco}</span>
                ))}
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="workspace-section">
        <h2>Workflows</h2>
        <ul className="workspace-list">
          {workflows.map((w) => (
            <li key={w.id}>
              <h3>{w.name}</h3>
              <p>{w.description}</p>
              <div className="workspace-meta">
                <span className={`workspace-pill ${w.status === "completed" ? "" : "workspace-badge"}`}>
                  {w.status}
                </span>
                <span className="workspace-badge">{w.tasks.length} tasks</span>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="workspace-section">
        <h2>Tasks</h2>
        <div className="workspace-card" style={{ display: "flex", gap: 8 }}>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="New task title…"
            aria-label="New task title"
            style={{ flex: 1, background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text)", padding: "8px 10px" }}
          />
          <button className="workspace-pill" onClick={addTask}>Add</button>
        </div>
        {tasks.length === 0 ? (
          <p className="workspace-empty">No tasks yet. Add one above to drive the Ara6 engine.</p>
        ) : (
          <ul className="workspace-list">
            {tasks.map((t) => (
              <li key={t.id}>
                <h3>{t.title}</h3>
                <p>{t.description}</p>
                <div className="workspace-meta">
                  <span className={`workspace-pill ${t.status === "completed" ? "" : "workspace-badge"}`}>{t.status}</span>
                  {t.status === "pending" && (
                    <button className="workspace-badge" onClick={() => runTask(t.id)}>Run</button>
                  )}
                  {t.status === "running" && (
                    <button className="workspace-badge" onClick={() => completeTask(t.id)}>Complete</button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}

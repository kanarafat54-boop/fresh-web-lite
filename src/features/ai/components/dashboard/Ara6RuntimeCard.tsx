import { intelligenceConnectors } from "../../intelligence";
import { toolRegistry } from "../../../../core/ara6/toolRegistry";
import { capabilityRegistry } from "../../../../core/ara6/capabilityRegistry";
import { evolutionGraph } from "../../../../core/ara6/evolution/evolutionGraph";
import "../../../../core/ara6/bootstrap";

export default function Ara6RuntimeCard() {
  const tools = toolRegistry.list();
  const capabilities = capabilityRegistry.list();
  const evolution = evolutionGraph.getAll();
  const connectors = intelligenceConnectors.health();

  return (
    <section className="runtime-card">
      <h2>Ara6 Runtime</h2>

      <h3>Intelligence connectors</h3>
      <ul>
        {connectors.map((c) => (
          <li key={c.id}>
            {c.available ? "🟢" : "🔴"} {c.name}
            <small style={{ display: "block", color: "#94a3b8" }}>
              {c.available ? "available" : "not configured"} · {c.tasks.join(", ")}
            </small>
          </li>
        ))}
      </ul>

      <h3>Registered tools</h3>
      <ul>
        {tools.length === 0 ? (
          <li>⚪ No tools registered</li>
        ) : (
          tools.map((t) => (
            <li key={t.id}>
              {t.enabled ? "🟢" : "⚪"} {t.name}
              <small style={{ display: "block", color: "#94a3b8" }}>{t.category}</small>
            </li>
          ))
        )}
      </ul>

      <h3>Capabilities</h3>
      <ul>
        {capabilities.length === 0 ? (
          <li>⚪ No capabilities registered</li>
        ) : (
          capabilities.map((c) => (
            <li key={c.id}>
              🟢 {c.name}
              <small style={{ display: "block", color: "#94a3b8" }}>{c.ecosystems.join(", ")}</small>
            </li>
          ))
        )}
      </ul>

      <h3>Evolution</h3>
      <ul>
        {evolution.length === 0 ? (
          <li>⚪ No evolution nodes</li>
        ) : (
          evolution.map((n) => (
            <li key={n.id}>
              🟢 {n.title} <small style={{ color: "#94a3b8" }}>v{n.version}</small>
              <small style={{ display: "block", color: "#94a3b8" }}>{n.description}</small>
            </li>
          ))
        )}
      </ul>
    </section>
  );
}

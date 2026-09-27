import "./WorkspacePage.css";

export type EcosystemDomain = {
  id: string;
  title: string;
  description: string;
  status?: "live" | "surface" | "pending";
};

export type EcosystemSurfaceProps = {
  name: string;
  eyebrow: string;
  description: string;
  domains: EcosystemDomain[];
  note?: string;
};

/**
 * Real ecosystem entry surface — domains are listed honestly.
 * Status: live = wired data path; surface = UI only; pending = not built.
 * No invented balances, listings, or success states.
 */
export default function EcosystemSurface({
  name,
  eyebrow,
  description,
  domains,
  note,
}: EcosystemSurfaceProps) {
  return (
    <section className="workspace-page" aria-label={`${name} ecosystem`}>
      <header className="workspace-hero">
        <span className="workspace-eyebrow">{eyebrow}</span>
        <h1>{name}</h1>
        <p>{description}</p>
      </header>

      <section className="workspace-section">
        <h2>Domains</h2>
        <div className="workspace-grid">
          {domains.map((d) => (
            <article key={d.id} className="workspace-card">
              <h3>{d.title}</h3>
              <p>{d.description}</p>
              <div className="workspace-meta">
                <span className="workspace-badge">{statusLabel(d.status)}</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      {note ? (
        <section className="workspace-section">
          <p className="workspace-empty" style={{ textAlign: "left", padding: "8px 0" }}>
            {note}
          </p>
        </section>
      ) : null}
    </section>
  );
}

function statusLabel(status?: EcosystemDomain["status"]): string {
  if (status === "live") return "Live";
  if (status === "surface") return "Surface";
  return "Pending";
}

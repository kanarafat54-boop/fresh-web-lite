import "./WorkspacePage.css";

export type EcosystemPlaceholderProps = {
  name: string;
  description: string;
};

/**
 * Honest scaffold for a scoped-but-unbuilt ecosystem. No fake data, no
 * simulated success states — this exists only so Fresh Web Lite's real
 * build surface (what's real vs. hollow vs. missing) is visible, per the
 * TRUEMODE non-negotiable truth rules.
 */
export default function EcosystemPlaceholder({ name, description }: EcosystemPlaceholderProps) {
  return (
    <section className="workspace-page" aria-label={`${name} workspace`}>
      <header className="workspace-hero">
        <span className="workspace-eyebrow">Scoped · Not yet built</span>
        <h1>{name}</h1>
        <p>{description}</p>
      </header>
      <section className="workspace-section">
        <p className="workspace-empty">
          This ecosystem is scoped but has no real implementation yet — no backend, no data model,
          no logic behind this screen. It's visible here so the platform's actual scale is honest,
          not simulated.
        </p>
      </section>
    </section>
  );
}

import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../lib/supabase";
import {
  FRESH_PHASES_15_24,
  FRESH_PLATFORM_CAPABILITIES,
  type FreshPlatformPhase,
} from "../../core/platform/freshUniversalPlatformFabric";
import { saveFreshContext } from "../../core/platform/freshPlatformRuntime";
import "./WorkspacePage.css";

export default function UniversalPlatformWorkspace() {
  const [phase, setPhase] = useState<FreshPlatformPhase>(15);
  const [userId, setUserId] = useState<string | null>(null);
  const active = useMemo(() => FRESH_PHASES_15_24.find((item) => item.phase === phase), [phase]);

  useEffect(() => {
    let mounted = true;
    void supabase.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      const id = data.user?.id ?? null;
      setUserId(id);
      if (id) {
        void saveFreshContext({ userId: id, world: "platform", context: { phase } });
      }
    });
    return () => { mounted = false; };
  }, [phase]);

  return (
    <section className="workspace-page" aria-label="Fresh universal platform">
      <header className="workspace-hero">
        <span className="workspace-eyebrow">Fresh Web Lite · Universal Platform</span>
        <h1>One platform. Ten connected layers.</h1>
        <p>Infrastructure, data, identity, intelligence, agents, media, discovery, search, communication and work share one runtime contract.</p>
      </header>

      <section className="workspace-section">
        <div className="workspace-grid">
          {FRESH_PHASES_15_24.map((item) => (
            <button
              key={item.phase}
              type="button"
              className="workspace-card"
              aria-pressed={phase === item.phase}
              onClick={() => setPhase(item.phase)}
            >
              <strong>Phase {item.phase}</strong>
              <h3>{item.name}</h3>
              <p>Steps {item.steps[0]}–{item.steps[item.steps.length - 1]}</p>
            </button>
          ))}
        </div>
      </section>

      {active && (
        <section className="workspace-section">
          <h2>{active.name}</h2>
          <div className="workspace-grid">
            {FRESH_PLATFORM_CAPABILITIES.filter((entry) => entry.phase === phase).map((entry) => (
              <article key={entry.step} className="workspace-card">
                <span className="workspace-badge">Step {entry.step}</span>
                <h3>{entry.id}</h3>
                <p>{entry.contract} · {entry.target}</p>
              </article>
            ))}
          </div>
        </section>
      )}

      {!userId && <p className="workspace-empty">Sign in to persist platform context and activity across ecosystems.</p>}
    </section>
  );
}

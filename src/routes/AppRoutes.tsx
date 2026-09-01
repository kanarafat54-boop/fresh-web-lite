import { useMemo, useState } from "react";
import AppLayout from "../layouts/AppLayout";
import { freshHomeDirections, getDirectionEcosystems, type FreshHomeDirectionId } from "../core/platform/freshHomeDirections";

export default function AppRoutes() {
  const [activeDirection, setActiveDirection] = useState<FreshHomeDirectionId | null>(null);
  const ecosystems = useMemo(
    () => (activeDirection ? getDirectionEcosystems(activeDirection) : []),
    [activeDirection],
  );

  return (
    <AppLayout>
      <section className="fresh-home" aria-labelledby="fresh-home-title">
        <header>
          <p className="fresh-home-kicker">Fresh Web Lite</p>
          <h1 id="fresh-home-title">What do you want to do?</h1>
          <p>Six simple directions into a much larger connected system.</p>
        </header>

        <nav className="fresh-home-directions" aria-label="Fresh directions">
          {freshHomeDirections.map((direction) => (
            <button
              key={direction.id}
              type="button"
              className="fresh-home-direction"
              aria-label={`${direction.label}: ${direction.description}`}
              aria-expanded={activeDirection === direction.id}
              onClick={() => setActiveDirection((current) => current === direction.id ? null : direction.id)}
            >
              <span className="fresh-home-direction-title">{direction.label}</span>
              <span className="fresh-home-direction-description">{direction.description}</span>
            </button>
          ))}
        </nav>

        {activeDirection && (
          <section className="fresh-home-discovery" aria-label={`${activeDirection} discovery`}>
            <h2>{freshHomeDirections.find((direction) => direction.id === activeDirection)?.label}</h2>
            <p>Explore what this direction connects to.</p>
            <div className="fresh-home-ecosystems">
              {ecosystems.map((entry) => (
                <article key={entry.id} className="fresh-home-ecosystem">
                  <h3>{entry.canonicalService}</h3>
                  <span>{entry.status}</span>
                </article>
              ))}
            </div>
          </section>
        )}
      </section>
    </AppLayout>
  );
}

import { FeatureRegistry } from "../registry/FeatureRegistry";
import { useLayout } from "../contexts/useLayout";

export default function BottomNav() {
  const { activeRoute, setActiveRoute } = useLayout();

  return (
    <nav className="app-nav">
      {FeatureRegistry.getNavEntries().map((f) => (
        <button
          key={f.id}
          className={activeRoute === f.id ? "nav-btn active" : "nav-btn"}
          onClick={() => setActiveRoute(f.id)}
        >
          <span>{f.name}</span>
        </button>
      ))}
    </nav>
  );
}

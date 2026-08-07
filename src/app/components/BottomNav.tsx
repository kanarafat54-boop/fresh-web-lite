import { FeatureRegistry } from "../registry/FeatureRegistry";
import { useLayout } from "../contexts/LayoutContext";

export default function BottomNav() {
  const { activeRoute, setActiveRoute } = useLayout();

  const entries = FeatureRegistry.getNavEntries();

  return (
    <nav className="bottom-nav">
      {entries.map((feature) => (
        <button
          key={feature.id}
          className={activeRoute === feature.id ? "active" : ""}
          onClick={() => setActiveRoute(feature.id)}
        >
          {feature.icon ? feature.icon({ size: 18 }) : "•"} {feature.name}
        </button>
      ))}
    </nav>
  );
}

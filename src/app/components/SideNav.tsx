import { FeatureRegistry } from "../registry/FeatureRegistry";
import { useLayout } from "../contexts/LayoutContext";

export default function SideNav() {
  const { activeRoute, setActiveRoute } = useLayout();

  const features = FeatureRegistry.getNavEntries();

  return (
    <aside className="side-nav">
      <nav>
        {features.map((feature) => (
          <button
            key={feature.id}
            className={activeRoute === feature.id ? "active" : ""}
            onClick={() => setActiveRoute(feature.id)}
          >
            {feature.name}
          </button>
        ))}
      </nav>
    </aside>
  );
}

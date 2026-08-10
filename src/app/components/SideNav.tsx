import { FeatureRegistry } from "../registry/FeatureRegistry";
import { useLayout } from "../contexts/useLayout";

export default function SideNav() {
  const { sidebarOpen, activeRoute, setActiveRoute } = useLayout();
  if (!sidebarOpen) return null;

  return (
    <nav className="app-nav" style={{ position: "static", flexDirection: "column" }}>
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

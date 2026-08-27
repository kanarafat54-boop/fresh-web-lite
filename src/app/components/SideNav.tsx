import { useState } from "react";
import { useLayout } from "../contexts/useLayout";
import { useFeaturePreferences } from "../registry/useFeaturePreferences";
import FeatureOrganizer from "./FeatureOrganizer";

export default function SideNav() {
  const { sidebarOpen, activeRoute, setActiveRoute } = useLayout();
  const { navEntries } = useFeaturePreferences();
  const [organizerOpen, setOrganizerOpen] = useState(false);
  if (!sidebarOpen) return null;

  return (
    <nav className="app-nav" style={{ position: "static", flexDirection: "column" }}>
      {navEntries.map((f) => (
        <button
          key={f.id}
          className={activeRoute === f.id ? "nav-btn active" : "nav-btn"}
          onClick={() => setActiveRoute(f.id)}
        >
          <span>{f.name}</span>
        </button>
      ))}
      <button className="nav-btn" onClick={() => setOrganizerOpen(true)} aria-label="Organize features">
        <span>⚙ Organize</span>
      </button>
      <FeatureOrganizer open={organizerOpen} onClose={() => setOrganizerOpen(false)} />
    </nav>
  );
}

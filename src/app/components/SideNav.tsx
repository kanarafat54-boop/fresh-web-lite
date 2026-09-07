import { useState } from "react";
import { HomeIcon, FeedIcon, PlusIcon, AIIcon, SearchIcon, SettingsIcon, UserPlusIcon, BookmarkIcon } from "../../components/Icons";
import { useLayout } from "../contexts/useLayout";
import { useFeaturePreferences } from "../registry/useFeaturePreferences";
import FeatureOrganizer from "./FeatureOrganizer";
import "./SideNav.css";

const iconFor = (id: string) => {
  if (id === "feed" || id === "fresh-flow") return HomeIcon;
  if (id.includes("search")) return SearchIcon;
  if (id.includes("connect") || id.includes("group") || id.includes("community")) return UserPlusIcon;
  if (id.includes("save") || id.includes("bookmark") || id.includes("memory")) return BookmarkIcon;
  if (id.includes("ai") || id.includes("ara") || id.includes("learn")) return AIIcon;
  if (id.includes("create") || id.includes("creator")) return PlusIcon;
  if (id.includes("setting") || id.includes("privacy")) return SettingsIcon;
  return FeedIcon;
};

export default function SideNav() {
  const { sidebarOpen, activeRoute, setActiveRoute } = useLayout();
  const { navEntries } = useFeaturePreferences();
  const [organizerOpen, setOrganizerOpen] = useState(false);
  if (!sidebarOpen) return null;

  return (
    <aside className="fresh-side-nav" aria-label="Fresh ecosystem navigation">
      <div className="fresh-side-brand"><div className="fresh-side-brand-mark" aria-hidden="true">F</div><div className="fresh-side-brand-copy"><strong>Fresh</strong><span>Your digital ecosystem</span></div></div>
      <div className="fresh-side-section">Ecosystem</div>
      <div className="fresh-side-list">
        {navEntries.map((f) => { const Icon = iconFor(f.id); const active = activeRoute === f.id; return <button key={f.id} type="button" className={`fresh-side-item${active ? " active" : ""}`} aria-current={active ? "page" : undefined} onClick={() => setActiveRoute(f.id)}><span className="fresh-side-icon" aria-hidden="true"><Icon size={19} /></span><span>{f.name}</span>{active && <span className="fresh-side-dot" aria-hidden="true" />}</button>; })}
      </div>
      <div className="fresh-side-footer"><button className="fresh-side-item" type="button" onClick={() => setOrganizerOpen(true)}><span className="fresh-side-icon" aria-hidden="true"><SettingsIcon size={19} /></span><span>Customize</span></button></div>
      <FeatureOrganizer open={organizerOpen} onClose={() => setOrganizerOpen(false)} />
    </aside>
  );
}

import { useLayout } from "../contexts/useLayout";
import "./DesktopSidebar.css";
type NavItem = { id: string; label: string; icon: string };
const primary: NavItem[] = [
  { id: "feed", label: "Home", icon: "⌂" }, { id: "fresh-flow", label: "Flow", icon: "✦" }, { id: "work", label: "Work", icon: "▦" }, { id: "studio", label: "Create", icon: "＋" }, { id: "saved", label: "Saved", icon: "◷" },
];
const explore: NavItem[] = [
  { id: "connect", label: "Connect", icon: "◌" }, { id: "learn", label: "Academy", icon: "◎" }, { id: "marketplace", label: "Marketplace", icon: "◇" },
];
export default function DesktopSidebar() {
  const { activeRoute, setActiveRoute } = useLayout();
  const go = (id: string) => setActiveRoute(id);\n  const isActive = (id: string) => id === "fresh-flow" ? Boolean(activeRoute?.startsWith("fresh-flow")) : activeRoute === id;
  return <aside className="fresh-desktop-sidebar" aria-label="Fresh workspace navigation">
    <div className="fresh-sidebar-workspace"><div className="fresh-sidebar-mark">F</div><div><strong>Fresh</strong><span>Everything connected</span></div></div>
    <button className="fresh-sidebar-create" type="button" onClick={() => go("studio")}><span>＋</span><strong>Create</strong><kbd>⌘ N</kbd></button>
    <div className="fresh-sidebar-scroll">
      <div className="fresh-sidebar-group"><span className="fresh-sidebar-label">Main</span>{primary.map(item => <button key={item.id} type="button" className={`fresh-sidebar-item ${isActive(item.id) ? "active" : ""}`} onClick={() => go(item.id)} aria-current={isActive(item.id) ? "page" : undefined}><i aria-hidden="true">{item.icon}</i><span>{item.label}</span></button>)}</div>
      <div className="fresh-sidebar-group"><span className="fresh-sidebar-label">Explore</span>{explore.map(item => <button key={item.id} type="button" className={`fresh-sidebar-item ${activeRoute === item.id ? "active" : ""}`} onClick={() => go(item.id)} aria-current={activeRoute === item.id ? "page" : undefined}><i aria-hidden="true">{item.icon}</i><span>{item.label}</span></button>)}</div>
    </div>
    <div className="fresh-sidebar-footer"><button type="button" onClick={() => go("settings")}><span>⚙</span><span>Settings</span></button><button type="button" onClick={() => go("profile")}><span className="fresh-sidebar-avatar">M</span><span className="fresh-sidebar-profile-copy"><strong>Profile</strong><small>Account & preferences</small></span><span>›</span></button></div>
  </aside>;
}

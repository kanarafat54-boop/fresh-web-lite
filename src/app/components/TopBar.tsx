import { useState } from "react";
import { BellIcon, ChevronDownIcon, SearchIcon, SettingsIcon } from "../../components/Icons";
import { useLayout } from "../contexts/useLayout";
import { useFreshId } from "../../features/fresh-id/context/FreshIdContext";
import { AuthForm } from "../../features/fresh-id/components/AuthForm";
import "../../features/fresh-flow/components/FreshFlowReferenceShell.css";
import "./TopBar.css";

export default function TopBar() {
  const { toggleSidebar, setActiveRoute, notifications, openNotifications, openSearch, activeRoute } = useLayout();
  const { isAuthenticated, setAuthView } = useFreshId();
  const [showAuth, setShowAuth] = useState(false);
  const isFreshFlow = typeof activeRoute === "string" && activeRoute.startsWith("fresh-flow");

  function openAuth() { setAuthView("form"); setShowAuth(true); }
  function openProfile() { if (isAuthenticated) setActiveRoute("profile"); else openAuth(); }
  const authOverlay = showAuth && !isAuthenticated ? (
    <div className="auth-overlay" role="dialog" aria-modal="true" aria-label="Fresh ID authentication" onClick={(event) => { if (event.target === event.currentTarget) setShowAuth(false); }}>
      <div className="auth-modal"><button className="back-btn" onClick={() => setShowAuth(false)} aria-label="Close authentication">×</button><AuthForm /></div>
    </div>
  ) : null;

  if (isFreshFlow) return (
    <>
      <header className="fresh-topbar" aria-label="Fresh Flow top navigation">
        <div className="fresh-topbar-brand"><button className="fresh-topbar-tool" onClick={toggleSidebar} aria-label="Open navigation"><span>☰</span></button><div className="fresh-topbar-logo" aria-label="FWL">FWL</div><div><div className="fresh-topbar-title">FRESH WEB <span>LITE</span></div><div className="fresh-topbar-subtitle">The Universal AI Platform</div></div></div>
        <div className="fresh-topbar-actions" aria-label="Fresh Flow tools"><button className="fresh-topbar-tool" onClick={openSearch} aria-label="Search"><SearchIcon size={19} /></button><button className="fresh-topbar-tool" onClick={() => openNotifications()} aria-label="Notifications"><BellIcon size={19} /></button><button className="fresh-topbar-tool" aria-label="Language"><span>文</span></button></div>
        <button className="fresh-topbar-avatar" onClick={openProfile} aria-label={isAuthenticated ? "Profile" : "Sign in"}><span aria-hidden="true">👤</span><span className="fresh-topbar-online" aria-hidden="true" /></button>
      </header>
      <div className="fresh-flow-reference-header"><button type="button" className="fresh-flow-search" onClick={openSearch} aria-label="Search anything on Fresh"><span className="fresh-flow-search-icon"><SearchIcon size={17} /></span><span>Search anything on Fresh...</span></button><button type="button" className="fresh-flow-reference-more" onClick={toggleSidebar} aria-label="More Fresh Flow navigation"><span>•••</span><span>⌁</span></button></div>
      {authOverlay}
    </>
  );

  return (
    <>
      <header className="fresh-universal-topbar" aria-label="Fresh universal navigation">
        <div className="fresh-universal-brand"><button className="fresh-universal-menu" type="button" onClick={toggleSidebar} aria-label="Open Fresh ecosystem navigation"><span>☰</span></button><button className="fresh-universal-logo" type="button" onClick={() => setActiveRoute("feed")} aria-label="Fresh home">F</button><div className="fresh-universal-brand-copy"><strong>Fresh</strong><span>Universal ecosystem</span></div></div>
        <button className="fresh-universal-search" type="button" onClick={openSearch} aria-label="Search Fresh"><SearchIcon size={18} /><span>Search people, work, learning, creators, marketplace…</span><kbd>⌘ K</kbd></button>
        <nav className="fresh-universal-actions" aria-label="Quick actions"><button type="button" onClick={() => setActiveRoute("create")} aria-label="Create" title="Create"><span>＋</span></button><button type="button" onClick={openNotifications} aria-label="Notifications" title="Notifications"><BellIcon size={19} />{notifications.length > 0 && <i aria-hidden="true">{Math.min(notifications.length, 9)}</i>}</button><button type="button" onClick={() => setActiveRoute("settings")} aria-label="Settings" title="Settings"><SettingsIcon size={19} /></button><button className="fresh-universal-profile" type="button" onClick={openProfile} aria-label={isAuthenticated ? "Open profile" : "Sign in"} title={isAuthenticated ? "Profile" : "Sign in"}><span className="fresh-universal-avatar" aria-hidden="true">{isAuthenticated ? "M" : "?"}</span><ChevronDownIcon size={14} /></button></nav>
      </header>
      {authOverlay}
    </>
  );
}

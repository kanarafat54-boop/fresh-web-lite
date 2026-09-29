import { useState } from "react";
import { BellIcon, ChevronDownIcon, SearchIcon, SettingsIcon } from "../../components/Icons";
import { useLayout } from "../contexts/useLayout";
import { useFreshId } from "../../features/fresh-id/context/FreshIdContext";
import { AuthForm } from "../../features/fresh-id/components/AuthForm";
import "../../features/fresh-flow/components/FreshFlowReferenceShell.css";
import "./TopBar.css";

export default function TopBar() {
  const { toggleSidebar, setActiveRoute, notifications, openNotifications, openSearch } = useLayout();
  const { isAuthenticated, setAuthView } = useFreshId();
  const [showAuth, setShowAuth] = useState(false);
  function openAuth() { setAuthView("form"); setShowAuth(true); }
  function openProfile() { if (isAuthenticated) setActiveRoute("profile"); else openAuth(); }
  const authOverlay = showAuth && !isAuthenticated ? (
    <div className="auth-overlay" role="dialog" aria-modal="true" aria-label="Fresh ID authentication" onClick={(event) => { if (event.target === event.currentTarget) setShowAuth(false); }}>
      <div className="auth-modal"><button className="back-btn" onClick={() => setShowAuth(false)} aria-label="Close authentication">×</button><AuthForm /></div>
    </div>
  ) : null;

  function openCreate() { setActiveRoute("studio"); }

  return (
    <>
      <header className="fresh-universal-topbar" aria-label="Fresh universal navigation">
        <div className="fresh-universal-brand"><button className="fresh-universal-menu" type="button" onClick={toggleSidebar} aria-label="Open Fresh ecosystem navigation"><span>☰</span></button><button className="fresh-universal-logo" type="button" onClick={() => setActiveRoute("feed")} aria-label="Fresh home">F</button><button className="fresh-universal-brand-copy" type="button" onClick={() => setActiveRoute("feed")} aria-label="Open Fresh home"><strong>Fresh</strong><span>Universal ecosystem</span></button></div>
        <button className="fresh-universal-search" type="button" onClick={openSearch} aria-label="Search Fresh"><SearchIcon size={18} /><span>Search anything across Fresh…</span><kbd>⌘ K</kbd></button>
        <div className="fresh-universal-workspace" aria-label="Current workspace"><span className="fresh-workspace-dot" /> <span>Personal workspace</span><ChevronDownIcon size={14} /></div>
        <nav className="fresh-universal-actions" aria-label="Quick actions"><button type="button" onClick={openCreate} aria-label="Create" title="Create"><span>＋</span></button><button type="button" onClick={() => window.dispatchEvent(new CustomEvent("fresh-ai-open"))} aria-label="Open Fresh AI" title="Fresh AI"><span>✦</span></button><button type="button" onClick={openNotifications} aria-label="Notifications" title="Notifications"><BellIcon size={19} />{notifications.length > 0 && <i aria-hidden="true">{Math.min(notifications.length, 9)}</i>}</button><button type="button" onClick={() => setActiveRoute("settings")} aria-label="Settings" title="Settings"><SettingsIcon size={19} /></button><button className="fresh-universal-profile" type="button" onClick={openProfile} aria-label={isAuthenticated ? "Open profile" : "Sign in"} title={isAuthenticated ? "Profile" : "Sign in"}><span className="fresh-universal-avatar" aria-hidden="true">{isAuthenticated ? "M" : "?"}</span><ChevronDownIcon size={14} /></button></nav>
      </header>
      {authOverlay}
    </>
  );
}

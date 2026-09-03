import { useState } from "react";
import { useLayout } from "../contexts/useLayout";
import { useFreshId } from "../../features/fresh-id/context/FreshIdContext";
import { AuthForm } from "../../features/fresh-id/components/AuthForm";
import "../../features/fresh-flow/components/FreshFlowReferenceShell.css";

/**
 * Persistent global shell controls.
 * Fresh Flow uses the supplied reference header exactly as its visual contract;
 * other ecosystems keep the existing compact shell.
 */
export default function TopBar() {
  const { toggleSidebar, setActiveRoute, notifications, openNotifications, openSearch, activeRoute } = useLayout();
  const { isAuthenticated, setAuthView } = useFreshId();
  const [showAuth, setShowAuth] = useState(false);
  const isFreshFlow = typeof activeRoute === "string" && activeRoute.startsWith("fresh-flow");

  function openAuth() {
    setAuthView("form");
    setShowAuth(true);
  }

  function openProfile() {
    if (isAuthenticated) setActiveRoute("profile");
    else openAuth();
  }

  if (isFreshFlow) {
    return (
      <>
        <header className="fresh-topbar" aria-label="Fresh Flow top navigation">
          <div className="fresh-topbar-brand">
            <button className="fresh-topbar-tool" onClick={toggleSidebar} aria-label="Open navigation"><span>☰</span></button>
            <div className="fresh-topbar-logo" aria-label="FWL">FWL</div>
            <div>
              <div className="fresh-topbar-title">FRESH WEB <span>LITE</span></div>
              <div className="fresh-topbar-subtitle">The Universal AI Platform</div>
            </div>
          </div>

          <div className="fresh-topbar-actions" aria-label="Fresh Flow tools">
            <button className="fresh-topbar-tool" onClick={openSearch} aria-label="Search"><span>⌕</span></button>
            <button className="fresh-topbar-tool" onClick={() => openNotifications()} aria-label={`Notifications${notifications.length ? `, ${notifications.length} unread` : ""}`}><span>♧</span></button>
            <button className="fresh-topbar-tool" aria-label="Language"><span>文</span></button>
          </div>

          <button className="fresh-topbar-avatar" onClick={openProfile} aria-label={isAuthenticated ? "Profile" : "Sign in"}>
            <span aria-hidden="true">👤</span>
            <span className="fresh-topbar-online" aria-hidden="true" />
          </button>
        </header>

        <div className="fresh-flow-reference-header">
          <button type="button" className="fresh-flow-search" onClick={openSearch} aria-label="Search anything on Fresh">
            <span className="fresh-flow-search-icon">⌕</span>
            <span>Search anything on Fresh...</span>
          </button>
          <button type="button" className="fresh-flow-reference-more" onClick={toggleSidebar} aria-label="More Fresh Flow navigation">
            <span>•••</span><span>⌁</span>
          </button>
        </div>

        {showAuth && !isAuthenticated && (
          <div className="auth-overlay" role="dialog" aria-modal="true" aria-label="Fresh ID authentication" onClick={(event) => { if (event.target === event.currentTarget) setShowAuth(false); }}>
            <div className="auth-modal">
              <button className="back-btn" onClick={() => setShowAuth(false)} aria-label="Close authentication">×</button>
              <AuthForm />
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <div className="top-bar" style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", width: "100%" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", justifySelf: "start" }}>
          <button className="icon-only-btn" onClick={toggleSidebar} aria-label="Open navigation">☰</button>
          <button className="icon-only-btn" onClick={openProfile} aria-label={isAuthenticated ? "Profile" : "Sign in"}>👤</button>
        </div>
        <button className="icon-only-btn" onClick={openNotifications} aria-label={`Notifications${notifications.length > 0 ? `, ${notifications.length} unread` : ""}`} style={{ position: "relative", justifySelf: "center" }}>🔔</button>
        <button className="icon-only-btn" onClick={() => setActiveRoute("wallet")} aria-label="Wallet" style={{ justifySelf: "end" }}>💳</button>
      </div>
      {showAuth && !isAuthenticated && (
        <div className="auth-overlay" role="dialog" aria-modal="true" aria-label="Fresh ID authentication" onClick={(event) => { if (event.target === event.currentTarget) setShowAuth(false); }}>
          <div className="auth-modal">
            <button className="back-btn" onClick={() => setShowAuth(false)} aria-label="Close authentication">×</button>
            <AuthForm />
          </div>
        </div>
      )}
    </>
  );
}

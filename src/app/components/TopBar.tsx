import { useState } from "react";
import { useLayout } from "../contexts/useLayout";
import { useFreshId } from "../../features/fresh-id/context/FreshIdContext";
import { AuthForm } from "../../features/fresh-id/components/AuthForm";

/**
 * Persistent global shell controls.
 *
 * Layout contract:
 * - left corner: hamburger/menu + profile
 * - center: notifications
 * - right corner: wallet
 * These controls remain available across ecosystems while the middle content
 * and contextual bottom navigation change.
 */
export default function TopBar() {
  const { toggleSidebar, setActiveRoute, notifications, openNotifications } = useLayout();
  const { isAuthenticated, setAuthView } = useFreshId();
  const [showAuth, setShowAuth] = useState(false);

  function openAuth() {
    setAuthView("form");
    setShowAuth(true);
  }

  function openProfile() {
    if (isAuthenticated) setActiveRoute("profile");
    else openAuth();
  }

  return (
    <>
      <div
        className="top-bar"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto 1fr",
          alignItems: "center",
          width: "100%",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", justifySelf: "start" }}>
          <button className="icon-only-btn" onClick={toggleSidebar} aria-label="Open navigation">☰</button>
          <button className="icon-only-btn" onClick={openProfile} aria-label={isAuthenticated ? "Profile" : "Sign in"}>
            👤
          </button>
        </div>

        <button
          className="icon-only-btn"
          onClick={openNotifications}
          aria-label={`Notifications${notifications.length > 0 ? `, ${notifications.length} unread` : ""}`}
          style={{ position: "relative", justifySelf: "center" }}
        >
          🔔
          {notifications.length > 0 && (
            <span
              aria-hidden="true"
              style={{
                position: "absolute",
                top: -2,
                right: -2,
                background: "var(--fresh-danger, #e0554f)",
                color: "white",
                borderRadius: "999px",
                fontSize: "0.65rem",
                lineHeight: 1.4,
                padding: "0 4px",
                minWidth: 14,
                textAlign: "center",
              }}
            >
              {notifications.length}
            </span>
          )}
        </button>

        <button className="icon-only-btn" onClick={() => setActiveRoute("wallet")} aria-label="Wallet" style={{ justifySelf: "end" }}>
          💳
        </button>
      </div>

      {showAuth && !isAuthenticated && (
        <div
          className="auth-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Fresh ID authentication"
          onClick={(event) => {
            if (event.target === event.currentTarget) setShowAuth(false);
          }}
        >
          <div className="auth-modal">
            <button className="back-btn" onClick={() => setShowAuth(false)} aria-label="Close authentication">×</button>
            <AuthForm />
          </div>
        </div>
      )}
    </>
  );
}

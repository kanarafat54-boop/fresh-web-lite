import { useState } from "react";
import { useLayout } from "../contexts/useLayout";
import { useFreshId } from "../../features/fresh-id/context/FreshIdContext";
import { AuthForm } from "../../features/fresh-id/components/AuthForm";

export default function TopBar() {
  const { toggleSidebar } = useLayout();
  const { user, isAuthenticated, isGuest, logout, setAuthView } = useFreshId();
  const [showAuth, setShowAuth] = useState(false);

  function openAuth() {
    setAuthView("form");
    setShowAuth(true);
  }

  return (
    <>
      <div className="top-bar">
        <button className="icon-only-btn" onClick={toggleSidebar} aria-label="Open navigation">☰</button>
        <span className="brand-name">Fresh Web Lite</span>
        <div className="top-bar-account">
          {isAuthenticated && user ? (
            <>
              <span className="post-username">@{user.username}</span>
              <button className="auth-tab" onClick={() => void logout()}>Log out</button>
            </>
          ) : (
            <button className="auth-submit-btn" onClick={openAuth}>
              {isGuest ? "Log in" : "Fresh ID"}
            </button>
          )}
        </div>
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

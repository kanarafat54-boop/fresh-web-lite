import AppRouter from "./AppRouter";
import { ThemeProvider, useTheme } from "./providers/ThemeProvider";
import { LayoutProvider } from "./contexts/LayoutProvider";
import FreshAIUnified from "./components/FreshAIUnified";
import "../index.css";
import "../core/design/primitives.css";
import { useProfileNav } from "../features/profile/context/ProfileNavContext";
import { ProfileView } from "../features/profile/components/ProfileView";

function GlobalProfileOverlay() {
  const { viewingUserId, closeProfile } = useProfileNav();
  if (!viewingUserId) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Fresh ID profile"
      className="fresh-profile-overlay"
      style={{ position: "fixed", inset: 0, zIndex: 1000, overflowY: "auto", background: "rgba(5,6,12,.88)", backdropFilter: "blur(12px)", padding: "max(10px, env(safe-area-inset-top)) 10px max(18px, env(safe-area-inset-bottom))" }}
      onClick={(event) => { if (event.target === event.currentTarget) closeProfile(); }}
    >
      <div style={{ width: "min(980px, 100%)", margin: "0 auto", borderRadius: 20, background: "var(--app-background, #0d0d12)", color: "var(--text-color, #f4f4fb)", minHeight: "calc(100dvh - 28px)" }}>
        <ProfileView userId={viewingUserId} onClose={closeProfile} />
      </div>
    </div>
  );
}

function GlobalThemeControl() {
  const { theme, setTheme } = useTheme();
  return (
    <div className="fresh-global-theme" role="group" aria-label="Fresh appearance">
      <button
        type="button"
        className={theme === "light" ? "is-active" : ""}
        onClick={() => setTheme("light")}
        aria-pressed={theme === "light"}
        aria-label="Use light mode"
        title="Light mode"
      >
        ☀
      </button>
      <button
        type="button"
        className={theme === "dark" ? "is-active" : ""}
        onClick={() => setTheme("dark")}
        aria-pressed={theme === "dark"}
        aria-label="Use dark mode"
        title="Dark mode"
      >
        ◐
      </button>
    </div>
  );
}

export default function AppShell() {
  return (
    <ThemeProvider>
      <LayoutProvider>
        <div className="app-shell-root">
          <AppRouter />
          <GlobalProfileOverlay />
          <GlobalThemeControl />
          <FreshAIUnified />
        </div>
      </LayoutProvider>
    </ThemeProvider>
  );
}

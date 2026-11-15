import AppRouter from "./AppRouter";
import { ThemeProvider } from "./providers/ThemeProvider";
import { LayoutProvider } from "./contexts/LayoutProvider";
import { useLayout } from "./contexts/useLayout";
import FreshAIUnified from "./components/FreshAIUnified";
import "../index.css";
import "../core/design/primitives.css";
import { useProfileNav } from "../features/profile/context/ProfileNavContext";
import { ProfileView } from "../features/profile/components/ProfileView";
import { useEffect } from "react";
import { parseShortDeepLink, withoutShortParam } from "../features/fresh-flow/core/shortDeepLink";
import { requestOpenShort } from "../features/fresh-flow/core/shortsExplore";

function GlobalFreshAIEntry() {
  const { activeRoute } = useLayout();
  const normalizedRoute = (activeRoute ?? "").replace(/\/+$/, "").toLowerCase();
  const isAI = ["ai", "/ai", "fresh-ai", "/fresh-ai"].includes(normalizedRoute) ||
    (typeof window !== "undefined" && ["/ai", "/fresh-ai"].includes(window.location.pathname.replace(/\/+$/, "").toLowerCase()));
  if (isAI) return null;
  return <FreshAIUnified />;
}

/** A link like /?short=<id> (from a push notification) opens that Short in the Shorts feed. */
function ShortDeepLinkHandler() {
  const { setActiveRoute } = useLayout();
  useEffect(() => {
    try {
      const id = parseShortDeepLink(window.location.search);
      if (!id) return;
      requestOpenShort(id);
      setActiveRoute("fresh-flow-shorts");
      window.history.replaceState(null, "", withoutShortParam(window.location.pathname, window.location.search, window.location.hash));
    } catch { /* a bad link just opens the app normally */ }
    // Runs once, when the app opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return null;
}

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

export default function AppShell() {
  return (
    <ThemeProvider>
      <LayoutProvider>
        <div className="app-shell-root">
          <AppRouter />
          <ShortDeepLinkHandler />
          <GlobalProfileOverlay />
          <GlobalFreshAIEntry />
        </div>
      </LayoutProvider>
    </ThemeProvider>
  );
}

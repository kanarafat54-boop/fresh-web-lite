import { useEffect } from "react";
import TopBar from "./components/TopBar";
import BottomNav from "./components/BottomNav";
import DesktopSidebar from "./components/DesktopSidebar";
import WorkspaceContextPanel from "./components/WorkspaceContextPanel";
import NotificationCenter from "./components/NotificationCenter";
import GlobalSearchEntry from "./components/GlobalSearchEntry";
import { FeatureRegistry } from "./registry/FeatureRegistry";
import { useLayout } from "./contexts/useLayout";
import { useFreshId } from "../features/fresh-id/context/FreshIdContext";
import { isOnboardingDone } from "../features/product-journey/productJourney";
import FeatureLoader from "./services/featureLoader";
import "./AppRouter.css";
import FreshPlatformRuntimeBoundary from "../core/platform/FreshPlatformRuntimeBoundary";

const isFreshFlowRoute = (route?: string) => Boolean(route && (route === "fresh-flow" || route.startsWith("fresh-flow-")));

const isGatewayPath = () => {
  if (typeof window === "undefined") return false;
  const path = window.location.pathname.replace(/\/+$/, "") || "/";
  return path === "/auth/sign-in" || path === "/auth/sign-up" || path.startsWith("/auth/") || path === "/welcome" || path === "/onboarding";
};

const gatewayFeatureId = (): string => {
  if (typeof window === "undefined") return "auth-signin";
  const path = window.location.pathname.replace(/\/+$/, "") || "/";
  if (path === "/welcome") return "welcome";
  if (path === "/onboarding") return "onboarding";
  if (path === "/auth/sign-up") return "auth-signup";
  return "auth-signin";
};

export default function AppRouter() {
  const { activeRoute, setActiveRoute } = useLayout();
  const { isAuthenticated, isGuest, loading: authLoading } = useFreshId();

  // Canonical cold-start journey: unauthenticated users see Welcome first;
  // authenticated users who have not completed onboarding see Onboarding.
  // Explicit gateway routes always win and are never redirected by this gate.
  useEffect(() => {
    if (authLoading || isGatewayPath() || typeof window === "undefined") return;
    const path = window.location.pathname.replace(/\/+$/, "") || "/";
    if (path !== "/") return;

    if (isAuthenticated && !isGuest && !isOnboardingDone()) {
      if (activeRoute !== "onboarding") setActiveRoute("onboarding");
      return;
    }

    if (!isAuthenticated && !isGuest) {
      let welcomeSeen = false;
      try { welcomeSeen = window.localStorage.getItem("fresh.journey.welcomeSeen") === "true"; } catch { /* ignore */ }
      const requiredRoute = welcomeSeen ? "auth-signin" : "welcome";
      if (activeRoute !== requiredRoute) setActiveRoute(requiredRoute);
    }
  }, [activeRoute, authLoading, isAuthenticated, isGuest, setActiveRoute]);
  const freshFlowRoute = isFreshFlowRoute(activeRoute);
  const activeFeature = FeatureRegistry.getFeature(activeRoute);
  const freshFlowFeature = FeatureRegistry.getFeature("fresh-flow");

  // Independent gateway surfaces: Welcome, Auth, Onboarding — no main shell chrome.
  if (isGatewayPath() || activeRoute === "welcome" || activeRoute === "onboarding" || activeRoute === "auth-signin" || activeRoute === "auth-signup") {
    const id =
      activeRoute === "welcome" ||
      activeRoute === "onboarding" ||
      activeRoute === "auth-signin" ||
      activeRoute === "auth-signup"
        ? activeRoute
        : gatewayFeatureId();
    const feature = FeatureRegistry.getFeature(id) ?? FeatureRegistry.getFeature("auth-signin");
    return feature
      ? <div className="fresh-id-independent-root"><FeatureLoader feature={feature} /></div>
      : <div className="empty-state">Fresh gateway is unavailable.</div>;
  }

  if (freshFlowRoute) {
    return (
      <div className="app-shell fresh-flow-app-shell fresh-shell-frame">
        <DesktopSidebar />
        <main className="app-content fresh-flow-content-root">
          <FeatureLoader feature={freshFlowFeature ?? activeFeature!} />
        </main>
        <BottomNav />
        <NotificationCenter />
        <GlobalSearchEntry />
      </div>
    );
  }

  return (
    <div className="app-shell fresh-shell-frame">
      <TopBar />
      <DesktopSidebar />
      <div className="app-body">
        <main className="app-content">
          {activeFeature ? (
            <FreshPlatformRuntimeBoundary route={activeRoute ?? activeFeature.id}>
              <FeatureLoader feature={activeFeature} />
            </FreshPlatformRuntimeBoundary>
          ) : (
            <div className="empty-state">Select a workspace</div>
          )}
        </main>
      </div>
      <WorkspaceContextPanel />
      <BottomNav />
      <NotificationCenter />
      <GlobalSearchEntry />
    </div>
  );
}

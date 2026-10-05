import TopBar from "./components/TopBar";
import BottomNav from "./components/BottomNav";
import DesktopSidebar from "./components/DesktopSidebar";
import WorkspaceContextPanel from "./components/WorkspaceContextPanel";
import NotificationCenter from "./components/NotificationCenter";
import GlobalSearchEntry from "./components/GlobalSearchEntry";
import { FeatureRegistry } from "./registry/FeatureRegistry";
import { useLayout } from "./contexts/useLayout";
import FeatureLoader from "./services/featureLoader";
import FreshFlowHub from "../features/fresh-flow/FreshFlowHub";
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
  if (path === "/auth/sign-up") return "auth-signin";
  return "auth-signin";
};

export default function AppRouter() {
  const { activeRoute } = useLayout();
  const freshFlowRoute = isFreshFlowRoute(activeRoute);
  const activeFeature = FeatureRegistry.getFeature(activeRoute);

  // Independent gateway surfaces: Welcome, Auth, Onboarding — no main shell chrome.
  if (isGatewayPath() || activeRoute === "welcome" || activeRoute === "onboarding" || activeRoute === "auth-signin" || activeRoute === "auth-signup") {
    const id = activeRoute === "welcome" || activeRoute === "onboarding" || activeRoute === "auth-signin" || activeRoute === "auth-signup"
      ? (activeRoute === "auth-signup" ? "auth-signin" : activeRoute)
      : gatewayFeatureId();
    const feature = FeatureRegistry.getFeature(id) ?? FeatureRegistry.getFeature("auth-signin");
    return feature
      ? <div className="fresh-id-independent-root"><FeatureLoader feature={feature} /></div>
      : <div className="empty-state">Fresh gateway is unavailable.</div>;
  }

  if (freshFlowRoute) {
    return <div className="app-shell fresh-flow-app-shell fresh-shell-frame"><DesktopSidebar /><main className="app-content fresh-flow-content-root"><FreshFlowHub /></main><BottomNav /><NotificationCenter /><GlobalSearchEntry /></div>;
  }

  return <div className="app-shell fresh-shell-frame">
    <TopBar />
    <DesktopSidebar />
    <div className="app-body">
      <main className="app-content">
        {activeFeature ? <FreshPlatformRuntimeBoundary route={activeRoute ?? activeFeature.id}><FeatureLoader feature={activeFeature} /></FreshPlatformRuntimeBoundary> : <div className="empty-state">Select a workspace</div>}
      </main>
    </div>
    <WorkspaceContextPanel />
    <BottomNav />
    <NotificationCenter />
    <GlobalSearchEntry />
  </div>;
}

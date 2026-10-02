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

const isFreshFlowRoute = (route?: string) => Boolean(route && (route === "fresh-flow" || route.startsWith("fresh-flow-")));\nconst isFreshIdGatewayPath = () => {\n  if (typeof window === "undefined") return false;\n  const path = window.location.pathname.replace(/\\/+$/, "") || "/";\n  return path === "/auth/sign-in" || path.startsWith("/auth/");\n};

export default function AppRouter() {
  const { activeRoute } = useLayout();
  const freshFlowRoute = isFreshFlowRoute(activeRoute);
  const activeFeature = FeatureRegistry.getFeature(activeRoute);\n\n  // Fresh ID is an independent gateway: no FWL shell or navigation is mounted here.\n  if (isFreshIdGatewayPath()) {\n    const authFeature = FeatureRegistry.getFeature("auth-signin");\n    return authFeature\n      ? <div className="fresh-id-independent-root"><FeatureLoader feature={authFeature} /></div>\n      : <div className="empty-state">Fresh ID is unavailable.</div>;\n  }

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

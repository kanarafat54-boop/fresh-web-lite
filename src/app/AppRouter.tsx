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

export default function AppRouter() {
  const { activeRoute } = useLayout();
  const freshFlowRoute = isFreshFlowRoute(activeRoute);
  const activeFeature = FeatureRegistry.getFeature(activeRoute);

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

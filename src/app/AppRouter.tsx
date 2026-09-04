import TopBar from "./components/TopBar";
import BottomNav from "./components/BottomNav";
import NotificationCenter from "./components/NotificationCenter";
import GlobalSearchEntry from "./components/GlobalSearchEntry";
import { FeatureRegistry } from "./registry/FeatureRegistry";
import { useLayout } from "./contexts/useLayout";
import FeatureLoader from "./services/featureLoader";
import FreshFlowHub from "../features/fresh-flow/FreshFlowHub";

const isFreshFlowRoute = (route?: string) => Boolean(route && (route === "fresh-flow" || route.startsWith("fresh-flow-")));

export default function AppRouter() {
  const { activeRoute } = useLayout();
  const freshFlowRoute = isFreshFlowRoute(activeRoute);
  const isFreshFlowOverview = activeRoute === "fresh-flow";
  const activeFeature = FeatureRegistry.getFeature(activeRoute);

  if (freshFlowRoute) {
    return (
      <div className="app-shell fresh-flow-app-shell">
        <TopBar />
        <main className="app-content fresh-flow-content-root">
          <FreshFlowHub />
        </main>
        {isFreshFlowOverview && <BottomNav />}
        <NotificationCenter />
        <GlobalSearchEntry />
      </div>
    );
  }

  return (
    <div className="app-shell">
      <TopBar />
      <div className="app-body">
        <main className="app-content">
          {activeFeature ? (
            <FeatureLoader feature={activeFeature} />
          ) : (
            <div className="empty-state">Select a workspace</div>
          )}
        </main>
      </div>
      <BottomNav />
      <NotificationCenter />
      <GlobalSearchEntry />
    </div>
  );
}

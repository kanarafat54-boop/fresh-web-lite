import TopBar from "./components/TopBar";
import SideNav from "./components/SideNav";
import BottomNav from "./components/BottomNav";
import NotificationCenter from "./components/NotificationCenter";
import GlobalSearchEntry from "./components/GlobalSearchEntry";
import WorkspaceSwitcher from "./components/WorkspaceSwitcher";
import FreshFlowMediaNav, { isFreshFlowMediaRoute } from "./components/FreshFlowMediaNav";
import DedicatedMediaView from "./components/DedicatedMediaView";
import { FeatureRegistry } from "./registry/FeatureRegistry";
import { useLayout } from "./contexts/useLayout";
import FeatureLoader from "./services/featureLoader";

export default function AppRouter() {
  const { activeRoute } = useLayout();
  const activeFeature = FeatureRegistry.getFeature(activeRoute);
  const isFreshFlowOverview = activeRoute === "fresh-flow";
  const isDedicatedMedia = activeRoute === "shorts" || (isFreshFlowMediaRoute(activeRoute) && !isFreshFlowOverview);

  if (isDedicatedMedia) {
    return (
      <div className="app-shell dedicated-media-shell">
        <main className="app-content dedicated-media-content-root">
          <DedicatedMediaView />
        </main>
        <BottomNav />
        <NotificationCenter />
        <GlobalSearchEntry />
      </div>
    );
  }

  return (
    <div className="app-shell">
      <TopBar />
      {isFreshFlowOverview && <FreshFlowMediaNav />}
      <div className="app-body">
        <SideNav />
        <main className="app-content">
          {activeFeature ? (
            <FeatureLoader feature={activeFeature} />
          ) : (
            <div className="empty-state">Select a workspace</div>
          )}
        </main>
        <aside className="app-right">
          <WorkspaceSwitcher />
        </aside>
      </div>
      <BottomNav />
      <NotificationCenter />
      <GlobalSearchEntry />
    </div>
  );
}

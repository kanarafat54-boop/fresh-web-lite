import React from "react";
import TopBar from "./components/TopBar";
import SideNav from "./components/SideNav";
import BottomNav from "./components/BottomNav";
import NotificationCenter from "./components/NotificationCenter";
import GlobalSearchEntry from "./components/GlobalSearchEntry";
import WorkspaceSwitcher from "./components/WorkspaceSwitcher";
import { FeatureRegistry } from "./registry/FeatureRegistry";
import { useLayout } from "./contexts/LayoutContext";
import FeatureLoader from "./services/featureLoader";

export default function AppRouter(): JSX.Element {
  const { activeRoute } = useLayout();

  const activeFeature = FeatureRegistry.getFeature(activeRoute);

  return (
    <div className="app-shell">
      <TopBar />
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

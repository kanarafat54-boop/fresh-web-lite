import React, { useEffect, useState } from "react";
import { deviceService } from "../services/deviceService";
import { NotificationService } from "../services/notificationService";
import { FeatureRegistry } from "../registry/FeatureRegistry";
import { LayoutContext } from "./LayoutContextValue";
import type { LayoutState, LayoutActions } from "./LayoutTypes";

const FIRST_EXPERIENCE_KEY = "fresh.firstExperience.completed";

function routeFromPath(pathname: string): string {
  const path = pathname.replace(/\\/+$/, "") || "/";
  if (path === "/welcome") return "first-experience";
  if (path === "/") return "feed";
  const feature = FeatureRegistry.getNavEntries().find((item) => item.route === path);
  if (feature) return feature.id;
  if (path === "/fresh-flow" || path.startsWith("/fresh-flow-")) return path.slice(1);
  return "feed";
}

function initialRoute(): string {
  if (typeof window === "undefined") return "feed";
  return routeFromPath(window.location.pathname);
}

function pathForRoute(route: string): string {
  if (route === "first-experience") return "/welcome";
  if (route === "fresh-flow" || route.startsWith("fresh-flow-")) return `/${route}`;
  return FeatureRegistry.getFeature(route)?.route ?? "/";
}

export const LayoutProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeRoute, setActiveRouteState] = useState<string | undefined>(initialRoute);
  const [deviceType, setDeviceType] = useState(() => deviceService.getDeviceType());
  const [notifications, setNotifications] = useState<import("../services/notificationService").UINotification[]>([]);
  const [searchOverlayOpen, setSearchOverlayOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  useEffect(() => deviceService.subscribe(setDeviceType), []);
  useEffect(() => {
    const handlePopState = () => setActiveRouteState(routeFromPath(window.location.pathname));
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);
  useEffect(() => NotificationService.subscribe((notification) => setNotifications((previous) => [notification, ...previous])), []);

  const actions: LayoutActions = {
    toggleSidebar: () => setSidebarOpen((value) => !value),
    openSidebar: () => setSidebarOpen(true),
    closeSidebar: () => setSidebarOpen(false),
    setActiveRoute: (route) => {
      if (!route) {
        setActiveRouteState("feed");
        return;
      }
      const isKnownFeature = Boolean(FeatureRegistry.getFeature(route));
      const isFreshFlowWorld = route === "fresh-flow" || route.startsWith("fresh-flow-");
      if (!isKnownFeature && !isFreshFlowWorld) {
        NotificationService.notify({
          title: "Fresh couldn't open that destination",
          message: `The destination "${route}" is not registered, so Fresh kept your current workspace.`,
          type: "warning",
        });
        return;
      }
      setActiveRouteState(route);
      if (typeof window !== "undefined") {
        const nextPath = pathForRoute(route);
        if (window.location.pathname !== nextPath) window.history.pushState({ freshRoute: route }, "", nextPath);
      }
    },
    openSearch: () => setSearchOverlayOpen(true),
    closeSearch: () => setSearchOverlayOpen(false),
    openNotifications: () => setNotificationsOpen(true),
    closeNotifications: () => setNotificationsOpen(false),
    pushNotification: (notification) => NotificationService.notify(notification),
    removeNotification: (id) => setNotifications((previous) => previous.filter((item) => item.id !== id)),
  };

  const state: LayoutState = {
    sidebarOpen,
    activeRoute,
    deviceType,
    notifications,
    searchOverlayOpen,
    notificationsOpen,
    engineContext: undefined,
  };
  return <LayoutContext.Provider value={{ state, actions }}>{children}</LayoutContext.Provider>;
};

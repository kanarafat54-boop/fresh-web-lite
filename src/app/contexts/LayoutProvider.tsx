import React, { useEffect, useState } from "react";
import { deviceService } from "../services/deviceService";
import { NotificationService } from "../services/notificationService";
import { FeatureRegistry } from "../registry/FeatureRegistry";
import { LayoutContext } from "./LayoutContextValue";
import type { LayoutState, LayoutActions } from "./LayoutTypes";
import { getInitialRoute, navigateToRoute, subscribeToBrowserNavigation, pathToRoute } from "../services/routeController";

const FIRST_EXPERIENCE_KEY = "fresh.firstExperience.completed";

function initialRoute(): string {
  try {
    if (localStorage.getItem(FIRST_EXPERIENCE_KEY) !== "true" && window.location.pathname === "/") {
      return "first-experience";
    }
  } catch {
    // Storage can be unavailable in privacy-restricted browsers; fall back safely.
  }
  return getInitialRoute() ?? FeatureRegistry.getNavEntries()[0]?.id ?? "feed";
}

export const LayoutProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeRoute, setActiveRouteState] = useState<string | undefined>(initialRoute);
  const [deviceType, setDeviceType] = useState(() => deviceService.getDeviceType());
  const [notifications, setNotifications] = useState<import("../services/notificationService").UINotification[]>([]);
  const [searchOverlayOpen, setSearchOverlayOpen] = useState(false);

  useEffect(() => deviceService.subscribe(setDeviceType), []);
  useEffect(() => NotificationService.subscribe((notification) => setNotifications((previous) => [notification, ...previous])), []);

  useEffect(() => {
    return subscribeToBrowserNavigation((route) => setActiveRouteState(route));
  }, []);

  const actions: LayoutActions = {
    toggleSidebar: () => setSidebarOpen((value) => !value),
    openSidebar: () => setSidebarOpen(true),
    closeSidebar: () => setSidebarOpen(false),
    setActiveRoute: (route) => {
      if (!route) return;
      setActiveRouteState(route);
      navigateToRoute(route);
    },
    openSearch: () => setSearchOverlayOpen(true),
    closeSearch: () => setSearchOverlayOpen(false),
    pushNotification: (notification) => setNotifications((previous) => [notification, ...previous]),
    removeNotification: (id) => setNotifications((previous) => previous.filter((item) => item.id !== id)),
  };

  useEffect(() => {
    const routeFromPath = pathToRoute(window.location.pathname);
    if (routeFromPath && routeFromPath !== activeRoute) setActiveRouteState(routeFromPath);
  }, [activeRoute]);

  const state: LayoutState = { sidebarOpen, activeRoute, deviceType, notifications, searchOverlayOpen, engineContext: undefined };
  return <LayoutContext.Provider value={{ state, actions }}>{children}</LayoutContext.Provider>;
};

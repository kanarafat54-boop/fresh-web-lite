import React, { useEffect, useState } from "react";
import { deviceService } from "../services/deviceService";
import { NotificationService } from "../services/notificationService";
import { FeatureRegistry } from "../registry/FeatureRegistry";
import { LayoutContext } from "./LayoutContextValue";
import type { LayoutState, LayoutActions } from "./LayoutTypes";

export const LayoutProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [activeRoute, setActiveRouteState] = useState<string | undefined>(() => {
    const first = FeatureRegistry.getNavEntries()[0];
    return first?.id ?? "feed";
  });

  const [deviceType, setDeviceType] = useState(() => deviceService.getDeviceType());

  const [notifications, setNotifications] = useState<
    import("../services/notificationService").UINotification[]
  >([]);

  const [searchOverlayOpen, setSearchOverlayOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = deviceService.subscribe((nextDeviceType) => {
      setDeviceType(nextDeviceType);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    const unsubscribe = NotificationService.subscribe((notification) => {
      setNotifications((previous) => [notification, ...previous]);
    });

    return unsubscribe;
  }, []);

  const actions: LayoutActions = {
    toggleSidebar: () => setSidebarOpen((value) => !value),
    openSidebar: () => setSidebarOpen(true),
    closeSidebar: () => setSidebarOpen(false),
    setActiveRoute: (route) => setActiveRouteState(route),
    openSearch: () => setSearchOverlayOpen(true),
    closeSearch: () => setSearchOverlayOpen(false),
    pushNotification: (notification) =>
      setNotifications((previous) => [notification, ...previous]),
    removeNotification: (id) =>
      setNotifications((previous) => previous.filter((item) => item.id !== id)),
  };

  const state: LayoutState = {
    sidebarOpen,
    activeRoute,
    deviceType,
    notifications,
    searchOverlayOpen,
    engineContext: undefined,
  };

  return (
    <LayoutContext.Provider value={{ state, actions }}>
      {children}
    </LayoutContext.Provider>
  );
};

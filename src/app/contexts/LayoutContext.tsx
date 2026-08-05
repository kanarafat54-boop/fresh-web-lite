import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { contextService } from "../../core/fresh-core";
import { deviceService, DeviceType } from "../services/deviceService";
import { NotificationService, UINotification } from "../services/notificationService";
import { FeatureRegistry } from "../registry/FeatureRegistry";

export type LayoutState = {
  sidebarOpen: boolean;
  activeRoute?: string;
  deviceType: DeviceType;
  notifications: UINotification[];
  searchOverlayOpen: boolean;
};

export type LayoutActions = {
  toggleSidebar: () => void;
  openSidebar: () => void;
  closeSidebar: () => void;
  setActiveRoute: (route?: string) => void;
  openSearch: () => void;
  closeSearch: () => void;
  pushNotification: (n: UINotification) => void;
  removeNotification: (id: string) => void;
};

const LayoutContext = createContext<{ state: LayoutState; actions: LayoutActions } | null>(null);

export const LayoutProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [activeRoute, setActiveRouteState] = useState<string | undefined>(() => {
    // default to "feed" or first registered feature
    const first = FeatureRegistry.getNavEntries()[0];
    return first?.id ?? "feed";
  });
  const [deviceType, setDeviceType] = useState<DeviceType>(() => deviceService.getDeviceType());
  const [notifications, setNotifications] = useState<UINotification[]>([]);
  const [searchOverlayOpen, setSearchOverlayOpen] = useState<boolean>(false);

  // read-only access to ContextEngine
  const engineContext = useMemo(() => contextService.get(), []);

  useEffect(() => {
    const unsub = deviceService.subscribe((dt) => setDeviceType(dt));
    return () => unsub();
  }, []);

  useEffect(() => {
    const sub = NotificationService.subscribe((n) => {
      setNotifications((prev) => [n, ...prev]);
    });
    return () => sub();
  }, []);

  const actions: LayoutActions = {
    toggleSidebar: () => setSidebarOpen((v) => !v),
    openSidebar: () => setSidebarOpen(true),
    closeSidebar: () => setSidebarOpen(false),
    setActiveRoute: (route?: string) => setActiveRouteState(route),
    openSearch: () => setSearchOverlayOpen(true),
    closeSearch: () => setSearchOverlayOpen(false),
    pushNotification: (n: UINotification) => setNotifications((p) => [n, ...p]),
    removeNotification: (id: string) => setNotifications((p) => p.filter((x) => x.id !== id)),
  };

  const state: LayoutState = {
    sidebarOpen,
    activeRoute,
    deviceType,
    notifications,
    searchOverlayOpen,
  };

  return <LayoutContext.Provider value={{ state, actions }}>{children}</LayoutContext.Provider>;
};

export function useLayout() {
  const val = useContext(LayoutContext);
  if (!val) throw new Error("useLayout must be used inside LayoutProvider");
  return { ...val.state, ...val.actions } as LayoutState & LayoutActions;
}

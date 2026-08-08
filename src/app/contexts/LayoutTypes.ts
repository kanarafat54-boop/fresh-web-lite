import type { UINotification } from "../services/notificationService";
import type { DeviceType } from "../services/deviceService";

export type LayoutState = {
  sidebarOpen: boolean;
  activeRoute?: string;
  deviceType: DeviceType;
  notifications: UINotification[];
  searchOverlayOpen: boolean;
  engineContext: unknown;
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

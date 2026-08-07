export type DeviceType = "mobile" | "tablet" | "desktop";

type Listener = (d: DeviceType) => void;

const getDeviceType = (): DeviceType => {
  const w = typeof window !== "undefined" ? window.innerWidth : 1200;
  if (w < 600) return "mobile";
  if (w < 1024) return "tablet";
  return "desktop";
};

class DeviceService {
  private listeners: Set<Listener> = new Set();
  private current: DeviceType = getDeviceType();
  private resizeHandler = () => {
    const newType = getDeviceType();
    if (newType !== this.current) {
      this.current = newType;
      this.listeners.forEach((l) => l(newType));
    }
  };

  start() {
    if (typeof window === "undefined") return;
    window.addEventListener("resize", this.resizeHandler);
  }

  stop() {
    if (typeof window === "undefined") return;
    window.removeEventListener("resize", this.resizeHandler);
  }

  getDeviceType() {
    return this.current;
  }

  subscribe(fn: Listener) {
    this.listeners.add(fn);
    // call immediately with current
    fn(this.current);
    return () => { this.listeners.delete(fn); };
  }
}

export const deviceService = new DeviceService();
// start listening immediately in browser env
if (typeof window !== "undefined") deviceService.start();

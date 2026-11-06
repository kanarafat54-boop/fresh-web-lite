/**
 * Data Saver for Fresh Shorts (specification Part 14).
 *
 * What it really does: it stops the player from downloading upcoming Shorts ahead of time, so a person
 * on a limited or slow connection only pays for the Short they are watching. It does not change video
 * quality (Shorts are served as the creator published them) and it never blocks playback.
 *
 * Modes: "auto" follows the browser's own data-saving signal (Save-Data) and slow connection types;
 * "on" and "off" are the person's explicit choice and always win over the device signal.
 */
export type DataSaverMode = "auto" | "on" | "off";

export const DATA_SAVER_STORAGE_KEY = "fresh-shorts-data-saver";
export const DEFAULT_DATA_SAVER_MODE: DataSaverMode = "auto";

export type ConnectionHint = { saveData?: boolean; effectiveType?: string } | null | undefined;

const SLOW_TYPES = new Set(["slow-2g", "2g"]);

export function normalizeDataSaverMode(value: unknown): DataSaverMode {
  return value === "on" || value === "off" || value === "auto" ? value : DEFAULT_DATA_SAVER_MODE;
}

export function nextDataSaverMode(mode: DataSaverMode): DataSaverMode {
  return mode === "auto" ? "on" : mode === "on" ? "off" : "auto";
}

/** True when data saving should apply right now. */
export function isDataSaverActive(mode: DataSaverMode, connection: ConnectionHint): boolean {
  if (mode === "on") return true;
  if (mode === "off") return false;
  return Boolean(connection?.saveData) || SLOW_TYPES.has(String(connection?.effectiveType ?? ""));
}

/** How many Shorts on each side of the current one may be downloaded ahead of time. */
export function prefetchRadiusFor(active: boolean, normalRadius: number): number {
  return active ? 0 : normalRadius;
}

/** What `<video preload>` should be for the Short at `index`. */
export function preloadFor(index: number, currentIndex: number, radius: number): "auto" | "metadata" | "none" {
  if (index === currentIndex) return "auto";
  return Math.abs(index - currentIndex) <= radius ? "auto" : "none";
}

export function dataSaverLabel(mode: DataSaverMode, active: boolean): string {
  if (mode === "on") return "Data saver: On";
  if (mode === "off") return "Data saver: Off";
  return active ? "Data saver: Auto (saving now)" : "Data saver: Auto";
}

export function readDataSaverMode(): DataSaverMode {
  try { return normalizeDataSaverMode(localStorage.getItem(DATA_SAVER_STORAGE_KEY)); } catch { return DEFAULT_DATA_SAVER_MODE; }
}

export function writeDataSaverMode(mode: DataSaverMode): void {
  try { localStorage.setItem(DATA_SAVER_STORAGE_KEY, mode); } catch { /* device storage unavailable */ }
}

export function readConnectionHint(): ConnectionHint {
  if (typeof navigator === "undefined") return null;
  return (navigator as Navigator & { connection?: ConnectionHint }).connection ?? null;
}

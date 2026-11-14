import type { ActivityItem } from "./shortsActivityModel.ts";
import { applyState, type NotificationState } from "./notificationState.ts";
import { isQuietNow, type ShortsPrivacySettings } from "./shortsPrivacy.ts";

/**
 * Device notifications for Fresh Shorts: while Fresh is open (even in a background tab) new activity can be shown
 * as a system notification. This is NOT push: nothing arrives once the browser or app is closed. Real push needs a
 * sender service, which Fresh does not run yet.
 */
export const DEVICE_NOTIFY_KEY = "fresh-shorts-device-notify";
export const LAST_CHECK_KEY = "fresh-shorts-device-notify-last";
export const CHECK_INTERVAL_MS = 5 * 60 * 1000;
export const MAX_SHOWN = 3;

export type Delivery = { title: string; body: string; shortId?: string; tag: string };

/** Unread, enabled-category items newer than the last check. */
export function newItems(items: ActivityItem[], state: NotificationState, lastCheckedMs: number): ActivityItem[] {
  return applyState(items, state).filter((item) => item.unread && Date.parse(item.at) > lastCheckedMs);
}

/** What to show for a batch of new items, or null for nothing. Quiet hours show nothing (the items stay unread). */
export function buildDelivery(items: ActivityItem[], privacy: ShortsPrivacySettings, now: Date = new Date()): Delivery | null {
  if (items.length === 0 || isQuietNow(privacy, now)) return null;
  const first = items[0];
  if (items.length === 1) return { title: "Fresh Shorts", body: first.detail ? `${first.text}: ${first.detail}`.slice(0, 160) : first.text, shortId: first.shortId, tag: first.id };
  return { title: "Fresh Shorts", body: `${Math.min(items.length, 99)} new notifications, latest: ${first.text}`.slice(0, 160), shortId: undefined, tag: `batch-${first.id}` };
}

/** Plain-language status for the settings line. */
export function deliveryStatus(permission: NotificationPermission | "unsupported", enabled: boolean): { label: string; canEnable: boolean; canDisable: boolean } {
  if (permission === "unsupported") return { label: "This browser cannot show device notifications.", canEnable: false, canDisable: false };
  if (permission === "denied") return { label: "Blocked in your browser settings. Allow notifications for Fresh there to turn this on.", canEnable: false, canDisable: false };
  if (permission === "granted" && enabled) return { label: "On. Shown while Fresh is open, including in other tabs. Not shown after you close Fresh.", canEnable: false, canDisable: true };
  return { label: "Off.", canEnable: true, canDisable: false };
}

export function readEnabled(storage: Pick<Storage, "getItem"> | null): boolean {
  try { return storage?.getItem(DEVICE_NOTIFY_KEY) === "1"; } catch { return false; }
}
export function readLastCheck(storage: Pick<Storage, "getItem"> | null, fallback: number): number {
  try { const n = Number(storage?.getItem(LAST_CHECK_KEY)); return Number.isFinite(n) && n > 0 ? n : fallback; } catch { return fallback; }
}

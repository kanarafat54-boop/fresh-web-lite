import { loadShortsActivity } from "./shortsActivity";
import { loadNotificationState } from "./notificationStateStore";
import { loadPrivacy } from "./shortsPrivacyService";
import { CHECK_INTERVAL_MS, DEVICE_NOTIFY_KEY, LAST_CHECK_KEY, buildDelivery, newItems, readEnabled, readLastCheck } from "./notificationDelivery";
import { requestOpenShort } from "./shortsExplore";

export function devicePermission(): NotificationPermission | "unsupported" {
  return typeof Notification === "undefined" ? "unsupported" : Notification.permission;
}

/** Must be called from a click: asks the browser for permission and, if granted, turns delivery on. */
export async function enableDeviceNotifications(): Promise<NotificationPermission | "unsupported"> {
  if (typeof Notification === "undefined") return "unsupported";
  const result = await Notification.requestPermission();
  try {
    if (result === "granted") { localStorage.setItem(DEVICE_NOTIFY_KEY, "1"); localStorage.setItem(LAST_CHECK_KEY, String(Date.now())); }
  } catch { /* storage unavailable: delivery stays off */ }
  return result;
}

export function disableDeviceNotifications(): void {
  try { localStorage.removeItem(DEVICE_NOTIFY_KEY); } catch { /* nothing to remove */ }
}

/** Checks for new activity every few minutes while Fresh is open. Returns a stop function. */
export function startDeviceNotifications(userId: string): () => void {
  let stopped = false;
  async function check() {
    if (stopped || devicePermission() !== "granted") return;
    let storage: Storage | null = null;
    try { storage = localStorage; } catch { return; }
    if (!readEnabled(storage)) return;
    const startedAt = Date.now();
    try {
      const last = readLastCheck(storage, startedAt);
      const [items, loadedState, privacy] = await Promise.all([loadShortsActivity(userId), loadNotificationState(userId), loadPrivacy(userId)]);
      const fresh = newItems(items, loadedState.state, last);
      const delivery = buildDelivery(fresh, privacy.settings);
      if (delivery) {
        const note = new Notification(delivery.title, { body: delivery.body, tag: delivery.tag });
        const shortId = delivery.shortId;
        note.onclick = () => { window.focus(); if (shortId) requestOpenShort(shortId); note.close(); };
      }
      // Quiet hours leave the check time alone so what was held back is shown once they end.
      if (delivery || fresh.length === 0) storage.setItem(LAST_CHECK_KEY, String(startedAt));
    } catch { /* try again at the next interval */ }
  }
  const timer = window.setInterval(() => { void check(); }, CHECK_INTERVAL_MS);
  const first = window.setTimeout(() => { void check(); }, 15_000);
  return () => { stopped = true; window.clearInterval(timer); window.clearTimeout(first); };
}

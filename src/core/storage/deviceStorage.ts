export interface FreshDeviceStorageStatus {
  usageBytes: number;
  quotaBytes: number;
  availableBytes: number;
  usagePercent: number | null;
  persistent: boolean;
}

/** Read browser-managed storage usage without moving or deleting any user data. */
export async function inspectFreshDeviceStorage(): Promise<FreshDeviceStorageStatus | null> {
  if (typeof navigator === "undefined" || !navigator.storage?.estimate) return null;
  const estimate = await navigator.storage.estimate();
  const usageBytes = Number.isFinite(estimate.usage) ? Math.max(0, Number(estimate.usage)) : 0;
  const quotaBytes = Number.isFinite(estimate.quota) ? Math.max(0, Number(estimate.quota)) : 0;
  const persistent = navigator.storage.persisted ? await navigator.storage.persisted() : false;
  return {
    usageBytes,
    quotaBytes,
    availableBytes: Math.max(0, quotaBytes - usageBytes),
    usagePercent: quotaBytes > 0 ? Math.min(100, (usageBytes / quotaBytes) * 100) : null,
    persistent,
  };
}

/**
 * Ask the browser to protect this origin's storage from automatic eviction.
 * Call only in response to a clear user action; browsers may decline the request.
 */
export async function requestFreshDeviceStoragePersistence(): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.storage?.persist) return false;
  return navigator.storage.persist();
}

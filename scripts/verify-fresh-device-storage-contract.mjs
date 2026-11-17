import assert from "node:assert/strict";
import {
  inspectFreshDeviceStorage,
  requestFreshDeviceStoragePersistence,
} from "../src/core/storage/deviceStorage.ts";

const original = Object.getOwnPropertyDescriptor(globalThis, "navigator");
let persistCalls = 0;
Object.defineProperty(globalThis, "navigator", {
  configurable: true,
  value: {
    storage: {
      estimate: async () => ({ usage: 75, quota: 100 }),
      persisted: async () => true,
      persist: async () => { persistCalls += 1; return false; },
    },
  },
});

const status = await inspectFreshDeviceStorage();
assert.deepEqual(status, {
  usageBytes: 75,
  quotaBytes: 100,
  availableBytes: 25,
  usagePercent: 75,
  persistent: true,
});
assert.equal(await requestFreshDeviceStoragePersistence(), false);
assert.equal(persistCalls, 1, "persistence is requested only when explicitly invoked");

Object.defineProperty(globalThis, "navigator", {
  configurable: true,
  value: { storage: {} },
});
assert.equal(await inspectFreshDeviceStorage(), null);
assert.equal(await requestFreshDeviceStoragePersistence(), false);

if (original) Object.defineProperty(globalThis, "navigator", original);
else delete globalThis.navigator;

console.log("Fresh device storage quota and persistence contract: PASS");

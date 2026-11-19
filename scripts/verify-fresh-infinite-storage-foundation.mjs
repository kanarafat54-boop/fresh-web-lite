import assert from "node:assert/strict";
import { createStorageProviderRegistry, selectStorageProvider } from "../src/core/storage/storageRouter.mjs";

const supabaseFree = {
  id: "supabase-free", enabled: true, status: "ready", priority: 1,
  maxObjectBytes: 50 * 1024 * 1024, availableBytes: 10 * 1024 * 1024 * 1024,
  accessModes: ["private", "public"], capabilities: ["signed-url", "range-read"],
};
const objectStore = {
  id: "object-store-primary", enabled: true, status: "ready", priority: 10,
  maxObjectBytes: 50 * 1024 * 1024 * 1024, availableBytes: 2 * 1024 * 1024 * 1024,
  accessModes: ["private", "public"], capabilities: ["resumable-upload", "range-read", "signed-url", "multipart-upload"],
};
const request = { sizeBytes: 2 * 1024 * 1024 * 1024, access: "private", resumable: true, rangeRead: true };

assert.equal(selectStorageProvider(request, [supabaseFree, objectStore])?.id, "object-store-primary");
assert.equal(selectStorageProvider({ sizeBytes: 1024, access: "private" }, [supabaseFree, objectStore])?.id, "supabase-free");
assert.equal(selectStorageProvider({ sizeBytes: 60 * 1024 * 1024, access: "private" }, [supabaseFree]) , null);
assert.equal(selectStorageProvider({ sizeBytes: 1024, access: "public", resumable: true }, [supabaseFree]), null);
assert.equal(selectStorageProvider({ sizeBytes: 1024, access: "private" }, [{ ...supabaseFree, status: "degraded" }]), null);
assert.equal(selectStorageProvider({ sizeBytes: 1024, access: "private" }, [{ ...supabaseFree, availableBytes: 0 }]), null);
assert.throws(() => selectStorageProvider({ sizeBytes: 0 }, [supabaseFree]), /positive safe integer/);

const registry = createStorageProviderRegistry();
registry.register(supabaseFree);
registry.register(objectStore);
assert.equal(registry.resolve(request)?.id, "object-store-primary");
assert.equal(registry.list().length, 2);
assert.throws(() => registry.register(supabaseFree), /already registered/);

console.log("Fresh Infinite Storage routing foundation: PASS");

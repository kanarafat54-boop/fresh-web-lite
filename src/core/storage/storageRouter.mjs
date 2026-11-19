/**
 * Provider-neutral routing primitives for Fresh Infinite Storage.
 *
 * This module deliberately does not upload files or contain provider credentials.
 * Existing upload paths remain unchanged until each adapter is implemented and verified.
 */

const REQUIRED_ACCESS = new Set(["private", "public"]);

function validProvider(provider) {
  return Boolean(
    provider &&
    typeof provider.id === "string" && provider.id.trim() &&
    provider.enabled === true &&
    provider.status === "ready" &&
    Number.isSafeInteger(provider.priority) &&
    Number.isSafeInteger(provider.maxObjectBytes) && provider.maxObjectBytes > 0 &&
    Number.isSafeInteger(provider.availableBytes) && provider.availableBytes >= 0 &&
    Array.isArray(provider.accessModes) &&
    Array.isArray(provider.capabilities)
  );
}

/**
 * Returns the lowest-priority-number eligible provider, or null.
 * A provider is eligible only when its health, capacity, access mode and
 * transfer capabilities satisfy the request. No silent fallback is performed.
 */
export function selectStorageProvider(request, providers) {
  if (!request || !Number.isSafeInteger(request.sizeBytes) || request.sizeBytes <= 0) {
    throw new TypeError("Storage request sizeBytes must be a positive safe integer.");
  }
  const access = request.access ?? "private";
  if (!REQUIRED_ACCESS.has(access)) throw new TypeError("Storage access must be private or public.");

  const eligible = (Array.isArray(providers) ? providers : [])
    .filter(validProvider)
    .filter((provider) => request.sizeBytes <= provider.maxObjectBytes)
    .filter((provider) => request.sizeBytes <= provider.availableBytes)
    .filter((provider) => provider.accessModes.includes(access))
    .filter((provider) => !request.resumable || provider.capabilities.includes("resumable-upload"))
    .filter((provider) => !request.rangeRead || provider.capabilities.includes("range-read"))
    .sort((a, b) => a.priority - b.priority || a.id.localeCompare(b.id));

  return eligible[0] ?? null;
}

export function createStorageProviderRegistry() {
  const providers = new Map();

  return Object.freeze({
    register(provider) {
      if (!provider || typeof provider.id !== "string" || !provider.id.trim()) {
        throw new TypeError("A storage provider needs a non-empty id.");
      }
      if (providers.has(provider.id)) throw new Error(`Storage provider already registered: ${provider.id}`);
      providers.set(provider.id, Object.freeze({
        ...provider,
        accessModes: Object.freeze([...(provider.accessModes ?? [])]),
        capabilities: Object.freeze([...(provider.capabilities ?? [])]),
      }));
    },
    list() {
      return [...providers.values()];
    },
    resolve(request) {
      return selectStorageProvider(request, [...providers.values()]);
    },
  });
}

export type FreshStorageAccess = "private" | "public";
export type FreshStorageCapability = "resumable-upload" | "range-read" | "signed-url" | "multipart-upload";

export interface FreshStorageProviderDescriptor {
  id: string;
  enabled: boolean;
  status: "ready" | "degraded" | "offline" | "unconfigured";
  /** Lower number wins. */
  priority: number;
  maxObjectBytes: number;
  availableBytes: number;
  accessModes: FreshStorageAccess[];
  capabilities: FreshStorageCapability[];
}

export interface FreshStorageRequest {
  sizeBytes: number;
  access?: FreshStorageAccess;
  resumable?: boolean;
  rangeRead?: boolean;
}

export interface FreshStorageProviderRegistry {
  register(provider: FreshStorageProviderDescriptor): void;
  list(): FreshStorageProviderDescriptor[];
  resolve(request: FreshStorageRequest): FreshStorageProviderDescriptor | null;
}

export function selectStorageProvider(
  request: FreshStorageRequest,
  providers: FreshStorageProviderDescriptor[],
): FreshStorageProviderDescriptor | null;

export function createStorageProviderRegistry(): FreshStorageProviderRegistry;

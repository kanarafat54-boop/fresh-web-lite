export type ClientExecutionCapability =
  | "wasm"
  | "webgpu"
  | "webaudio"
  | "media-source"
  | "indexeddb";

export type ClientExecutionProfile = {
  wasm: boolean;
  webgpu: boolean;
  webaudio: boolean;
  mediaSource: boolean;
  indexedDb: boolean;
  secureContext: boolean;
};

export type ClientExecutionPolicy = {
  capability: ClientExecutionCapability;
  preferred: "device" | "edge" | "cloud";
  fallbacks: Array<"device" | "edge" | "cloud">;
  reason: string;
};

export function getClientExecutionProfile(): ClientExecutionProfile {
  const browser = typeof window !== "undefined";
  return {
    wasm: typeof WebAssembly !== "undefined",
    webgpu: browser && "gpu" in navigator,
    webaudio: browser && "AudioContext" in window,
    mediaSource: browser && "MediaSource" in window,
    indexedDb: browser && "indexedDB" in window,
    secureContext: browser && window.isSecureContext,
  };
}

export function planClientExecution(
  capability: ClientExecutionCapability,
  options: { private?: boolean; latencySensitive?: boolean; batterySaver?: boolean } = {},
): ClientExecutionPolicy {
  const profile = getClientExecutionProfile();

  if (options.private && profile.wasm) {
    return {
      capability,
      preferred: "device",
      fallbacks: ["edge", "cloud"],
      reason: "Private-capable work prefers local execution when WebAssembly is available.",
    };
  }

  if (options.batterySaver) {
    return {
      capability,
      preferred: "cloud",
      fallbacks: ["edge", "device"],
      reason: "Battery-saving mode avoids heavy local execution.",
    };
  }

  if (
    options.latencySensitive &&
    ((capability === "webgpu" && profile.webgpu) ||
      (capability === "webaudio" && profile.webaudio) ||
      capability === "wasm")
  ) {
    return {
      capability,
      preferred: "device",
      fallbacks: ["edge", "cloud"],
      reason: "Latency-sensitive browser work stays in the local execution loop when supported.",
    };
  }

  if (capability === "indexeddb" || capability === "media-source" || capability === "webaudio") {
    return {
      capability,
      preferred: "device",
      fallbacks: ["edge", "cloud"],
      reason: "Browser-native capability is the primary execution surface.",
    };
  }

  return {
    capability,
    preferred: "edge",
    fallbacks: ["device", "cloud"],
    reason: "Remote execution is preferred when the browser cannot safely provide the requested accelerator.",
  };
}

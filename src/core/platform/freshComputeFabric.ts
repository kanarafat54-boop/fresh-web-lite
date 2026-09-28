export type ComputeTarget = "device" | "edge" | "cloud";
export type ComputeCapability = "wasm" | "webgpu" | "webaudio" | "realtime" | "render" | "ml";

export type ComputeRequest = {
  capability: ComputeCapability;
  payloadBytes?: number;
  latencySensitive?: boolean;
  gpuRequired?: boolean;
  private?: boolean;
  batterySaver?: boolean;
};

export type ComputePlan = {
  target: ComputeTarget;
  reason: string;
  fallbacks: ComputeTarget[];
};

const deviceReady = () => typeof window !== "undefined";
const webgpuReady = () =>
  deviceReady() && "gpu" in navigator;
const webAssemblyReady = () =>
  typeof WebAssembly !== "undefined";

export function planCompute(request: ComputeRequest): ComputePlan {
  if (request.private && deviceReady() && webAssemblyReady()) {
    return { target: "device", reason: "Private work is kept local when browser execution is available.", fallbacks: ["edge", "cloud"] };
  }
  if (request.gpuRequired && webgpuReady()) {
    return { target: "device", reason: "WebGPU is available for accelerated client execution.", fallbacks: ["cloud", "edge"] };
  }
  if (request.latencySensitive) {
    return { target: "edge", reason: "Latency-sensitive work should stay close to the user.", fallbacks: ["device", "cloud"] };
  }
  if (request.batterySaver) {
    return { target: "cloud", reason: "Battery-saving mode prefers server execution for heavy workloads.", fallbacks: ["edge", "device"] };
  }
  if (request.capability === "wasm" || request.capability === "webaudio") {
    return { target: "device", reason: "Browser-native execution avoids unnecessary network round trips.", fallbacks: ["edge", "cloud"] };
  }
  return { target: "cloud", reason: "Heavy or distributed work is routed to scalable cloud workers.", fallbacks: ["edge", "device"] };
}

export function getComputeCapabilities() {
  return {
    wasm: webAssemblyReady(),
    webgpu: webgpuReady(),
    webaudio: deviceReady() && "AudioContext" in window,
    realtime: deviceReady() && ("WebSocket" in window || "RTCPeerConnection" in window),
  };
}

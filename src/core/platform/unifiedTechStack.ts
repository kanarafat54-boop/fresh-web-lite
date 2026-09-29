/**
 * Unified Technical Stack Overview — high-concurrency media platform map.
 * Documents intended protocols without replacing live FWL implementations.
 * Massive underneath · Minimal on the surface.
 */

export type StackLayer = {
  layer: string;
  technologies: string[];
  fwlModules: string[];
  status: "live" | "device-ready" | "contract-ready" | "adapter-pending";
};

export const UNIFIED_TECH_STACK: StackLayer[] = [
  {
    layer: "Frontend Execution",
    technologies: ["React/Vite Web App", "WebAssembly (FFmpeg, WebGPU)", "WebAudio API"],
    fwlModules: ["wasmRuntime", "browserMediaExport", "clientExecutionFabric", "StudioWorkspace"],
    status: "live",
  },
  {
    layer: "Real-time Comms",
    technologies: ["WebSockets", "WebRTC", "gRPC services", "Redis Pub/Sub"],
    fwlModules: ["realtimeFabric", "Connect", "Groups", "Communities", "Live"],
    status: "device-ready",
  },
  {
    layer: "Media Processing",
    technologies: ["FFmpeg distributed clusters", "AWS Lambda worker pools", "HLS/DASH"],
    fwlModules: ["mediaRuntime", "remoteMediaWorker", "hlsPlayback", "mediaPipeline"],
    status: "adapter-pending",
  },
  {
    layer: "AI / ML Infrastructure",
    technologies: ["PyTorch", "Whisper STT", "Neural TTS", "MediaPipe", "Vector DBs (Milvus/FAISS)"],
    fwlModules: ["mediaPipeline", "browserSpeech", "vectorRetrieval", "recommendationEngine", "Fresh AI"],
    status: "contract-ready",
  },
  {
    layer: "Database & Ledger",
    technologies: ["PostgreSQL (Supabase)", "Cassandra/ScyllaDB (logs)", "Kafka (event streaming)"],
    fwlModules: ["treasury", "escrowLedger", "mediaProjectStore", "eventFabric"],
    status: "live",
  },
  {
    layer: "High-concurrency services",
    technologies: ["Microservices", "real-time streaming pipelines", "client WASM", "ML models"],
    fwlModules: ["mediaOpsArchitecture", "freshComputeFabric", "Studio", "Fresh Flow"],
    status: "contract-ready",
  },
];

export type ArchitecturePillarMap = {
  pillar: string;
  userSpec: string;
  fwlHome: string;
};

/** Where each user-spec section lives inside Fresh Web Lite. */
export const ARCHITECTURE_PILLAR_MAP: ArchitecturePillarMap[] = [
  {
    pillar: "1 · Creation, Production & Studio",
    userSpec: "Web NLE · render graph · stem separation · smart crop · auto-dub",
    fwlHome: "/studio (StudioWorkspace) → Creator handoff · mediaRenderGraph · mediaPipeline",
  },
  {
    pillar: "2 · Recommendation Engine & Viewing Player",
    userSpec: "Multi-objective score · client weight sliders · vector search · custom player",
    fwlHome: "Studio ranking panel · recommendationEngine · vectorRetrieval · playbackStateStore · Fresh Flow discovery",
  },
  {
    pillar: "3 · Real-Time Community & Interactive Broadcasts",
    userSpec: "Interactive nodes · channel hubs · domain expertise ranking",
    fwlHome: "interactiveNodeEngine · realtimeFabric · commentSignalRanking · Connect / Groups / Live",
  },
  {
    pillar: "4 · Financial Operations, Escrow & Business",
    userSpec: "Micro-subs · brand escrow · copyright arbitration",
    fwlHome: "escrowLedger · microSubscription · copyrightArbitration · Wallet / Treasury / Marketplace",
  },
  {
    pillar: "5 · Unified Technical Stack",
    userSpec: "WASM · realtime · media workers · ML · Postgres/Kafka",
    fwlHome: "unifiedTechStack · mediaOpsArchitecture (fit map in Studio panel 09)",
  },
];

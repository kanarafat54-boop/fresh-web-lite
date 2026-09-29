/**
 * Fresh Web Lite — Media Operations Architecture Map
 *
 * Maps the high-concurrency / streaming / WASM / ML media stack onto existing
 * FWL surfaces. Nothing here replaces Creator, Fresh Flow, Wallet, or Treasury.
 * It documents fit points and status so new work extends the right layer.
 *
 * Principle: Massive underneath. Minimal on the surface.
 */

export type MediaOpsFitStatus = "live" | "device-ready" | "contract-ready" | "adapter-pending";

export type MediaOpsFit = {
  id: string;
  pillar: "creation" | "recommendation" | "community" | "finance" | "stack";
  title: string;
  fwlSurface: string;
  coreModule: string;
  status: MediaOpsFitStatus;
  note: string;
};

/** Canonical fit table — extend only; do not delete rows. */
export const MEDIA_OPS_FIT: MediaOpsFit[] = [
  // 1 · Creation, Production & Studio
  {
    id: "wasm-nle",
    pillar: "creation",
    title: "Cloud-native Web NLE (WASM / WebGPU core)",
    fwlSurface: "Studio (/studio) → Creator handoff",
    coreModule: "wasmRuntime · browserMediaExport · mediaRenderGraph",
    status: "device-ready",
    note: "Local WASM smoke + canvas/MediaRecorder export run in-browser. Full FFmpeg WASM cluster is adapter-pending.",
  },
  {
    id: "render-graph",
    pillar: "creation",
    title: "Non-destructive render graph (JSON AST)",
    fwlSurface: "Studio Web NLE panel",
    coreModule: "mediaRenderGraph",
    status: "live",
    note: "Trim, split, crop, grade, text, audio lanes, dub, stem-separate stored as portable edits.",
  },
  {
    id: "stem-separation",
    pillar: "creation",
    title: "Smart audio stem separation",
    fwlSurface: "Studio AI media pipeline · separate-audio stage",
    coreModule: "mediaPipeline · mediaRenderGraph (stem-separate edit)",
    status: "contract-ready",
    note: "Pipeline stage + render-graph edit exist. Demucs/S3T worker is adapter-pending.",
  },
  {
    id: "smart-crop",
    pillar: "creation",
    title: "Smart dynamic crop (9:16 from 16:9)",
    fwlSurface: "Studio + browser export",
    coreModule: "mediaRenderGraph crop · browserMediaExport",
    status: "device-ready",
    note: "Crop aspect + focus hints live; YOLO/MediaPipe subject tracking is adapter-pending.",
  },
  {
    id: "auto-dub",
    pillar: "creation",
    title: "Auto-dubbing & voice cloning",
    fwlSurface: "Studio pipeline (transcribe → translate → synthesize)",
    coreModule: "mediaPipeline · browserSpeech",
    status: "contract-ready",
    note: "Local speech recognition available. Whisper / NMT / cloned TTS workers adapter-pending.",
  },

  // 2 · Recommendation & player
  {
    id: "multi-objective-score",
    pillar: "recommendation",
    title: "Multi-objective recommendation vectors",
    fwlSurface: "Studio ranking panel · Fresh Flow discovery (weights contract)",
    coreModule: "recommendationEngine · vectorRetrieval",
    status: "live",
    note: "Score = w_sub·S_sub + w_niche·S_niche + w_length·S_length + w_fresh·S_fresh with client slider normalize + rerank.",
  },
  {
    id: "realtime-weights",
    pillar: "recommendation",
    title: "Real-time client weight adjustments",
    fwlSurface: "Studio recommendation sliders",
    coreModule: "recommendationEngine",
    status: "device-ready",
    note: "Client-side rerank is live. gRPC → Milvus/Pinecone remote rerank is adapter-pending.",
  },
  {
    id: "semantic-embeddings",
    pillar: "recommendation",
    title: "Contextual vector search",
    fwlSurface: "vectorRetrieval + recommendation semanticWeight",
    coreModule: "vectorRetrieval · recommendationEngine",
    status: "contract-ready",
    note: "Cosine similarity + joint scoring ready. Multimodal embedding service adapter-pending.",
  },
  {
    id: "custom-player",
    pillar: "recommendation",
    title: "Custom playback (0.05× steps + local state)",
    fwlSurface: "Studio player controls",
    coreModule: "playbackStateStore · hlsPlayback",
    status: "device-ready",
    note: "Rate steps and IndexedDB/local restore live. Full HLS/DASH custom engine expands on hlsPlayback.",
  },

  // 3 · Real-time community
  {
    id: "interactive-nodes",
    pillar: "community",
    title: "Interactive branching & quiz nodes",
    fwlSurface: "Studio interactive manifest · Fresh Flow Long/Live",
    coreModule: "interactiveNodeEngine",
    status: "contract-ready",
    note: "Choice nodes + client jump protocol defined. Wire into Long/Live player surfaces next.",
  },
  {
    id: "channel-hubs",
    pillar: "community",
    title: "Channel community & realtime hubs",
    fwlSurface: "Connect · Groups · Communities · Live",
    coreModule: "realtimeFabric",
    status: "device-ready",
    note: "Supabase Realtime + optional WebSocket transport. Redis/Kafka scale-out adapter-pending.",
  },
  {
    id: "signal-ranking",
    pillar: "community",
    title: "Domain expertise / signal-value comment ranking",
    fwlSurface: "Comments panel",
    coreModule: "commentSignalRanking",
    status: "contract-ready",
    note: "Signal scorer live (badges · relevance · contribution · recency). LLM classifier + badge source adapters pending.",
  },

  // 4 · Finance
  {
    id: "brand-escrow",
    pillar: "finance",
    title: "Smart sponsor & micro-subscription escrow",
    fwlSurface: "Studio brand escrow · Wallet / Treasury scopes",
    coreModule: "escrowLedger · microSubscription · treasury",
    status: "contract-ready",
    note: "fund → milestone → release + micro-unlock state machines live. Settlement to treasury_entries is adapter-pending.",
  },
  {
    id: "copyright-arbitration",
    pillar: "finance",
    title: "Escrow copyright arbitration / Content ID hold",
    fwlSurface: "Studio · Trust · Ads",
    coreModule: "copyrightArbitration",
    status: "contract-ready",
    note: "Hold ledger + dispute queue defined. Fingerprint classifier adapter-pending.",
  },

  // 5 · Stack overview
  {
    id: "frontend-exec",
    pillar: "stack",
    title: "Frontend execution (React/Vite · WASM · WebAudio)",
    fwlSurface: "Entire FWL client",
    coreModule: "wasmRuntime · browserMediaExport · clientExecutionFabric",
    status: "live",
    note: "Aligned with FWL Vite/React shell.",
  },
  {
    id: "realtime-comms",
    pillar: "stack",
    title: "Realtime comms",
    fwlSurface: "Connect / Live / Groups",
    coreModule: "realtimeFabric",
    status: "device-ready",
    note: "Supabase Realtime primary; WebSocket fallback contract present.",
  },
  {
    id: "media-processing",
    pillar: "stack",
    title: "Media processing workers",
    fwlSurface: "Studio remote FFmpeg path",
    coreModule: "mediaRuntime · remoteMediaWorker",
    status: "adapter-pending",
    note: "Job submit/wait contract live; GPU worker fleet is deployment-side.",
  },
  {
    id: "ai-ml",
    pillar: "stack",
    title: "AI / ML infrastructure",
    fwlSurface: "Studio pipeline · Fresh AI",
    coreModule: "mediaPipeline · Fresh AI intelligence",
    status: "contract-ready",
    note: "Stage graph matches Whisper/TTS/MediaPipe intent; models are external adapters.",
  },
  {
    id: "data-ledger",
    pillar: "stack",
    title: "Database & ledger",
    fwlSurface: "Supabase Postgres · Fresh Treasury",
    coreModule: "treasury · escrowLedger · mediaProjectStore",
    status: "live",
    note: "Postgres + double-entry treasury. High-throughput log streams (Kafka/Scylla) adapter-pending.",
  },
  {
    id: "high-concurrency",
    pillar: "stack",
    title: "High-concurrency microservices & streaming pipelines",
    fwlSurface: "Studio · Fresh Flow · Platform fabric",
    coreModule: "unifiedTechStack · freshComputeFabric · eventFabric",
    status: "contract-ready",
    note: "Architecture map + device compute routing live. Full microservice fleet is deployment-side.",
  },
];

export function fitsByPillar(pillar: MediaOpsFit["pillar"]): MediaOpsFit[] {
  return MEDIA_OPS_FIT.filter((row) => row.pillar === pillar);
}

export function fitsLiveOrDevice(): MediaOpsFit[] {
  return MEDIA_OPS_FIT.filter((row) => row.status === "live" || row.status === "device-ready");
}

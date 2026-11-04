/**
 * Fresh Flow — extensible media capability registry.
 *
 * The six navigation destinations are presentation entry points, not a closed
 * media taxonomy. New media types and experiences use string identifiers and
 * adapter contracts; adding a format must not require extending a TypeScript
 * union or changing the navigation model.
 *
 * Registration is metadata only. It never grants permission to upload, publish,
 * stream, or execute an adapter; the server must authorize each operation.
 */

/** Action identifiers are open-ended too; adapters can introduce new actions. */
export type FreshFlowMediaAction = string;

export type FreshFlowCapabilityRequirement = {
  kind: "provider" | "device" | "permission" | "codec" | "feature";
  id: string;
  required: boolean;
  fallback?: string;
};

export type FreshFlowCapabilityDescriptor = {
  /** Stable, lowercase, namespaced identifier; not a closed union. */
  id: string;
  version: number;
  label: string;
  description: string;
  tags: string[];
  mimeTypes: string[];
  actions: FreshFlowMediaAction[];
  rendererAdapter?: string;
  editorAdapter?: string;
  processingAdapter?: string;
  requirements: FreshFlowCapabilityRequirement[];
  accessibility: {
    altText: boolean;
    captions: boolean;
    transcript: boolean;
    keyboard: boolean;
    screenReader: boolean;
    reducedMotion: boolean;
  };
  rightsPolicy: "user-owned" | "licensed" | "public-domain" | "provider-governed" | "review-required";
  status: "available" | "provider-required" | "device-required" | "planned" | "disabled";
};

export type FreshFlowCapabilityRegistrationResult =
  | { ok: true; descriptor: FreshFlowCapabilityDescriptor }
  | { ok: false; errors: string[] };

const ID_PATTERN = /^[a-z0-9][a-z0-9._-]{1,127}$/;
export function validateFreshFlowCapability(
  value: FreshFlowCapabilityDescriptor,
): FreshFlowCapabilityRegistrationResult {
  const errors: string[] = [];
  if (!ID_PATTERN.test(value.id)) errors.push("id must be a stable lowercase namespaced identifier");
  if (!Number.isInteger(value.version) || value.version < 1) errors.push("version must be a positive integer");
  if (!value.label.trim()) errors.push("label is required");
  if (!value.description.trim()) errors.push("description is required");
  if (!Array.isArray(value.actions) || value.actions.length === 0) errors.push("at least one action is required");
  for (const action of value.actions ?? []) {
    if (!ID_PATTERN.test(action)) errors.push(`invalid action identifier: ${String(action)}`);
  }
  for (const requirement of value.requirements ?? []) {
    if (!requirement.id.trim()) errors.push("requirement ids cannot be empty");
  }
  if (errors.length) return { ok: false, errors };
  return { ok: true, descriptor: value };
}

export class FreshFlowCapabilityRegistry {
  private readonly descriptors = new Map<string, FreshFlowCapabilityDescriptor>();

  register(value: FreshFlowCapabilityDescriptor): FreshFlowCapabilityRegistrationResult {
    const validation = validateFreshFlowCapability(value);
    if (!validation.ok) return validation;
    const existing = this.descriptors.get(value.id);
    if (existing && existing.version >= value.version) {
      return { ok: false, errors: [`capability ${value.id} already has version ${existing.version} or newer`] };
    }
    this.descriptors.set(value.id, structuredClone(value));
    return { ok: true, descriptor: structuredClone(value) };
  }

  get(id: string): FreshFlowCapabilityDescriptor | undefined {
    const value = this.descriptors.get(id);
    return value ? structuredClone(value) : undefined;
  }

  list(options: { status?: FreshFlowCapabilityDescriptor["status"]; tag?: string } = {}): FreshFlowCapabilityDescriptor[] {
    return [...this.descriptors.values()]
      .filter((item) => !options.status || item.status === options.status)
      .filter((item) => !options.tag || item.tags.includes(options.tag))
      .map((item) => structuredClone(item));
  }

  hasAction(id: string, action: FreshFlowMediaAction): boolean {
    return this.descriptors.get(id)?.actions.includes(action) ?? false;
  }
}

/**
 * Seed registry: capability families, not an exhaustive inventory. Specific
 * codecs, formats, live products and future inventions register independently.
 */
export const FRESH_FLOW_BASE_CAPABILITIES: FreshFlowCapabilityDescriptor[] = [
  {
    id: "media.text",
    version: 1,
    label: "Text and documents",
    description: "Readable text, documents, articles, notes and future text-based formats.",
    tags: ["text", "document", "writing", "reading"],
    mimeTypes: ["text/plain", "text/markdown", "application/pdf"],
    actions: ["discover", "create", "import", "export", "view", "edit", "publish", "share", "save", "download", "translate"],
    rendererAdapter: "text-document-renderer",
    editorAdapter: "text-document-editor",
    requirements: [],
    accessibility: { altText: true, captions: false, transcript: false, keyboard: true, screenReader: true, reducedMotion: true },
    rightsPolicy: "user-owned",
    status: "available",
  },
  {
    id: "media.image",
    version: 1,
    label: "Images and graphics",
    description: "Photos, illustrations, graphics, memes, stickers and image sequences.",
    tags: ["image", "photo", "graphic", "illustration"],
    mimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"],
    actions: ["discover", "create", "import", "export", "view", "edit", "remix", "publish", "share", "save", "download", "embed", "translate"],
    rendererAdapter: "image-gallery-renderer",
    editorAdapter: "image-editor",
    requirements: [],
    accessibility: { altText: true, captions: false, transcript: false, keyboard: true, screenReader: true, reducedMotion: true },
    rightsPolicy: "review-required",
    status: "available",
  },
  {
    id: "media.audio",
    version: 1,
    label: "Audio and music",
    description: "Speech, music, podcasts, soundscapes and audio-first experiences.",
    tags: ["audio", "music", "speech", "podcast"],
    mimeTypes: ["audio/mpeg", "audio/mp4", "audio/ogg", "audio/wav", "audio/webm"],
    actions: ["discover", "create", "import", "export", "play", "listen", "edit", "remix", "publish", "share", "save", "download", "transcribe", "translate"],
    rendererAdapter: "audio-player",
    editorAdapter: "audio-editor",
    processingAdapter: "audio-processing",
    requirements: [],
    accessibility: { altText: false, captions: true, transcript: true, keyboard: true, screenReader: true, reducedMotion: true },
    rightsPolicy: "review-required",
    status: "available",
  },
  {
    id: "media.video",
    version: 1,
    label: "Video",
    description: "Short, long, episodic, interactive and other video formats.",
    tags: ["video", "shorts", "long-form", "film", "animation"],
    mimeTypes: ["video/mp4", "video/webm", "video/quicktime"],
    actions: ["discover", "create", "import", "export", "view", "play", "edit", "remix", "publish", "share", "save", "download", "embed", "transcribe", "translate"],
    rendererAdapter: "adaptive-video-player",
    editorAdapter: "video-editor",
    processingAdapter: "video-processing",
    requirements: [{ kind: "provider", id: "media-processing", required: false, fallback: "direct-playback-when-supported" }],
    accessibility: { altText: true, captions: true, transcript: true, keyboard: true, screenReader: true, reducedMotion: true },
    rightsPolicy: "review-required",
    status: "available",
  },
  {
    id: "media.live",
    version: 1,
    label: "Live and real-time experiences",
    description: "Extensible live broadcasts, rooms, calls, co-creation and real-time events.",
    tags: ["live", "realtime", "broadcast", "room", "event"],
    mimeTypes: [],
    actions: ["discover", "create", "view", "play", "listen", "publish", "share", "collaborate", "transcribe", "translate"],
    rendererAdapter: "live-experience-adapter",
    requirements: [
      { kind: "provider", id: "live-ingest-and-egress", required: true },
      { kind: "permission", id: "camera-or-microphone", required: false, fallback: "viewer-only" },
    ],
    accessibility: { altText: true, captions: true, transcript: true, keyboard: true, screenReader: true, reducedMotion: true },
    rightsPolicy: "provider-governed",
    status: "provider-required",
  },
  {
    id: "media.spatial",
    version: 1,
    label: "3D, spatial and immersive media",
    description: "3D assets, spatial scenes, AR/VR/MR and future immersive experiences.",
    tags: ["3d", "spatial", "ar", "vr", "mr", "immersive"],
    mimeTypes: ["model/gltf+json", "model/gltf-binary"],
    actions: ["discover", "create", "import", "export", "view", "edit", "remix", "publish", "share", "save", "download", "embed", "collaborate"],
    rendererAdapter: "spatial-media-adapter",
    editorAdapter: "spatial-editor",
    requirements: [{ kind: "device", id: "spatial-capable-device", required: false, fallback: "2d-preview" }],
    accessibility: { altText: true, captions: true, transcript: true, keyboard: true, screenReader: true, reducedMotion: true },
    rightsPolicy: "review-required",
    status: "device-required",
  },
];

/**
 * Open-world starter families. These descriptors make additional media shapes
 * representable without pretending their renderers/providers are already live.
 * Concrete codecs, genres, subtypes and future formats register independently.
 */
const FRESH_FLOW_EXTENDED_CAPABILITIES: FreshFlowCapabilityDescriptor[] = [
  {
    id: "media.interactive",
    version: 1,
    label: "Interactive and playable experiences",
    description: "Games, interactive stories, quizzes, simulations, learning activities and future user-driven media.",
    tags: ["interactive", "game", "simulation", "story", "learning"],
    mimeTypes: ["application/vnd.fresh.interactive+json"],
    actions: ["discover", "create", "import", "view", "play", "interact", "edit", "publish", "share", "save", "report"],
    rendererAdapter: "sandboxed-interactive-renderer",
    editorAdapter: "interactive-experience-editor",
    requirements: [
      { kind: "feature", id: "sandboxed-content-runtime", required: true, fallback: "metadata-preview-only" },
      { kind: "permission", id: "interactive-content-consent", required: true, fallback: "metadata-preview-only" },
    ],
    accessibility: { altText: true, captions: true, transcript: true, keyboard: true, screenReader: true, reducedMotion: true },
    rightsPolicy: "review-required",
    status: "planned",
  },
  {
    id: "media.data",
    version: 1,
    label: "Data, charts and knowledge experiences",
    description: "Charts, maps, datasets, dashboards, explainable visualizations and data-linked stories.",
    tags: ["data", "chart", "map", "visualization", "knowledge"],
    mimeTypes: ["text/csv", "application/json"],
    actions: ["discover", "create", "import", "view", "explore", "annotate", "export", "publish", "share", "save"],
    rendererAdapter: "safe-data-visualization-renderer",
    editorAdapter: "data-story-editor",
    requirements: [{ kind: "feature", id: "safe-data-visualization", required: true, fallback: "download-or-structured-preview" }],
    accessibility: { altText: true, captions: false, transcript: true, keyboard: true, screenReader: true, reducedMotion: true },
    rightsPolicy: "review-required",
    status: "planned",
  },
  {
    id: "media.composite",
    version: 1,
    label: "Hybrid and synchronized media",
    description: "Composable experiences combining multiple media tracks, timelines, annotations, translations or interactive layers.",
    tags: ["hybrid", "multimodal", "synchronized", "composite", "timeline"],
    mimeTypes: ["application/vnd.fresh.media-manifest+json"],
    actions: ["discover", "create", "import", "view", "play", "edit", "synchronize", "remix", "publish", "share", "save"],
    rendererAdapter: "composite-media-orchestrator",
    editorAdapter: "multitrack-experience-editor",
    requirements: [{ kind: "feature", id: "media-track-orchestration", required: true, fallback: "render-supported-tracks-individually" }],
    accessibility: { altText: true, captions: true, transcript: true, keyboard: true, screenReader: true, reducedMotion: true },
    rightsPolicy: "review-required",
    status: "planned",
  },
  {
    id: "media.executable",
    version: 1,
    label: "Executable and programmable media",
    description: "Programmable art, interactive documents and future active media; execution requires an isolated, reviewed runtime.",
    tags: ["executable", "programmable", "sandbox", "interactive"],
    mimeTypes: [],
    actions: ["discover", "submit-for-review", "inspect-metadata", "report"],
    requirements: [
      { kind: "feature", id: "isolated-execution-sandbox", required: true, fallback: "non-executable-preview" },
      { kind: "feature", id: "signed-content-and-resource-budget", required: true, fallback: "non-executable-preview" },
    ],
    accessibility: { altText: true, captions: true, transcript: true, keyboard: true, screenReader: true, reducedMotion: true },
    rightsPolicy: "review-required",
    status: "disabled",
  },
  {
    id: "media.live-event",
    version: 1,
    label: "Scheduled and ticketed live events",
    description: "Scheduled streams, classes, performances, conferences and ticketed or RSVP-based media events.",
    tags: ["live", "event", "schedule", "ticket", "rsvp"],
    mimeTypes: ["application/vnd.fresh.live-event+json"],
    actions: ["discover", "schedule", "rsvp", "join", "cancel-rsvp", "report"],
    rendererAdapter: "live-event-details-adapter",
    requirements: [
      { kind: "provider", id: "live-ingest-and-egress", required: true, fallback: "event-details-and-schedule-only" },
      { kind: "feature", id: "event-entitlement-and-ledger", required: false, fallback: "free-rsvp-only" },
    ],
    accessibility: { altText: true, captions: true, transcript: true, keyboard: true, screenReader: true, reducedMotion: true },
    rightsPolicy: "provider-governed",
    status: "provider-required",
  },
];

export function createFreshFlowCapabilityRegistry(): FreshFlowCapabilityRegistry {
  const registry = new FreshFlowCapabilityRegistry();
  for (const capability of [...FRESH_FLOW_BASE_CAPABILITIES, ...FRESH_FLOW_EXTENDED_CAPABILITIES]) {
    const result = registry.register(capability);
    if (!result.ok) throw new Error(`Invalid built-in Fresh Flow capability: ${capability.id}`);
  }
  return registry;
}

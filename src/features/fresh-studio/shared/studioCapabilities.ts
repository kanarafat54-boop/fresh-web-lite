/**
 * Honest capability registry (spec §26.7, §28).
 * The UI reads this to show what is real. A capability only advances when its evidence exists;
 * scripts/verify-fresh-studio-foundation.mjs asserts nothing here claims "production_verified".
 */
export const CAPABILITY_STATUSES = ["designed", "implemented", "backend_connected", "tested", "production_verified"] as const;
export type CapabilityStatus = (typeof CAPABILITY_STATUSES)[number];

export const CAPABILITY_STATUS_LABELS: Record<CapabilityStatus, string> = {
  designed: "Designed",
  implemented: "Implemented",
  backend_connected: "Backend connected",
  tested: "Tested",
  production_verified: "Production verified",
};

export type StudioCapability = {
  id: string;
  label: string;
  status: CapabilityStatus;
  /** Plain-language limits shown to the user. */
  note: string;
};

export const STUDIO_CAPABILITIES: readonly StudioCapability[] = [
  { id: "projects", label: "Project management", status: "tested", note: "Create, rename, duplicate, archive, trash, restore and version history. Logic is tested; saving to your account needs the Studio database migration applied, otherwise projects stay on this device." },
  { id: "autosave", label: "Autosave and version history", status: "tested", note: "Project details autosave with conflict detection. Media editing autosave arrives with the timeline." },
  { id: "video-device", label: "Video editing on this device", status: "implemented", note: "The existing editor handles import, trim, captions and short exports up to 30 seconds. It is not yet connected to Studio projects." },
  { id: "video-timeline", label: "Video timeline editor", status: "implemented", note: "Video + music tracks with trim, split, move, speed, per-clip volume and fades, colour looks, fit/fill framing, text layers, aspect-ratio preview, undo/redo, autosave, SRT/VTT captions and on-device silence removal. Rendering of every one of these is verified on real media against ffmpeg and the editor in a real browser. Export needs the render worker redeployed and the storage migration applied, so it is not yet production verified. Transitions, keyframes, overlays, stickers, effects, reverse, freeze frame and multi-track video are not built." },
  { id: "export-presets", label: "Export presets", status: "designed", note: "Only options the render worker can actually produce will be shown." },
  { id: "image-studio", label: "Image and artwork Studio", status: "designed", note: "Basic photo adjustments exist in the device editor; layers and brushes are planned." },
  { id: "audio-studio", label: "Audio, music and podcast", status: "designed", note: "Planned for Phase 4." },
  { id: "animation-3d", label: "3D and animation", status: "implemented", note: "Fresh Director can render a Blender test scene, but only when the render worker is deployed and reachable." },
  { id: "design-studio", label: "Graphic design and brand kit", status: "designed", note: "Planned for Phase 3." },
  { id: "ai-creation", label: "AI creation", status: "implemented", note: "Fresh AI is available in its own workspace. Generation inside Studio projects is not connected yet." },
  { id: "asset-library", label: "Universal asset library", status: "designed", note: "Planned for Phase 1 follow-up." },
  { id: "publishing", label: "Publishing to Fresh", status: "designed", note: "Planned for Phase 7. Nothing here publishes yet." },
  { id: "analytics", label: "Creator analytics", status: "implemented", note: "Real creator analytics live in the Creator dashboard; Studio project analytics are planned." },
  { id: "collaboration", label: "Team and review", status: "designed", note: "Planned for Phase 8." },
  { id: "live", label: "Live production", status: "designed", note: "Not available yet." },
];

export function capabilityById(id: string): StudioCapability | undefined {
  return STUDIO_CAPABILITIES.find((c) => c.id === id);
}

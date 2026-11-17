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
  { id: "film-plan", label: "Film plan: scenes and shots", status: "implemented", note: "Plan scenes and shots inside the editor, link each shot to a clip and arrange the clips in film order. Exports are limited to 20 minutes, and the render service may allow less until its limit is raised. Scenes saved in the Director desk can be imported into the plan (a copy; the two are not kept in sync)." },
  { id: "video-timeline", label: "Video timeline editor", status: "implemented", note: "Video + music tracks with trim, split, move, speed, per-clip volume and fades, colour looks (eleven presets plus warmth, teal-and-orange split toning, vignette and film grain; grain shows only in the export), fit/fill framing, coloured stickers (33 original vector stickers and seven emoji groups, added as picture overlays that pop, fade, rise or slide in and out; emoji are drawn with the device's own emoji font, and no stickers use any platform's logo), 24 single-colour symbol stickers, five caption looks (classic, bold, box, minimal, headline; shown in the export only), text layers that can be turned and can fade, rise or slide in and out, transitions (dissolve, dip to black, wipe, slide), zoom and pan motion with up to four extra keyframes, picture and rectangle overlays that can be turned, one picture-in-picture video layer, drag-and-resize in the preview with Alt + arrow nudging, aspect-ratio preview, undo/redo, autosave, SRT/VTT captions and on-device silence removal and on-device beat detection that cuts the video on the beat of a music clip (steady music works best; it says so when it finds no beat). Rendering of every one of these is verified on real media against ffmpeg and the editor in a real browser. Export needs the render worker redeployed and the storage migration applied, so it is not yet production verified. Keyframes for anything but zoom and pan, animated pictures or shapes, more than one extra video layer, effects, reverse and freeze frame are not built." },
  { id: "export-presets", label: "Export presets", status: "designed", note: "Only options the render worker can actually produce will be shown." },
  { id: "image-studio", label: "Image and artwork Studio", status: "designed", note: "Basic photo adjustments exist in the device editor; layers and brushes are planned." },
  { id: "writing-studio", label: "Writing and text work", status: "tested", note: "Text projects (posts, news, books, lessons, research, channel pages) open a writing editor: title, text, outline, sources, checks before sharing, and Markdown or plain-text export. Tested in Node and in a mobile browser. Fresh Posts projects can publish the text as a post when you are signed in (the same call the Posts feed uses; tested with a stand-in, not yet run against the live feed). Not connected: sending text to any other Fresh Flow system, rich formatting, images inside the text, AI drafting." },
  { id: "audio-studio", label: "Audio, music and podcast", status: "tested", note: "Audio and podcast projects open an audio editor: record or choose a file, trim, fade, volume, level, chapter markers, and export a WAV plus chapters (JSON/text). Tested in Node and in a mobile browser. Not connected: publishing to Fresh Music or Podcasts, noise clean-up, multi-track mixing. Exports are limited to 30 minutes." },
  { id: "animation-3d", label: "3D and animation", status: "implemented", note: "Fresh Director can render a Blender test scene, but only when the render worker is deployed and reachable." },
  { id: "design-studio", label: "Graphic design and brand kit", status: "designed", note: "Planned for Phase 3." },
  { id: "ai-creation", label: "AI creation", status: "implemented", note: "Fresh AI is available in its own workspace. Generation inside Studio projects is not connected yet." },
  { id: "asset-library", label: "Universal asset library", status: "designed", note: "Planned for Phase 1 follow-up." },
  { id: "publishing", label: "Publishing to Fresh", status: "implemented", note: "The Publish section of Studio is the existing Fresh creator publisher: Shorts, long videos and posts, with drafts. A 9:16 export from the video editor reaches it through Send to Fresh Shorts. Publishing to other destinations is planned for Phase 7." },
  { id: "send-to-shorts", label: "Send to Fresh Shorts", status: "implemented", note: "After a 9:16 export, Send to Fresh Shorts opens the Shorts publish screen with the video attached. You write the caption and publish there; Studio posts nothing. The video is carried in memory for this visit only, so a page reload drops it and you would save and upload the file by hand." },
  { id: "auto-captions", label: "Automatic captions and filler cutter", status: "tested", note: "Writes captions from speech and cuts um/uh/er/hmm with a Whisper model that runs in your browser (the audio is not uploaded). The first use downloads the speech library from jsDelivr and the model from Hugging Face, so it needs internet once. A live CI check runs the real model in Chromium on generated speech and passes; it has not been run on real recordings in production. Whisper often leaves filler sounds out, so the cutter has an optional second pass that looks for speech-level sound in gaps between words; that pass is a guess and can mistake music or noise under the voice for hesitations. Always check the captions." },
  { id: "analytics", label: "Creator analytics", status: "implemented", note: "Real creator analytics live in the Creator dashboard; Studio project analytics are planned." },
  { id: "collaboration", label: "Team and review", status: "designed", note: "Planned for Phase 8." },
  { id: "live", label: "Live production", status: "designed", note: "Not available yet." },
];

export function capabilityById(id: string): StudioCapability | undefined {
  return STUDIO_CAPABILITIES.find((c) => c.id === id);
}

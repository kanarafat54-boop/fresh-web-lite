export type EditorToolCategory = "timeline" | "motion" | "visual" | "color" | "audio" | "text" | "ai" | "capture" | "collaboration" | "provenance" | "accessibility";

export type EditorTool = {
  id: string;
  name: string;
  category: EditorToolCategory;
  maturity: "core" | "advanced" | "experimental";
  description: string;
};

/**
 * #TRUEMODE editor catalog. It intentionally contains established editing
 * primitives plus forward-looking tools; implementation can be staged without
 * changing the project model.
 */
export const TRUEMODE_EDITOR_TOOLS: readonly EditorTool[] = [
  { id: "multitrack", name: "Multi-track Timeline", category: "timeline", maturity: "core", description: "Independent video, image, text and audio layers." },
  { id: "magnetic-timeline", name: "Magnetic Timeline", category: "timeline", maturity: "advanced", description: "Ripple-aware editing that preserves sync." },
  { id: "scene-detect", name: "Scene Detect", category: "timeline", maturity: "advanced", description: "Detect cuts and separate scenes automatically." },
  { id: "beat-map", name: "Beat Map", category: "audio", maturity: "advanced", description: "Detect beats and offer rhythm-aware edit points." },
  { id: "keyframes", name: "Keyframes", category: "motion", maturity: "core", description: "Animate position, scale, rotation, opacity and effects." },
  { id: "speed-ramp", name: "Speed Curves", category: "motion", maturity: "core", description: "Variable-speed ramps with optical-flow options." },
  { id: "motion-track", name: "Motion Tracking", category: "motion", maturity: "advanced", description: "Attach text, masks or effects to moving subjects." },
  { id: "mask", name: "Precision Masks", category: "visual", maturity: "advanced", description: "Shape and animate local visual adjustments." },
  { id: "chroma", name: "Chroma Key", category: "visual", maturity: "core", description: "Remove green/blue screen backgrounds." },
  { id: "blend", name: "Blend Modes", category: "visual", maturity: "advanced", description: "Composite layers using professional blend modes." },
  { id: "stabilize", name: "Stabilize", category: "visual", maturity: "core", description: "Reduce camera shake while preserving framing." },
  { id: "smart-reframe", name: "Smart Reframe", category: "visual", maturity: "advanced", description: "Keep important subjects in frame across aspect ratios." },
  { id: "color-grade", name: "Color Lab", category: "color", maturity: "advanced", description: "Curves, scopes, LUTs, selective color and matching." },
  { id: "auto-color", name: "Auto Grade", category: "color", maturity: "advanced", description: "AI-assisted exposure, white balance and color matching." },
  { id: "voice-clean", name: "Voice Clean", category: "audio", maturity: "advanced", description: "Speech isolation, denoise and clarity enhancement." },
  { id: "ducking", name: "Adaptive Ducking", category: "audio", maturity: "advanced", description: "Automatically lower music under speech." },
  { id: "audio-separate", name: "Stem Separation", category: "audio", maturity: "advanced", description: "Separate speech, music and effects when technically possible." },
  { id: "captions", name: "Live Captions", category: "text", maturity: "core", description: "Editable multilingual captions with timing controls." },
  { id: "text-layout", name: "Text Motion", category: "text", maturity: "core", description: "Animated titles, typography and templates." },
  { id: "transcript-edit", name: "Edit by Transcript", category: "ai", maturity: "advanced", description: "Cut spoken video by editing its transcript." },
  { id: "auto-cut", name: "AI Auto-Cut", category: "ai", maturity: "advanced", description: "Find silence, duplicate takes and weak sections." },
  { id: "highlight", name: "Highlight Finder", category: "ai", maturity: "advanced", description: "Rank candidate moments for Shorts and trailers." },
  { id: "generative-remove", name: "Generative Remove", category: "ai", maturity: "experimental", description: "Remove selected objects and reconstruct the scene." },
  { id: "generative-extend", name: "Generative Extend", category: "ai", maturity: "experimental", description: "Extend a clip while preserving visual continuity." },
  { id: "generative-broll", name: "Generative B-roll", category: "ai", maturity: "experimental", description: "Suggest or create clearly labeled supplemental footage." },
  { id: "style-transfer", name: "Style Lens", category: "ai", maturity: "experimental", description: "Apply a controlled visual style while preserving provenance." },
  { id: "script-to-edit", name: "Intent-to-Edit", category: "ai", maturity: "experimental", description: "Describe the desired result and produce an editable plan." },
  { id: "multicam", name: "Multi-cam", category: "timeline", maturity: "advanced", description: "Sync and switch multiple camera angles." },
  { id: "teleprompter", name: "Teleprompter", category: "capture", maturity: "core", description: "Record while following a script with pacing assistance." },
  { id: "remote-capture", name: "Remote Capture", category: "capture", maturity: "experimental", description: "Coordinate supported remote cameras and contributors." },
  { id: "co-edit", name: "Live Co-edit", category: "collaboration", maturity: "experimental", description: "Collaborative editing with presence and conflict-safe versions." },
  { id: "version-tree", name: "Version Tree", category: "collaboration", maturity: "advanced", description: "Branch, compare and restore edits without destructive overwrites." },
  { id: "provenance", name: "Creation Provenance", category: "provenance", maturity: "core", description: "Record source media, edits, contributors and transformations." },
  { id: "edit-recipe", name: "Edit Recipe", category: "provenance", maturity: "experimental", description: "Share an editable recipe instead of only a flattened export." },
  { id: "audio-description", name: "Audio Description", category: "accessibility", maturity: "advanced", description: "Generate and edit descriptive narration tracks." },
  { id: "caption-safe", name: "Caption Safe Area", category: "accessibility", maturity: "core", description: "Preview readable captions across devices and overlays." },
  { id: "gesture-free", name: "Gesture-Free Editing", category: "accessibility", maturity: "core", description: "Every important editing action has keyboard, button or assistive alternatives." },
];

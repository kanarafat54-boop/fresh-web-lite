/**
 * Fresh Web Lite — canonical icon registry.
 *
 * Meaning is canonical here; visual variants may evolve without changing
 * product semantics. Components should use these names instead of inventing
 * ecosystem-specific synonyms.
 */

export const FRESH_ICON_REGISTRY = {
  voice: { meaning: "Start or control voice input" },
  search: { meaning: "Search or discover information" },
  home: { meaning: "Return to the Fresh starting surface" },
  flow: { meaning: "Open the Fresh Flow media experience" },
  discover: { meaning: "Explore relevant people, content, places or capabilities" },
  create: { meaning: "Create something new" },
  learn: { meaning: "Learn or study" },
  work: { meaning: "Work, execute or manage tasks" },
  connect: { meaning: "Communicate or connect with people" },
  profile: { meaning: "Open identity or personal space" },
  settings: { meaning: "Configure preferences or system behavior" },
  notifications: { meaning: "View updates and alerts" },
  menu: { meaning: "Open navigation or actions" },
  more: { meaning: "Open additional actions" },
  close: { meaning: "Close the current surface" },
  back: { meaning: "Navigate to the previous context" },
  forward: { meaning: "Navigate to the next context" },
  play: { meaning: "Start media playback" },
  pause: { meaning: "Pause media playback" },
  refresh: { meaning: "Reload or synchronize current content" },
  camera: { meaning: "Capture or use camera input" },
  image: { meaning: "Image or visual content" },
  send: { meaning: "Send or submit content" },
  share: { meaning: "Share content or a destination" },
  bookmark: { meaning: "Save content for later" },
  heart: { meaning: "Express positive reaction or appreciation" },
  comment: { meaning: "Open or add discussion" },
} as const;

export type FreshIconName = keyof typeof FRESH_ICON_REGISTRY;

export function isFreshIconName(value: string): value is FreshIconName {
  return value in FRESH_ICON_REGISTRY;
}

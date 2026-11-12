// "Use this sound" (spec Part 5). Pure helpers: the handoff from the Sound page to the camera and the credit line.

export type SoundSource = {
  /** Display name of the sound, stored on the new Short as sound_name. */
  name: string;
  /** The Short the sound is taken from. Stored on the new Short for credit and permission checks. */
  sourceShortId: string;
  sourceAuthorId: string;
  /** Public video URL of the source Short. Played while recording so the new Short can be timed to it. */
  sourceVideoUrl: string;
  /** "@name" of the original creator, for the credit line. */
  creatorLabel: string | null;
};

const KEY = "fresh-shorts-use-sound";
export const USE_SOUND_EVENT = "fresh-shorts-use-sound";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isSoundSource(value: unknown): value is SoundSource {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return typeof v.name === "string" && v.name.trim().length > 0 && v.name.length <= 200 &&
    typeof v.sourceShortId === "string" && UUID.test(v.sourceShortId) &&
    typeof v.sourceAuthorId === "string" && UUID.test(v.sourceAuthorId) &&
    typeof v.sourceVideoUrl === "string" && /^https?:\/\//i.test(v.sourceVideoUrl) &&
    (v.creatorLabel === null || typeof v.creatorLabel === "string");
}

export function creditLine(source: SoundSource): string {
  return source.creatorLabel ? `Original sound: ${source.name} by ${source.creatorLabel}` : `Original sound: ${source.name}`;
}

export type ReuseDecision = { allowed: true } | { allowed: false; reason: string };

/** Mirrors the database rule so the button can explain itself before anything is recorded. */
export function decideReuse(input: { viewerId: string | null; sourceAuthorId: string; reuseAllowed: boolean }): ReuseDecision {
  if (!input.viewerId) return { allowed: false, reason: "Sign in to use this sound." };
  if (input.viewerId === input.sourceAuthorId) return { allowed: true };
  if (!input.reuseAllowed) return { allowed: false, reason: "The creator of this sound does not allow others to use it." };
  return { allowed: true };
}

export function requestUseSound(source: SoundSource): void {
  try { sessionStorage.setItem(KEY, JSON.stringify(source)); } catch { /* storage unavailable: the event below still carries it */ }
  window.dispatchEvent(new CustomEvent(USE_SOUND_EVENT, { detail: source }));
}

export function takeUseSound(): SoundSource | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    sessionStorage.removeItem(KEY);
    const parsed: unknown = JSON.parse(raw);
    return isSoundSource(parsed) ? parsed : null;
  } catch { return null; }
}

/** Plain-language form of a database refusal while publishing. */
export function explainSoundError(message: string | undefined): string | null {
  if (!message) return null;
  if (/does not allow others to use this sound/i.test(message)) return "The creator does not allow others to use this sound.";
  if (/original Short for this sound was not found/i.test(message)) return "The original Short for this sound is no longer available.";
  if (/can'?t use this sound/i.test(message)) return "You can't use this sound.";
  return null;
}

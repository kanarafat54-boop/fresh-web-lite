export type SoundMix = { track: MediaStreamTrack; stop: () => void };

/**
 * Mixes a reused sound with the microphone for "Use this sound". Returns null whenever the browser cannot do it
 * (no Web Audio, blocked autoplay, load failure); the caller then records the microphone only and still credits the
 * original creator. The sound is also played to the speakers so the person can time their performance to it.
 */
export async function startSoundMix(mic: MediaStream, soundUrl: string): Promise<SoundMix | null> {
  try {
    const Ctx: typeof AudioContext | undefined = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return null;
    const context = new Ctx();
    const element = new Audio();
    element.crossOrigin = "anonymous";
    element.src = soundUrl;
    element.preload = "auto";
    const destination = context.createMediaStreamDestination();
    const source = context.createMediaElementSource(element);
    source.connect(destination);
    source.connect(context.destination);
    if (mic.getAudioTracks().length) context.createMediaStreamSource(mic).connect(destination);
    await context.resume();
    await element.play();
    const track = destination.stream.getAudioTracks()[0];
    if (!track) { element.pause(); void context.close(); return null; }
    return { track, stop: () => { element.pause(); element.removeAttribute("src"); element.load(); void context.close(); } };
  } catch {
    return null;
  }
}

export type BrowserSpeechCapability = {
  supported: boolean;
  language: string;
};

export function getBrowserSpeechCapability(language = "en-US"): BrowserSpeechCapability {
  const supported = typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);
  return { supported, language };
}

export function createBrowserSpeechRecognition(language = "en-US") {
  if (typeof window === "undefined") return null;
  const SpeechRecognitionCtor =
    (window as Window & { SpeechRecognition?: new () => any; webkitSpeechRecognition?: new () => any }).SpeechRecognition ??
    (window as Window & { webkitSpeechRecognition?: new () => any }).webkitSpeechRecognition;
  if (!SpeechRecognitionCtor) return null;
  const recognition = new SpeechRecognitionCtor();
  recognition.lang = language;
  recognition.continuous = true;
  recognition.interimResults = true;
  return recognition;
}

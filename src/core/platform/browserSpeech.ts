export type BrowserSpeechCapability = {
  supported: boolean;
  language: string;
};

export type BrowserSpeechRecognitionEvent = {
  results?: ArrayLike<ArrayLike<{ transcript?: string }>>;
};

export type BrowserSpeechRecognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: BrowserSpeechRecognitionEvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionConstructor = new () => BrowserSpeechRecognition;

export function getBrowserSpeechCapability(language = "en-US"): BrowserSpeechCapability {
  const supported =
    typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);
  return { supported, language };
}

export function createBrowserSpeechRecognition(language = "en-US"): BrowserSpeechRecognition | null {
  if (typeof window === "undefined") return null;

  const speechWindow = window as Window & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };

  const SpeechRecognitionCtor = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
  if (!SpeechRecognitionCtor) return null;

  const recognition = new SpeechRecognitionCtor();
  recognition.lang = language;
  recognition.continuous = true;
  recognition.interimResults = true;
  return recognition;
}

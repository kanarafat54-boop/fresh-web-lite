import { useEffect, useMemo, useState } from "react";
import { useLayout } from "../contexts/useLayout";
import { createFreshAIWorkspaceContext, type FreshAIWorkspaceContext } from "../../core/fresh-ai/FreshAIWorkspaceContext";
import "./FreshAIContextPanel.css";

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

const surfaceLabel: Record<string, string> = {
  home: "Home",
  chat: "Chat",
  workspace: "Workspace",
  design: "Design",
  code: "Code",
  media: "Media",
  learning: "Learning",
  wallet: "Wallet",
  creator: "Creator",
  communication: "Chat & Connect",
  marketplace: "Marketplace",
  automation: "Automation",
  trust: "Trust",
  research: "Research",
  social: "Social",
  profile: "Profile",
  admin: "Admin",
  live: "Live",
  other: "Workspace",
};

const actionForCapability: Record<string, string> = {
  chat: "Chat about this",
  research: "Research this",
  write: "Draft this",
  summarize: "Summarize this",
  analyze: "Analyze this",
  plan: "Plan the next step",
  code: "Help with code",
  design: "Improve the design",
  image: "Create an image",
  video: "Work on video",
  audio: "Work on audio",
  learn: "Teach me",
  organize: "Organize this",
  connect: "Find connections",
  search: "Search this",
  automate: "Automate this",
  review: "Review this",
  verify: "Verify this",
  act: "Take the next action",
};

function recognitionConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const browserWindow = window as Window & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return browserWindow.SpeechRecognition ?? browserWindow.webkitSpeechRecognition ?? null;
}

export default function FreshAIContextPanel() {
  const { activeRoute } = useLayout();
  const [listening, setListening] = useState(false);
  const [voiceAvailable, setVoiceAvailable] = useState(false);
  const context = useMemo(() => createFreshAIWorkspaceContext(activeRoute ?? "/"), [activeRoute]);

  useEffect(() => {
    setVoiceAvailable(Boolean(recognitionConstructor()) || (typeof window !== "undefined" && "speechSynthesis" in window));
  }, []);

  function open(prompt?: string) {
    window.dispatchEvent(new CustomEvent("fresh-ai-open", { detail: { prompt } }));
  }

  function startVoice() {
    const Constructor = recognitionConstructor();
    if (!Constructor) {
      open("Use voice mode to help me with this workspace.");
      return;
    }
    const recognition = new Constructor();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = navigator.language || "en-US";
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript?.trim();
      setListening(false);
      if (transcript) open(transcript);
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    setListening(true);
    recognition.start();
  }

  const actions = context.capabilities.filter((capability) => actionForCapability[capability]).slice(0, 6);
  const modelNames = context.models.filter((model) => model.available).map((model) => model.name);

  return (
    <aside className="fresh-ai-context-panel" aria-label="Fresh AI workspace intelligence">
      <div className="fresh-ai-context-head">
        <div>
          <span className="fresh-ai-context-kicker">Fresh AI · {surfaceLabel[context.surface] ?? "Workspace"}</span>
          <strong>Fresh works inside this space</strong>
        </div>
        <button type="button" onClick={() => open()} aria-label="Open Fresh AI">F</button>
      </div>
      <p>
        Context: <b>{context.featureName}</b> · {context.route}. Fresh can use the tools and capabilities mapped to this surface instead of treating it like a generic chat.
      </p>
      <div className="fresh-ai-context-actions">
        {actions.map((capability) => (
          <button key={capability} type="button" onClick={() => open(actionForCapability[capability])}>
            {actionForCapability[capability]}
          </button>
        ))}
        {voiceAvailable && (
          <button type="button" onClick={startVoice} data-listening={listening}>
            {listening ? "Listening…" : "Voice Fresh"}
          </button>
        )}
      </div>
      <div className="fresh-ai-context-meta">
        <span>Model: {context.models.find((model) => model.id === context.activeModelId)?.name ?? "Fresh Auto"}</span>
        <span>Voice: {context.activeVoiceModelId === "browser-voice" ? "Device Voice" : context.activeVoiceModelId}</span>
        <span>{modelNames.length} available model endpoints</span>
      </div>
      <div className="fresh-ai-context-identifiers" aria-label="Fresh AI identifiers">
        <span>surface:{context.surface}</span>
        <span>feature:{context.featureId}</span>
        <span>ctx:v{context.contextVersion}</span>
      </div>
    </aside>
  );
}

export type { FreshAIWorkspaceContext };

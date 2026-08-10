import {
  createUnavailableConnector,
  intelligenceConnectors,
} from "./intelligenceConnectors";
import { webResearchConnector } from "./webResearchConnector";

let registered = false;

/** Register Fresh AI's authorized routing targets exactly once. */
export function registerIntelligenceConnectors(): void {
  if (registered) return;
  registered = true;

  // Web research is available through Fresh Web Lite's own server-side API.
  intelligenceConnectors.register(webResearchConnector);

  // External model connectors are explicit placeholders until their official
  // credentials/SDKs are configured. Fresh AI must never fake connectivity.
  intelligenceConnectors.register(
    createUnavailableConnector("openai", "OpenAI", ["answer", "coding", "research", "orchestration"]),
  );
  intelligenceConnectors.register(
    createUnavailableConnector("anthropic", "Anthropic Claude", ["answer", "coding", "research"]),
  );
  intelligenceConnectors.register(
    createUnavailableConnector("google-gemini", "Google Gemini", ["answer", "coding", "research", "science"]),
  );
  intelligenceConnectors.register(
    createUnavailableConnector("meta-ai", "Meta AI", ["answer", "research", "coding"]),
  );
  intelligenceConnectors.register(
    createUnavailableConnector("alphafold", "AlphaFold", ["biology", "science", "research"]),
  );
  intelligenceConnectors.register(
    createUnavailableConnector("alphadev", "AlphaDev", ["optimization", "coding", "research"]),
  );
}

registerIntelligenceConnectors();

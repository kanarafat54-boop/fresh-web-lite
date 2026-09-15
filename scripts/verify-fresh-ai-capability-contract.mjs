import fs from "node:fs";

const registry = fs.readFileSync("src/core/fresh-ai/FreshAICapabilityRegistry.ts", "utf8");
const contract = fs.readFileSync("docs/FRESH_AI_CAPABILITY_PRODUCT_CONTRACT.md", "utf8");
const model = fs.readFileSync("src/core/fresh-ai/FreshUnifiedModelCore.ts", "utf8");
const ask = fs.readFileSync("api/ai/ask.ts", "utf8");
const suggestions = fs.readFileSync("src/features/ai/components/dashboard/AISuggestionsCard.tsx", "utf8");

const requiredCapabilities = [
  "conversation", "voice", "vision", "search", "research", "creation",
  "files", "data", "code", "projects", "knowledge", "memory", "skills",
  "apps", "work", "tasks", "library", "automation", "media-3d", "trust", "safety",
];

for (const capability of requiredCapabilities) {
  if (!registry.includes(`\"${capability}\"`)) throw new Error(`Missing registry capability: ${capability}`);
}
for (const entry of ["Ask Fresh", "Voice", "Search", "Create", "Research", "Work", "Files", "Camera"]) {
  if (!contract.includes(entry)) throw new Error(`Missing primary entry point: ${entry}`);
}
if (!model.includes('id: "fresh-unified-1"')) throw new Error("Canonical Fresh model identity is missing");
if (!model.includes("externalProviderRequired: false")) throw new Error("Fresh model contract permits external provider dependency");
if (!contract.includes("training-required")) throw new Error("Training gate is missing from capability contract");
if (!registry.includes("VALID_ENTRY_POINTS")) throw new Error("Capability registry lacks entry-point validation");
if (!registry.includes("requiresVerification")) throw new Error("Capability registry lacks verification policy");
if (!registry.includes('status === \"training-required\"')) throw new Error("Capability registry lacks truthful training-required handling");
if (!registry.includes("bypasses verification")) throw new Error("Capability registry must reject verification bypasses");

for (const forbidden of ["GoogleGenAI", "GEMINI_API_KEY", "GOOGLE_GENERATIVE_AI_API_KEY", "generativelanguage.googleapis.com", "gemini-2.5-flash"]) {
  if (ask.includes(forbidden)) throw new Error(`Direct provider dependency remains in canonical ask route: ${forbidden}`);
}
if (suggestions.includes("Connect an external model connector (OpenAI, Anthropic, Gemini)")) {
  throw new Error("Fresh AI dashboard must not present external models as Fresh AI capabilities");
}

console.log("Fresh AI capability product + sovereign canonical entry-point integrity: PASS");

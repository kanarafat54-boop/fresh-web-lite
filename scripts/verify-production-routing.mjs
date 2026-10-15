import fs from "node:fs";

const vercel = JSON.parse(fs.readFileSync("vercel.json", "utf8"));

if (!Array.isArray(vercel.routes)) throw new Error("Vercel routing must use an ordered routes table.");
const routes = vercel.routes;

const apiRoute = routes.find((route) => route.src === "/api/(.*)" && route.dest === "/api/$1");
if (!apiRoute) throw new Error("API routes must be matched before the SPA fallback.");

const filesystemIndex = routes.findIndex((route) => route.handle === "filesystem");
if (filesystemIndex < 0) throw new Error("Vercel routing must allow filesystem/serverless resolution before the SPA fallback.");

const fallbackIndex = routes.findIndex((route) => route.src === "/(.*)" && route.dest === "/index.html");
if (fallbackIndex < 0) throw new Error("SPA fallback to /index.html is required.");
if (filesystemIndex > fallbackIndex) throw new Error("Filesystem resolution must precede the SPA fallback.");
if (routes.indexOf(apiRoute) > filesystemIndex) throw new Error("API routing must precede filesystem/fallback resolution.");

const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));
if (packageJson.scripts?.build !== "vite build") throw new Error("Production build contract changed unexpectedly.");

const journeySource = fs.readFileSync("src/features/product-journey/productJourney.ts", "utf8");
if (!journeySource.includes('return hasSeenWelcome() ? "auth-signin" : "welcome";')) {
  throw new Error("Unauthenticated entry must resolve to Welcome on first visit and Sign In on return visits.");
}
if (!journeySource.includes('if (!isOnboardingDone()) return "onboarding";')) {
  throw new Error("Authenticated users must complete onboarding before entering the main home.");
}

const routerSource = fs.readFileSync("src/app/AppRouter.tsx", "utf8");
if (!routerSource.includes("resolveEntryRoute(false)")) {
  throw new Error("AppRouter must use the canonical entry route resolver to prevent journey drift.");
}

const registrySource = fs.readFileSync("src/app/registry/FeatureRegistry.ts", "utf8");
const unifiedSource = fs.readFileSync("src/app/components/FreshAIUnified.tsx", "utf8");
if (!registrySource.includes('id: "ai", name: "Fresh AI", route: "/ai"') || !registrySource.includes('import("../components/FreshAIUnified")')) {
  throw new Error("The dedicated /ai route must use the canonical unified Fresh AI surface.");
}
if (!unifiedSource.includes('className="fresh-ai-home-return"') || !unifiedSource.includes('window.location.assign("/")')) {
  throw new Error("Fresh AI must provide a working return path to Fresh Home.");
}

const streamSource = fs.readFileSync("api/ai/stream.ts", "utf8");
if (!streamSource.includes("intent: b.intent")) {
  throw new Error("Fresh AI API must forward the selected intent to the intelligence gateway.");
}
if (!unifiedSource.includes('mode: mode.toLowerCase()') || !unifiedSource.includes('model: "fresh-unified-1"')) {
  throw new Error("Fresh AI mode and canonical model identity must influence the request sent to the gateway.");
}
if (!unifiedSource.includes("void submit(userTurn.content)")) {
  throw new Error("Fresh AI retry must replay the prior user prompt after a failed request.");
}
if (!unifiedSource.includes('function regenerate() { const userTurn = [...turns].reverse().find((turn) => turn.role === "user")')) {
  throw new Error("Fresh AI regenerate action must replay the prior user prompt, not the assistant answer.");
}

console.log("Fresh Web Lite production routing gate: PASS");
console.log("API routes resolve before filesystem/SPA fallback; Vite remains the production build contract.");

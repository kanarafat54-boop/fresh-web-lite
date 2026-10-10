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

const aiHomeSource = fs.readFileSync("src/features/ai/components/FreshAIHome.tsx", "utf8");
if (!aiHomeSource.includes('onClick={() => setActiveRoute("fresh-flow")}>Open Fresh Flow</button>')) {
  throw new Error("Fresh AI must provide a working navigation path back into Fresh Flow.");
}

const streamSource = fs.readFileSync("api/ai/stream.ts", "utf8");
if (!streamSource.includes("intent: b.intent")) {
  throw new Error("Fresh AI API must forward the selected intent to the intelligence gateway.");
}
if (!aiHomeSource.includes("intent: ({ chat: \"chat\", research: \"research\", create: \"create\", build: \"code\", learn: \"learn\", act: \"act\" } as const)[mode]")) {
  throw new Error("Fresh AI mode selector must influence the request sent to the gateway.");
}
if (!aiHomeSource.includes('void send(lastPrompt)')) {
  throw new Error("Fresh AI retry must replay the failed prompt after the composer has been cleared.");
}
if (!aiHomeSource.includes("previousUser.content")) {
  throw new Error("Fresh AI regenerate action must replay the prior user prompt, not the assistant answer.");
}

console.log("Fresh Web Lite production routing gate: PASS");
console.log("API routes resolve before filesystem/SPA fallback; Vite remains the production build contract.");

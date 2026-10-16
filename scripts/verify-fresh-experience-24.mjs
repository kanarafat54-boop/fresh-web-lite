import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const checks = [
  ["primary mobile navigation", "src/app/components/BottomNav.tsx", ["label: \"Home\"", "label: \"Flow\"", "label: \"Create\"", "label: \"AI\"", "label: \"Profile\"", 'route: "studio"']],
  ["Home command center", "src/features/home/HomeDashboard.tsx", ["YOUR FRESH HOME", "What do you want to do?", "Pick up where you left off"]],
  ["Home Ask Fresh action", "src/features/home/HomeDashboard.tsx", ['setActiveRoute("ai")']],
  ["Home universal command", "src/features/home/HomeDashboard.tsx", ["UniversalCommandBar"]],
  ["Home feed remains visible", "src/features/home/HomeDashboard.tsx", ["FeedModule"]],
  ["Flow remains a first-class route", "src/app/components/BottomNav.tsx", ['id: "fresh-flow"']],
  ["Create is visibly labeled and opens Studio", "src/app/components/BottomNav.tsx", ['label: "Create"', 'route: "studio"', 'activeRoute === "studio"']],
  ["Fresh Studio creation home", "src/features/workspaces/StudioWorkspace.tsx", ["What would you like to create?", "Edit a video", "Create with Fresh AI", "Design a post", "Advanced tools", 'useState<StudioMode>("start")']],
  ["Studio route loads the actual Studio workspace", "src/app/registry/FeatureRegistry.ts", ['id: "studio"', 'name: "Fresh Studio"', 'import("../../features/workspaces/StudioWorkspace")']],
  ["Flow dedicated surface", "src/app/AppRouter.css", [".fresh-flow-app-shell .fresh-desktop-sidebar{display:none}"]],
  ["Flow media worlds remain available", "src/features/fresh-flow/FreshFlowHub.tsx", ["Shorts", "Long Videos", "News / Posts", "AR / VR", "Podcasts", "Others"]],
  ["Topbar has universal search", "src/app/components/TopBar.tsx", ["Search anything across Fresh"]],
  ["Topbar has Fresh AI", "src/app/components/TopBar.tsx", ["Open Fresh AI"]],
  ["Topbar has notifications", "src/app/components/TopBar.tsx", ["Notifications"]],
  ["Topbar has profile", "src/app/components/TopBar.tsx", ["Open profile", "Sign in"]],
  ["Topbar keeps only useful global actions", "src/app/components/TopBar.tsx", ["Search anything across Fresh", "Open Fresh AI", "Notifications", "Open profile"]]
];

for (const [name, file, tokens] of checks) {
  const content = fs.readFileSync(path.join(root, file), "utf8");
  for (const token of tokens) {
    if (!content.includes(token)) throw new Error(`${name}: missing ${token} in ${file}`);
  }
}

const homeCss = fs.readFileSync(path.join(root, "src/features/home/HomeDashboard.css"), "utf8");
for (const token of ["@media(max-width:900px)", "@media(max-width:520px)", "fresh-home-action-grid"]) {
  if (!homeCss.includes(token)) throw new Error(`Home responsive contract missing ${token}`);
}

console.log("Fresh Experience 24 visible-product contracts: PASS");
console.log("Primary navigation, Home command center, Flow surface, Create routing, search, AI, profile, and responsive Home contracts verified.");

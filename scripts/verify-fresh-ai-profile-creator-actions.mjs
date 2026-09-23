import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const checks = [
  ["src/features/creator/CreatorStudioDashboard.tsx", ["buildCreatorSuggestions", "Suggested next actions", "creator-drafts"]],
  ["src/features/creator/creatorSuggestions.ts", ["return suggestions.slice(0, 4)", "Fresh Creator"]],
  ["src/features/profile/components/UniversalProfile.tsx", ["Suggested next actions", "applyAiSuggestion", "setActiveRoute(\"creator\")"]],
];

for (const [file, tokens] of checks) {
  const full = path.join(root, file);
  if (!fs.existsSync(full)) throw new Error(`Missing ${file}`);
  const source = fs.readFileSync(full, "utf8");
  for (const token of tokens) {
    if (!source.includes(token)) throw new Error(`Missing ${token} in ${file}`);
  }
}

console.log("Fresh AI profile/creator action contract: PASS");

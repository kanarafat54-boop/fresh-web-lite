import { readFileSync } from "node:fs";

const candidate = readFileSync("src/features/profile/services/profileConnectionCandidateService.ts", "utf8");
const files = [
  "src/features/profile/services/profileInsightsService.ts",
  "src/features/profile/services/realProfileService.ts",
  "src/features/profile/components/ProfileView.tsx",
].map((path) => ({ path, content: readFileSync(path, "utf8") }));

if (/\.select\(["']id,username,full_name,avatar,identity,stats["']\)/.test(candidate)) {
  throw new Error("Profile suggestions still request the nonexistent public.users.avatar column.");
}
if (!candidate.includes('.select("id,username,full_name,identity,stats")')) {
  throw new Error("Profile suggestions must use only columns that exist in public.users.");
}
for (const file of files) {
  if (/from\(["']follows["']\)\.select\(["']id["']\s*,\s*\{\s*count:\s*["']exact["']/.test(file.content)) {
    throw new Error(`${file.path} still requests nonexistent follows.id; the real key is follower_id/followed_id.`);
  }
}
console.log("PASS: profile queries use columns present in the live schema.");

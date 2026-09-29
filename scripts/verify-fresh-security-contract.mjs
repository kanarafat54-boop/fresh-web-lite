import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const packageJson = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const supabaseClient = fs.readFileSync(path.join(root, "src/lib/supabase.ts"), "utf8");
const freshId = fs.readFileSync(path.join(root, "src/features/fresh-id/context/FreshIdContext.tsx"), "utf8");
const router = fs.readFileSync(path.join(root, "src/app/AppRouter.tsx"), "utf8");
const workflow = fs.readFileSync(path.join(root, ".github/workflows/fresh-platform-build.yml"), "utf8");

const required = [
  ["Supabase client uses publishable browser env", supabaseClient.includes("VITE_SUPABASE_URL") && supabaseClient.includes("VITE_SUPABASE_ANON_KEY")],
  ["Auth state is restored", freshId.includes("supabase.auth.getSession()")],
  ["Auth state changes are subscribed", freshId.includes("supabase.auth.onAuthStateChange")],
  ["Password sign-in exists", freshId.includes("signInWithPassword")],
  ["Email registration exists", freshId.includes("supabase.auth.signUp")],
  ["Password recovery exists", freshId.includes("resetPasswordForEmail")],
  ["Password update exists", freshId.includes("supabase.auth.updateUser({ password")],
  ["Logout signs out Supabase", freshId.includes("supabase.auth.signOut()")],
  ["Runtime startup boundary exists", router.includes("RuntimeErrorBoundary") || fs.readFileSync(path.join(root, "src/main.tsx"), "utf8").includes("RuntimeErrorBoundary")),
  ["Security contract is part of CI", workflow.includes("test:fresh-security-contract")],
];

const migration = path.join(root, "supabase/migrations/20260929_security_hardening.sql");
required.push(["Security hardening migration is committed", fs.existsSync(migration)]);

const failed = required.filter(([, ok]) => !ok);
if (failed.length) {
  console.error("Fresh security contract failed:");
  for (const [name] of failed) console.error(" -", name);
  process.exit(1);
}
console.log("Fresh security contract passed:", required.length, "checks");

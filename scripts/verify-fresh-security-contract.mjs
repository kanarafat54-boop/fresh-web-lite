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
  ["Runtime startup boundary exists", router.includes("RuntimeErrorBoundary") || fs.readFileSync(path.join(root, "src/main.tsx"), "utf8").includes("RuntimeErrorBoundary")],
  ["Security contract is part of CI", workflow.includes("test:fresh-security-contract")],
];

const migration = path.join(root, "supabase/migrations/20260929_security_hardening.sql");
required.push(["Security hardening migration is committed", fs.existsSync(migration)]);

const roleMigration = fs.readFileSync(path.join(root, "supabase/migrations/20261014104450_identity_enforce_server_managed_roles.sql"), "utf8");
required.push(["Client inserts cannot assign privileged roles", roleMigration.includes("new.role := 'user'") && roleMigration.includes("new.verified := false")]);
required.push(["Client updates cannot change roles or verification", roleMigration.includes("role can only be changed by the platform") && roleMigration.includes("verified can only be changed by the platform")]);

const subscriptionMigration = fs.readFileSync(path.join(root, "supabase/migrations/20261014104622_identity_lock_server_managed_subscription.sql"), "utf8");
const profileBoundaryMigration = fs.readFileSync(path.join(root, "supabase/migrations/20261014125108_fresh_id_profile_column_boundary.sql"), "utf8");

required.push(["Subscription entitlements are server-managed", subscriptionMigration.includes("new.subscription is distinct from old.subscription") && subscriptionMigration.includes("subscription can only be changed by the platform")]);
required.push(["Profile table writes are restricted to editable columns", profileBoundaryMigration.includes("revoke insert, update on table public.users from public, anon, authenticated") && profileBoundaryMigration.includes("grant insert (id, username, email, full_name, preferences) on table public.users to authenticated") && profileBoundaryMigration.includes("grant update (username, full_name, preferences, identity, updated_at) on table public.users to authenticated")]);
required.push(["Profile insert cannot assign server-managed values", profileBoundaryMigration.includes("new.subscription := jsonb_build_object") && profileBoundaryMigration.includes("new.linked_accounts := '[]'::jsonb") && profileBoundaryMigration.includes("new.email := v_jwt_email") && profileBoundaryMigration.includes("new.identity -> 'kycStatus'")]);
required.push(["Browser profile provision sends only editable columns", freshId.includes('supabase.from("users").insert({') && !freshId.includes('update({ linked_accounts: nextLinkedAccounts })')]);
const profileInsertStart = freshId.indexOf('supabase.from("users").insert({');
const profileInsertEnd = freshId.indexOf("});", profileInsertStart);
const profileInsert = freshId.slice(profileInsertStart, profileInsertEnd);
required.push(["Browser cannot request privileged profile fields during provisioning", !["role:", "verified:", "identity:", "stats:", "security:", "subscription:", "linked_accounts:"].some((field) => profileInsert.includes(field))]);
required.push(["Profile update API is typed to editable fields only", freshId.includes('type EditableProfilePatch = Pick<Partial<FreshUser>, "fullName" | "username" | "preferences">') && freshId.includes("updateUser(patch: EditableProfilePatch)")]);

const failed = required.filter(([, ok]) => !ok);
if (failed.length) {
  console.error("Fresh security contract failed:");
  for (const [name] of failed) console.error(" -", name);
  process.exit(1);
}
console.log("Fresh security contract passed:", required.length, "checks");

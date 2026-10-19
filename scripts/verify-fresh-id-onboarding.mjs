import { readFile } from "node:fs/promises";

const checks = [
  ["src/features/fresh-id/components/AuthForm.tsx", [
    [/What kind of Fresh account do you need\?/, "signup offers an explicit account-type choice"],
    [/value="personal"/, "personal accounts are available"],
    [/value="creator"/, "creator accounts are available"],
    [/value="business"/, "business accounts are available"],
    [/value="developer"/, "developer accounts are available"],
    [/value="organization"/, "organization accounts are available"],
    [/Confirm password/, "signup confirms the password before submission"],
    [/password !== confirmPassword/, "mismatched passwords are rejected"],
    [/showPassword \? "text" : "password"/, "password visibility is user controlled"],
    [/setAuthView\("forgot-password"\)/, "password recovery remains reachable from login"],
  ]],
  ["src/features/fresh-id/context/FreshIdContext.tsx", [
    [/fresh_account_type: accountType/, "signup choice persists in auth metadata for post-confirmation onboarding"],
    [/preferredWorkspaceMode/, "account mode is stored as a preference, not a privileged platform role"],
    [/create_fresh_id_account/, "non-personal account types attempt real workspace creation after authenticated profile provisioning"],
    [/Password must be at least 12 characters|Use at least 12 characters/, "password length is enforced in the auth flow"],
    [/setAuthView\("reset-password"\)/, "password recovery events open the reset-password flow"],
    [/resetPasswordForEmail/, "recovery email uses the auth provider"],
    [/updateUser\(\{ password: newPassword \}\)/, "recovery completion updates the provider password"],
  ]],
  ["src/features/workspaces/SettingsWorkspace.tsx", [
    [/create_fresh_id_account/, "users can retry workspace creation from Settings"],
    [/setWorkspaceMode\(user\.preferences\.preferredWorkspaceMode\)/, "settings reflects the selected onboarding mode"],
    [/async function changePassword\(/, "settings offers a direct password-change flow"],
    [/signInWithPassword\(\{\s*email: user\.email,\s*password: currentPassword/s, "password changes verify the current password first"],
    [/updateUser\(\{ password: newPassword \}\)/, "settings submits the new password to Supabase Auth"],
    [/newPassword !== confirmNewPassword/, "settings rejects mismatched new passwords"],
    [/fresh-settings-password-form/, "password settings use a dedicated responsive form"],
  ]],
];

let failures = 0;
for (const [file, rules] of checks) {
  const source = await readFile(file, "utf8");
  for (const [pattern, label] of rules) {
    if (pattern.test(source)) console.log(`PASS: ${label}`);
    else {
      console.error(`FAIL: ${label} (${file})`);
      failures += 1;
    }
  }
}
if (failures) {
  console.error(`Fresh ID onboarding contract failed: ${failures} check(s).`);
  process.exitCode = 1;
} else {
  console.log("Fresh ID onboarding contract passed. This static contract does not replace real email-confirmation, password-recovery, and signed-in workspace integration tests.");
}

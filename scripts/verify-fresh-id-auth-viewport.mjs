import { readFile } from "node:fs/promises";

const css = await readFile("src/features/fresh-id/components/FreshIdAuthDashboard.css", "utf8");
const dashboard = await readFile("src/features/fresh-id/components/FreshIdAuthDashboard.tsx", "utf8");
const form = await readFile("src/features/fresh-id/components/AuthForm.tsx", "utf8");
const checks = [
  [css.includes("overflow-x: clip !important") && css.includes("overflow-y: visible !important"), "gateway no longer clips tall authentication content"],
  [css.includes("height: auto;") && css.includes("min-height: 100dvh"), "gateway expands beyond the viewport when necessary"],
  [css.includes("env(safe-area-inset-bottom)") && css.includes("env(safe-area-inset-top)"), "safe-area insets are considered"],
  [css.includes("@media (max-width: 760px)") && css.includes("@media (max-width: 380px)"), "small and extra-small mobile layouts are covered"],
  [css.includes("@media (max-height: 620px)"), "short landscape/keyboard-constrained viewports are covered"],
  [css.includes("scroll-margin-bottom") && css.includes("min-height: 44px"), "focused controls remain reachable and touch targets remain usable"],
  [dashboard.includes("fresh-id-gateway-bottom") && dashboard.includes("fresh-id-screen-form"), "authentication content and navigation remain present"],
  [form.includes("auth-social-grid") && form.includes("auth-policy-check") && form.includes("Forgot password?"), "provider, privacy acceptance, and recovery controls remain in the form"],
];
let failures = 0;
for (const [passed, label] of checks) {
  if (passed) console.log(`PASS: ${label}`);
  else { console.error(`FAIL: ${label}`); failures += 1; }
}
if (failures) process.exitCode = 1;
else console.log("Fresh ID viewport accessibility contract passed. Real-device visual and keyboard testing is still required.");

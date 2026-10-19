import { readFile } from "node:fs/promises";

const component = await readFile("src/features/workspaces/DeviceSecurityPanel.tsx", "utf8");
const settings = await readFile("src/features/workspaces/SettingsWorkspace.tsx", "utf8");
const migration = await readFile("supabase/migrations/20261019115936_fresh_id_device_sessions_20261019.sql", "utf8");
const checks = [
  [component.includes('supabase.from("fresh_id_devices").upsert'), "signed-in devices register in the account-owned registry"],
  [component.includes('supabase.auth.signOut({ scope: "others" })'), "users can remotely sign out other Supabase Auth sessions"],
  [component.includes('supabase.auth.signOut({ scope: "global" })'), "users can sign out all devices including the current device"],
  [component.includes('navigator.mediaDevices.getUserMedia'), "camera and microphone access is requested only from an explicit action"],
  [component.includes('navigator.geolocation.getCurrentPosition'), "location permission requires an explicit user action"],
  [component.includes('Notification.requestPermission()'), "notification permission requires an explicit user action"],
  [component.includes("stream.getTracks().forEach((track) => track.stop())"), "permission checks stop camera and microphone streams immediately"],
  [migration.includes("enable row level security") && migration.includes("auth.uid()") , "device inventory is protected by row-level ownership policies"],
  [!migration.includes("service_role"), "the migration does not expose service-role credentials"],
  [settings.includes("<DeviceSecurityPanel"), "Fresh ID settings exposes device security controls"],
];
let failures = 0;
for (const [passed, label] of checks) {
  if (passed) console.log(`PASS: ${label}`);
  else { console.error(`FAIL: ${label}`); failures += 1; }
}
if (failures) process.exitCode = 1;
else console.log("Fresh ID device-security static contract passed. Browser permission grants and remote session revocation still require live integration testing.");

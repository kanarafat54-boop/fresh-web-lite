import { readFile } from "node:fs/promises";

const required = [
  ["src/features/workspaces/messagingService.ts", [
    [/export async function subscribeToThread\(/, "direct-message threads expose a realtime subscription"],
    [/schema: "public", table: "direct_messages"/, "realtime events are scoped to direct messages"],
    [/await assertMessagingAllowed\(otherUserId, myId\)/, "subscriptions require an accepted connection"],
    [/supabase\.removeChannel\(channel\)/, "conversation subscriptions clean up their channel"],
  ]],
  ["src/features/workspaces/CommunicationWorkspace.tsx", [
    [/subscribeToThread\(activeThreadUserId/, "the UI subscribes to the active thread"],
    [/setInterval\(\(\) => \{/, "the UI has a degraded-network polling fallback"],
    [/current\.some\(\(item\) => item\.id === message\.id\)/, "send and realtime delivery are deduplicated"],
    [/clearInterval\(fallbackTimer\)/, "fallback polling is cleaned up when leaving a thread"],
  ]],
  ["supabase/migrations/20261019101500_direct_message_realtime_publication.sql", [
    [/alter publication supabase_realtime add table public\.direct_messages/i, "the migration enables direct-message event transport"],
    [/pg_publication_tables/i, "the publication migration is idempotent"],
    [/row-level security remains the authorization boundary/i, "the migration documents the RLS boundary"],
  ]],
];

let failures = 0;
for (const [file, checks] of required) {
  const source = await readFile(file, "utf8");
  for (const [pattern, label] of checks) {
    if (!pattern.test(source)) {
      console.error(`FAIL: ${label} (${file})`);
      failures += 1;
    } else {
      console.log(`PASS: ${label}`);
    }
  }
}
if (failures) {
  console.error(`Fresh platform parity contract failed: ${failures} check(s).`);
  process.exitCode = 1;
} else {
  console.log("Fresh platform parity contract passed. This static check does not replace signed-in two-user realtime and RLS integration tests.");
}

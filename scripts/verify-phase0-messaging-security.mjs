import { readFile } from "node:fs/promises";

const required = [
  ["supabase/migrations/20261014194500_harden_phase0_messaging_access.sql", [
    [/revoke all privileges on table public\.direct_messages from public, anon, authenticated/i, "direct-message browser grants are revoked before least-privilege grants"],
    [/create policy "direct messages sender insert"[\s\S]*?to authenticated[\s\S]*?with check/i, "direct-message inserts are authenticated"],
    [/cr\.status = 'accepted'/i, "direct-message policy requires an accepted connection"],
    [/create policy "fresh message owner insert"[\s\S]*?with check[\s\S]*?t\.owner_id = \(select auth\.uid\(\)\)/i, "messages can only be inserted into the owner's thread"],
    [/drop policy if exists "fresh message sender"/i, "old broad message policy is removed"],
  ]],
  ["supabase/migrations/20261014195500_harden_connection_request_transitions.sql", [
    [/revoke all privileges on table public\.connection_requests from public, anon, authenticated/i, "connection request browser grants are revoked"],
    [/grant update \(status\) on table public\.connection_requests to authenticated/i, "only status has browser UPDATE privilege"],
    [/create policy "connection requests recipient response"[\s\S]*?using[\s\S]*?auth\.uid\(\)\) = recipient_id[\s\S]*?with check[\s\S]*?status in \('accepted', 'declined'\)/i, "only the recipient can accept or decline"],
    [/create policy "connection requests requester state transition"[\s\S]*?status in \('pending', 'declined', 'cancelled'\)[\s\S]*?with check[\s\S]*?status in \('pending', 'cancelled'\)/i, "requester cannot self-accept"],
  ]],
];

let failures = 0;
for (const [path, checks] of required) {
  const source = await readFile(path, "utf8");
  for (const [pattern, label] of checks) {
    if (!pattern.test(source)) {
      console.error(`FAIL: ${label} (${path})`);
      failures += 1;
    } else {
      console.log(`PASS: ${label}`);
    }
  }
}
if (failures) {
  console.error(`Phase 0 security contract failed: ${failures} check(s).`);
  process.exitCode = 1;
} else {
  console.log("Phase 0 security migration source contracts passed. This is not a substitute for pgTAP/live authorization tests.");
}

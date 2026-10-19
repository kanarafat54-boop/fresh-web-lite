import { readFile } from "node:fs/promises";

const required = [
  ["supabase/migrations/20261014194500_harden_phase0_messaging_access.sql", [
    [/drop policy if exists "fresh thread owner select"/i, "thread policies can safely replay"],
    [/drop policy if exists "fresh message thread owner select"/i, "message policies can safely replay"],
    [/alter table public\.direct_messages enable row level security/i, "RLS is explicitly enabled for direct messages"],
    [/alter table public\.fresh_communication_threads enable row level security/i, "RLS is explicitly enabled for Fresh Communication threads"],
    [/alter table public\.fresh_communication_messages enable row level security/i, "RLS is explicitly enabled for Fresh Communication messages"],
    [/revoke all privileges on table public\.direct_messages from public, anon, authenticated/i, "direct-message browser grants are revoked before least-privilege grants"],
    [/create policy "direct messages sender insert"[\s\S]*?to authenticated[\s\S]*?with check/i, "direct-message inserts are authenticated"],
    [/cr\.status = 'accepted'/i, "direct-message policy requires an accepted connection"],
    [/create policy "fresh message owner insert"[\s\S]*?with check[\s\S]*?t\.owner_id = \(select auth\.uid\(\)\)/i, "messages can only be inserted into the owner's thread"],
    [/drop policy if exists "fresh message sender"/i, "old broad message policy is removed"],
  ]],
  ["supabase/migrations/20261014200500_harden_ecosystem_profile_grants.sql", [
    [/alter table public\.ecosystem_profiles enable row level security/i, "RLS is explicitly enabled for ecosystem profiles"],
    [/revoke all privileges on table public\.ecosystem_profiles from public, anon, authenticated/i, "ecosystem profile browser grants are reset"],
    [/grant select on table public\.ecosystem_profiles to anon/i, "public enabled-profile reads remain available"],
    [/grant select, insert, update on table public\.ecosystem_profiles to authenticated/i, "signed-in profile operations are explicit"],
    [/drop policy if exists "users can update their ecosystem profiles"/i, "duplicate ecosystem profile update policy is removed"],
  ]],
  ["src/features/workspaces/connectionService.ts", [
    [/existing\?\.status === "accepted" \|\| existing\?\.status === "pending"/i, "request sending is idempotent for accepted/pending connections"],
    [/\.update\(\{ status: "pending" \}\)[\s\S]*?\.in\("status", \["declined", "cancelled"\]\)/i, "re-sending a declined/cancelled request updates only its status"],
    [/error\?\.code === "23505"[\s\S]*?concurrentLookupError/i, "concurrent duplicate request creation recovers by reading the winning row"],
  ]],
  ["supabase/migrations/20261014194000_harden_connection_request_transitions.sql", [
    [/drop policy if exists "connection requests requester state transition"/i, "connection-request migration can safely replay after its state policies already exist"],
    [/drop policy if exists "connection requests recipient response"/i, "recipient-response policy is replaced safely on replay"],
    [/alter table public\.connection_requests enable row level security/i, "RLS is explicitly enabled for connection requests"],
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

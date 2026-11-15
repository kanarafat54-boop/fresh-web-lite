import assert from "node:assert/strict";
import { generateToken } from "../src/server/machine/machineGateway.ts";
import { checkIssueRequest, planIssue, presentMachines } from "../src/server/machine/machineAdmin.ts";
import { can, normalizeRole, hasStaffAccess, checkRoleChange, presentPeople, ASSIGNABLE_ROLES } from "../src/server/adminAccess.ts";

assert.equal(normalizeRole("owner"), "owner");
assert.equal(normalizeRole("admin"), "admin");
for (const bad of ["root", "ADMIN", null, undefined, 7, {}]) assert.equal(normalizeRole(bad), "user", `unknown role ${String(bad)} is a plain user`);

for (const cap of ["overview", "list-people", "see-emails", "edit-people", "change-roles", "review", "owner-settings"]) assert.equal(can("owner", cap), true, `owner can ${cap}`);
assert.deepEqual(["overview", "list-people", "review"].map((c) => can("admin", c)), [true, true, true]);
for (const cap of ["see-emails", "edit-people", "change-roles", "owner-settings"]) assert.equal(can("admin", cap), false, `admin cannot ${cap}`);
for (const cap of ["overview", "list-people", "review", "change-roles"]) assert.equal(can("user", cap), false);
assert.equal(hasStaffAccess("user"), false);
assert.equal(hasStaffAccess("admin"), true);
assert.equal(hasStaffAccess("owner"), true);
assert.deepEqual([...ASSIGNABLE_ROLES], ["user", "admin"]);

const ok = checkRoleChange("o", "owner", { id: "u", role: "user" }, "admin");
assert.equal(ok.ok, true);
assert.equal(checkRoleChange("a", "admin", { id: "u", role: "user" }, "admin").ok, false, "admins cannot change roles");
assert.equal(checkRoleChange("a", "admin", { id: "u", role: "user" }, "admin").status, 403);
assert.equal(checkRoleChange("o", "owner", { id: "u", role: "user" }, "owner").ok, false, "owner cannot be assigned");
assert.equal(checkRoleChange("o", "owner", { id: "u", role: "user" }, "root").status, 400);
assert.equal(checkRoleChange("o", "owner", { id: "x", role: "owner" }, "user").status, 403, "the owner cannot be demoted");
assert.equal(checkRoleChange("o", "owner", { id: "o", role: "owner" }, "admin").ok, false);
assert.equal(checkRoleChange("u0", "user", { id: "u", role: "user" }, "admin").ok, false);

const rows = [{ id: "1", full_name: "A", username: "a", email: "a@x.com", role: "user", verified: false, presence: "online", created_at: "2026-01-01" }];
assert.equal(presentPeople("owner", rows)[0].email, "a@x.com");
assert.equal(presentPeople("admin", rows)[0].email, null);
assert.equal(presentPeople("user", rows)[0].email, null);
assert.equal(rows[0].email, "a@x.com", "input is not mutated");
console.log("admin access: ok");

// Machine access is owner-only.
assert.equal(can("owner", "machine-access"), true);
assert.equal(can("admin", "machine-access"), false);
assert.equal(can("user", "machine-access"), false);

const good = checkIssueRequest({ name: "Weather bot", purpose: "Reads public Shorts", scopes: ["shorts:read"], days: 30, rate: 60 });
assert.equal(good.ok, true);
for (const bad of [
  { name: "x", purpose: "long enough", scopes: ["shorts:read"] },
  { name: "ok name", purpose: "no", scopes: ["shorts:read"] },
  { name: "ok name", purpose: "long enough", scopes: [] },
  { name: "ok name", purpose: "long enough", scopes: ["admin:all"] },
  { name: "ok name", purpose: "long enough", scopes: ["shorts:read", "admin:all"] },
  { name: "ok name", purpose: "long enough", scopes: ["shorts:read"], days: 365 },
  { name: "ok name", purpose: "long enough", scopes: ["shorts:read"], days: 0 },
  { name: "ok name", purpose: "long enough", scopes: ["shorts:read"], rate: 9999 },
]) assert.equal(checkIssueRequest(bad).ok, false, JSON.stringify(bad));

const now = new Date("2026-11-15T00:00:00Z");
const plan = planIssue("owner-1", good.value, generateToken, now);
const row = plan.credential("p-1");
assert.match(plan.token, /^fwm_[A-Za-z0-9_-]{43}$/);
assert.equal(row.token_prefix, plan.token.slice(0, 8));
assert.match(row.token_hash, /^[0-9a-f]{64}$/);
assert.ok(!JSON.stringify(row).includes(plan.token), "the token itself is never in the stored row");
assert.equal(row.expires_at, "2026-12-15T00:00:00.000Z");

const view = presentMachines(
  [{ id: "p-1", name: "n", purpose: "purpose", disabled_at: null, created_at: "x" }],
  [
    { id: "c1", principal_id: "p-1", token_prefix: "fwm_aaaa", scopes: ["shorts:read"], rate_limit_per_minute: 60, expires_at: "2027-01-01T00:00:00Z", revoked_at: null, last_used_at: null, created_at: "x" },
    { id: "c2", principal_id: "p-1", token_prefix: "fwm_bbbb", scopes: ["shorts:read"], rate_limit_per_minute: 60, expires_at: "2027-01-01T00:00:00Z", revoked_at: "2026-11-01T00:00:00Z", last_used_at: null, created_at: "x" },
    { id: "c3", principal_id: "p-1", token_prefix: "fwm_cccc", scopes: ["shorts:read"], rate_limit_per_minute: 60, expires_at: "2026-01-01T00:00:00Z", revoked_at: null, last_used_at: null, created_at: "x" },
  ],
  now,
);
assert.deepEqual(view[0].credentials.map((c) => c.status), ["active", "revoked", "expired"]);
assert.ok(!JSON.stringify(view).includes("token_hash"));
console.log("machine access admin ok");

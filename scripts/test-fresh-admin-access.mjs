import assert from "node:assert/strict";
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

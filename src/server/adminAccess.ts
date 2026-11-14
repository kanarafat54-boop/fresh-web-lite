/**
 * Who may do what on Fresh. One owner has total control; admins have limited access.
 *
 *   owner : everything, including changing other people's profile and role, and the owner-only areas.
 *   admin : review queue and appeals, Fresh AI correction review, platform overview numbers, and a people
 *           list with email addresses hidden. Admins cannot change roles or profiles.
 *   user  : none of the above.
 *
 * The database also refuses to create or remove the owner role from the API (see guard_owner_role).
 */
export type PlatformRole = "user" | "admin" | "owner";
export type AdminCapability = "overview" | "list-people" | "see-emails" | "edit-people" | "change-roles" | "review" | "owner-settings";

const CAPABILITIES: Record<PlatformRole, readonly AdminCapability[]> = {
  user: [],
  admin: ["overview", "list-people", "review"],
  owner: ["overview", "list-people", "see-emails", "edit-people", "change-roles", "review", "owner-settings"],
};

export function normalizeRole(value: unknown): PlatformRole {
  return value === "owner" || value === "admin" ? value : "user";
}

export function can(role: unknown, capability: AdminCapability): boolean {
  return CAPABILITIES[normalizeRole(role)].includes(capability);
}

export const hasStaffAccess = (role: unknown): boolean => normalizeRole(role) !== "user";

/** Roles that can be assigned through the API. The owner role is never assignable. */
export const ASSIGNABLE_ROLES = ["user", "admin"] as const;

export type RoleChangeCheck = { ok: true } | { ok: false; status: number; error: string };

export function checkRoleChange(actorId: string, actorRole: unknown, target: { id: string; role: unknown }, newRole: unknown): RoleChangeCheck {
  if (!can(actorRole, "change-roles")) return { ok: false, status: 403, error: "Only the owner can change roles." };
  if (!(ASSIGNABLE_ROLES as readonly unknown[]).includes(newRole)) return { ok: false, status: 400, error: "That role cannot be assigned." };
  if (normalizeRole(target.role) === "owner") return { ok: false, status: 403, error: "The owner's role cannot be changed here." };
  if (target.id === actorId) return { ok: false, status: 400, error: "You cannot change your own role." };
  return { ok: true };
}

export type PersonRow = { id: string; full_name: string; username: string; email: string; role: string; verified: boolean; presence: string; created_at: string };

/** Admins see people without email addresses. The owner sees everything. */
export function presentPeople(actorRole: unknown, rows: PersonRow[]): Array<Omit<PersonRow, "email"> & { email: string | null }> {
  const showEmail = can(actorRole, "see-emails");
  return rows.map((row) => ({ ...row, email: showEmail ? row.email : null }));
}

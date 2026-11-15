export type TokenMaker = () => { token: string; prefix: string; hash: string };

export const MACHINE_SCOPES = ["shorts:read", "proof:read"] as const;
export type MachineScope = (typeof MACHINE_SCOPES)[number];

export type IssueInput = { name: string; purpose: string; scopes: MachineScope[]; days: number; rate: number };
export type IssueCheck = { ok: true; value: IssueInput } | { ok: false; error: string };

/** Validates an owner's request to issue a machine credential. Limits mirror the database checks, so a bad request fails here with a readable message. */
export function checkIssueRequest(raw: Record<string, unknown>): IssueCheck {
  const name = typeof raw.name === "string" ? raw.name.trim() : "";
  const purpose = typeof raw.purpose === "string" ? raw.purpose.trim() : "";
  if (name.length < 2 || name.length > 80) return { ok: false, error: "Name must be 2 to 80 characters." };
  if (purpose.length < 5 || purpose.length > 300) return { ok: false, error: "Purpose must be 5 to 300 characters." };
  const scopesRaw = Array.isArray(raw.scopes) ? raw.scopes : [];
  const scopes = [...new Set(scopesRaw)].filter((s): s is MachineScope => (MACHINE_SCOPES as readonly unknown[]).includes(s));
  if (scopes.length === 0 || scopes.length !== new Set(scopesRaw).size) return { ok: false, error: "Choose at least one known scope." };
  const days = Number(raw.days ?? 30);
  if (!Number.isInteger(days) || days < 1 || days > 90) return { ok: false, error: "Credentials last 1 to 90 days." };
  const rate = Number(raw.rate ?? 60);
  if (!Number.isInteger(rate) || rate < 1 || rate > 600) return { ok: false, error: "Rate limit is 1 to 600 requests a minute." };
  return { ok: true, value: { name, purpose, scopes, days, rate } };
}

export type IssuePlan = {
  principal: { owner_id: string; name: string; purpose: string };
  credential: (principalId: string) => { principal_id: string; token_prefix: string; token_hash: string; scopes: string[]; rate_limit_per_minute: number; expires_at: string };
  token: string;
};

/** Builds the rows to insert. The token is returned once and only its hash goes into the row. */
export function planIssue(ownerId: string, input: IssueInput, generateToken: TokenMaker, now: Date = new Date()): IssuePlan {
  const t = generateToken();
  return {
    principal: { owner_id: ownerId, name: input.name, purpose: input.purpose },
    credential: (principalId) => ({ principal_id: principalId, token_prefix: t.prefix, token_hash: t.hash, scopes: input.scopes, rate_limit_per_minute: input.rate, expires_at: new Date(now.getTime() + input.days * 86400000).toISOString() }),
    token: t.token,
  };
}

export type CredentialRow = { id: string; principal_id: string; token_prefix: string; scopes: string[]; rate_limit_per_minute: number; expires_at: string; revoked_at: string | null; last_used_at: string | null; created_at: string };
export type PrincipalRow = { id: string; name: string; purpose: string; disabled_at: string | null; created_at: string };

export type MachineView = PrincipalRow & { credentials: Array<Omit<CredentialRow, "principal_id"> & { status: "active" | "revoked" | "expired" }> };

/** Shapes principals with their credentials for the owner page. Never includes a hash. */
export function presentMachines(principals: PrincipalRow[], credentials: CredentialRow[], now: Date = new Date()): MachineView[] {
  return principals.map((p) => ({
    ...p,
    credentials: credentials.filter((c) => c.principal_id === p.id).map(({ principal_id: _drop, ...c }) => ({
      ...c,
      status: c.revoked_at ? "revoked" as const : new Date(c.expires_at) <= now ? "expired" as const : "active" as const,
    })),
  }));
}

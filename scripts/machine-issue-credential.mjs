// Owner-run: creates a machine principal and one credential, printing the token ONCE.
// Usage: node --experimental-strip-types --no-warnings scripts/machine-issue-credential.mjs \
//   --owner <uuid> --name "Partner bot" --purpose "Reads public Shorts" --scopes shorts:read,proof:read --days 30 [--rate 60]
// Needs SUPABASE_URL and a service key in the environment. The token is never stored, only its hash.
import { generateToken } from "../src/server/machine/machineGateway.ts";

const args = Object.fromEntries(process.argv.slice(2).reduce((acc, v, i, all) => (v.startsWith("--") ? [...acc, [v.slice(2), all[i + 1]]] : acc), []));
const url = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || "").replace(/\/$/, "");
const key = process.env.SUPABASE_SECRET_KEY_FRESHWEBLITE || process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const scopes = String(args.scopes || "").split(",").map((s) => s.trim()).filter(Boolean);
const days = Number(args.days || 30);
if (!url || !key) throw new Error("Set SUPABASE_URL and a service key.");
if (!args.owner || !args.name || !args.purpose || !scopes.length) throw new Error("Required: --owner --name --purpose --scopes");
if (!Number.isInteger(days) || days < 1 || days > 365) throw new Error("--days must be 1-365");

const rest = async (path, body) => {
  const res = await fetch(`${url}/rest/v1/${path}`, { method: "POST", headers: { apikey: key, authorization: `Bearer ${key}`, "content-type": "application/json", prefer: "return=representation" }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(`${path}: ${res.status} ${await res.text()}`);
  return res.json();
};
const [principal] = await rest("machine_principals", { owner_id: args.owner, name: args.name, purpose: args.purpose });
const t = generateToken();
const [cred] = await rest("machine_credentials", { principal_id: principal.id, token_prefix: t.prefix, token_hash: t.hash, scopes, rate_limit_per_minute: Number(args.rate || 60), expires_at: new Date(Date.now() + days * 86400000).toISOString() });
console.log(JSON.stringify({ principal_id: principal.id, credential_id: cred.id, expires_at: cred.expires_at, scopes, token: t.token, note: "Shown once. Store it now; it cannot be recovered." }, null, 2));

import { useEffect, useState } from "react";

type Credential = { id: string; token_prefix: string; scopes: string[]; rate_limit_per_minute: number; expires_at: string; revoked_at: string | null; last_used_at: string | null; status: "active" | "revoked" | "expired" };
type Machine = { id: string; name: string; purpose: string; disabled_at: string | null; created_at: string; credentials: Credential[] };
type Call = (body: Record<string, unknown>) => Promise<Record<string, unknown>>;

const SCOPES = ["shorts:read", "proof:read"];

/** Owner-only. Issues, revokes and disables machine credentials. A new token is shown once and never stored. */
export function MachineAccessPanel({ call }: { call: Call }) {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [issued, setIssued] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [purpose, setPurpose] = useState("");
  const [scopes, setScopes] = useState<string[]>(["shorts:read"]);
  const [days, setDays] = useState(30);

  async function load() {
    try { setMachines(((await call({ action: "machine-list" })).machines as Machine[]) ?? []); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not load machine access."); }
  }
  useEffect(() => { void load(); }, []);

  async function run(body: Record<string, unknown>) {
    setBusy(true); setError(null);
    try { const out = await call(body); if (typeof out.token === "string") setIssued(out.token); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : "Request failed."); }
    finally { setBusy(false); }
  }

  return (
    <section aria-label="Machine access" style={{ marginTop: 28 }}>
      <h3>Machine access</h3>
      <p className="empty-state" style={{ marginTop: 0 }}>Credentials let a program read Fresh data with limits. Only you can issue or revoke them.</p>
      {error && <p className="auth-error">{error}</p>}
      {issued && (
        <div style={{ border: "1px solid rgba(0,0,0,.2)", borderRadius: 12, padding: 12, margin: "10px 0" }}>
          <strong>Copy this token now. It is shown once and cannot be recovered.</strong>
          <code style={{ display: "block", wordBreak: "break-all", margin: "8px 0" }}>{issued}</code>
          <button className="auth-submit-btn" onClick={() => setIssued(null)}>I have stored it</button>
        </div>
      )}
      <form onSubmit={(e) => { e.preventDefault(); void run({ action: "machine-issue", name, purpose, scopes, days }); setName(""); setPurpose(""); }} style={{ display: "grid", gap: 8, maxWidth: 460 }}>
        <input className="auth-input" placeholder="Machine name" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} maxLength={80} />
        <input className="auth-input" placeholder="What it is for" value={purpose} onChange={(e) => setPurpose(e.target.value)} required minLength={5} maxLength={300} />
        <div>{SCOPES.map((s) => <label key={s} style={{ marginRight: 14 }}><input type="checkbox" checked={scopes.includes(s)} onChange={(e) => setScopes((cur) => e.target.checked ? [...cur, s] : cur.filter((x) => x !== s))} /> {s}</label>)}</div>
        <label>Lasts <input className="auth-input" type="number" min={1} max={90} value={days} onChange={(e) => setDays(Number(e.target.value))} style={{ width: 80, display: "inline-block" }} /> days</label>
        <button className="auth-submit-btn" disabled={busy || scopes.length === 0}>Issue credential</button>
      </form>
      {machines.length === 0 && <p className="empty-state">No machines yet.</p>}
      {machines.map((m) => (
        <div className="admin-user-card" key={m.id} style={{ display: "block", marginTop: 12 }}>
          <strong>{m.name}</strong> {m.disabled_at ? <em>(disabled)</em> : null}
          <div className="post-username">{m.purpose}</div>
          <button className="auth-submit-btn" disabled={busy} onClick={() => void run({ action: "machine-disable", principalId: m.id, disable: !m.disabled_at })}>{m.disabled_at ? "Enable" : "Disable"}</button>
          {m.credentials.map((c) => (
            <div key={c.id} style={{ fontSize: 13, marginTop: 6 }}>
              {c.token_prefix}… · {c.scopes.join(", ")} · {c.status} · expires {new Date(c.expires_at).toLocaleDateString()}{c.last_used_at ? ` · last used ${new Date(c.last_used_at).toLocaleString()}` : " · never used"}
              {c.status === "active" && <button className="auth-submit-btn" style={{ marginLeft: 8 }} disabled={busy} onClick={() => void run({ action: "machine-revoke", credentialId: c.id })}>Revoke</button>}
            </div>
          ))}
        </div>
      ))}
    </section>
  );
}

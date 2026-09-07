import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useFreshId } from "../fresh-id/context/FreshIdContext";

type AdminUser = { id: string; full_name: string; username: string; email: string; role: string; verified: boolean; presence: string; created_at: string };
type OverviewMetric = { label: string; value: number };
type AdminPayload = { users?: AdminUser[]; user?: AdminUser; metrics?: OverviewMetric[]; generatedAt?: string; error?: string };

export function AdminPanel() {
  const { user } = useFreshId();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [metrics, setMetrics] = useState<OverviewMetric[]>([]);
  const [loading, setLoading] = useState(false);
  const [overviewLoading, setOverviewLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);

  useEffect(() => {
    if (user?.role === "admin") {
      void loadOverview();
      void loadUsers();
    }
  }, [user?.role]);

  async function callAdmin(body: Record<string, unknown>): Promise<AdminPayload> {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) throw new Error("Your Fresh ID session has expired. Please log in again.");
    const response = await fetch("/api/admin/users", { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${token}` }, body: JSON.stringify(body) });
    const payload = (await response.json()) as AdminPayload;
    if (!response.ok) throw new Error(payload.error ?? `Admin request failed (${response.status})`);
    return payload;
  }

  async function loadOverview() {
    setOverviewLoading(true); setError(null);
    try {
      const payload = await callAdmin({ action: "overview" });
      setMetrics(payload.metrics ?? []);
      setGeneratedAt(payload.generatedAt ?? null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load platform overview.");
    } finally { setOverviewLoading(false); }
  }

  async function loadUsers() {
    setLoading(true); setError(null);
    try { const payload = await callAdmin({ action: "list" }); setUsers(payload.users ?? []); }
    catch (loadError) { setError(loadError instanceof Error ? loadError.message : "Could not load users."); }
    finally { setLoading(false); }
  }

  async function saveUser(target: AdminUser) {
    setSavingId(target.id); setError(null);
    try {
      const payload = await callAdmin({ action: "update", userId: target.id, fullName: target.full_name, username: target.username, role: target.role });
      if (payload.user) setUsers((current) => current.map((item) => item.id === target.id ? payload.user! : item));
      void loadOverview();
    } catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Could not save user."); }
    finally { setSavingId(null); }
  }

  if (!user || user.role !== "admin") return <div className="module"><h2>Admin</h2><p className="empty-state">You don't have access to this area.</p></div>;

  return (
    <div className="module">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div><h2 style={{ marginBottom: 4 }}>Fresh Admin Overview</h2><p className="empty-state" style={{ margin: 0 }}>Live platform health and trusted administration.</p></div>
        <button className="auth-submit-btn" onClick={() => { void loadOverview(); void loadUsers(); }} disabled={loading || overviewLoading}>{loading || overviewLoading ? "Refreshing..." : "Refresh"}</button>
      </div>
      {error && <p className="auth-error">{error}</p>}
      <section aria-label="Platform overview" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(145px,1fr))", gap: 10, margin: "18px 0" }}>
        {metrics.map((metric) => <div key={metric.label} style={{ border: "1px solid rgba(0,0,0,.1)", borderRadius: 14, padding: 14 }}><div style={{ fontSize: 12, opacity: .65 }}>{metric.label}</div><strong style={{ display: "block", fontSize: 24, marginTop: 4 }}>{metric.value.toLocaleString()}</strong></div>)}
      </section>
      {generatedAt && <p className="empty-state" style={{ fontSize: 12 }}>Overview generated {new Date(generatedAt).toLocaleString()}</p>}
      <h3>People</h3>
      {users.length === 0 && !loading && <p className="empty-state">No users returned from the trusted admin boundary.</p>}
      <div className="admin-user-list">
        {users.map((target) => (
          <div className="admin-user-card" key={target.id}>
            <input className="auth-input" value={target.full_name} onChange={(event) => setUsers((current) => current.map((item) => item.id === target.id ? { ...item, full_name: event.target.value } : item))} aria-label="Full name" />
            <input className="auth-input" value={target.username} onChange={(event) => setUsers((current) => current.map((item) => item.id === target.id ? { ...item, username: event.target.value } : item))} aria-label="Username" />
            <select className="auth-input" value={target.role} onChange={(event) => setUsers((current) => current.map((item) => item.id === target.id ? { ...item, role: event.target.value } : item))} aria-label="Role"><option value="user">user</option><option value="creator">creator</option><option value="developer">developer</option><option value="business">business</option><option value="admin">admin</option></select>
            <span className="post-username">{target.email}</span>
            <button className="auth-submit-btn" onClick={() => void saveUser(target)} disabled={savingId === target.id}>{savingId === target.id ? "Saving..." : "Save"}</button>
          </div>
        ))}
      </div>
    </div>
  );
}

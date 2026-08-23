import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase";
import { useFreshId } from "../fresh-id/context/FreshIdContext";

type AdminUser = {
  id: string;
  full_name: string;
  username: string;
  email: string;
  role: string;
  verified: boolean;
  presence: string;
  created_at: string;
};

export function AdminPanel() {
  const { user } = useFreshId();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.role === "admin") void loadUsers();
  }, [user?.role]);

  async function callAdmin(body: Record<string, unknown>) {
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    if (!token) throw new Error("Your Fresh ID session has expired. Please log in again.");
    const response = await fetch("/api/admin/users", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    const payload = (await response.json()) as { users?: AdminUser[]; user?: AdminUser; error?: string };
    if (!response.ok) throw new Error(payload.error ?? `Admin request failed (${response.status})`);
    return payload;
  }

  async function loadUsers() {
    setLoading(true);
    setError(null);
    try {
      const payload = await callAdmin({ action: "list" });
      setUsers(payload.users ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load users.");
    } finally {
      setLoading(false);
    }
  }

  async function saveUser(target: AdminUser) {
    setSavingId(target.id);
    setError(null);
    try {
      const payload = await callAdmin({
        action: "update",
        userId: target.id,
        fullName: target.full_name,
        username: target.username,
        role: target.role,
      });
      if (payload.user) setUsers((current) => current.map((item) => item.id === target.id ? payload.user! : item));
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save user.");
    } finally {
      setSavingId(null);
    }
  }

  if (!user || user.role !== "admin") {
    return (
      <div className="module">
        <h2>Admin</h2>
        <p className="empty-state">You don't have access to this area.</p>
      </div>
    );
  }

  return (
    <div className="module">
      <h2>Admin Control Center</h2>
      <p className="empty-state">Signed in as admin: {user.fullName}</p>
      {error && <p className="auth-error">{error}</p>}
      <button className="auth-submit-btn" onClick={() => void loadUsers()} disabled={loading}>{loading ? "Loading..." : "Refresh users"}</button>
      {users.length === 0 && !loading && <p className="empty-state">No users returned from the trusted admin boundary.</p>}
      <div className="admin-user-list">
        {users.map((target) => (
          <div className="admin-user-card" key={target.id}>
            <input className="auth-input" value={target.full_name} onChange={(event) => setUsers((current) => current.map((item) => item.id === target.id ? { ...item, full_name: event.target.value } : item))} aria-label="Full name" />
            <input className="auth-input" value={target.username} onChange={(event) => setUsers((current) => current.map((item) => item.id === target.id ? { ...item, username: event.target.value } : item))} aria-label="Username" />
            <select className="auth-input" value={target.role} onChange={(event) => setUsers((current) => current.map((item) => item.id === target.id ? { ...item, role: event.target.value } : item))} aria-label="Role">
              <option value="user">user</option>
              <option value="creator">creator</option>
              <option value="developer">developer</option>
              <option value="business">business</option>
              <option value="admin">admin</option>
            </select>
            <span className="post-username">{target.email}</span>
            <button className="auth-submit-btn" onClick={() => void saveUser(target)} disabled={savingId === target.id}>{savingId === target.id ? "Saving..." : "Save"}</button>
          </div>
        ))}
      </div>
    </div>
  );
}

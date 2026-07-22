/**
 * Fresh Web Lite
 * Admin Panel — gated by role
 */

import { useFreshId } from "../fresh-id/context/FreshIdContext";

export function AdminPanel() {
  const { user } = useFreshId();

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
      <h2>Admin</h2>
      <p className="empty-state">Signed in as admin: {user.fullName}</p>
      <p className="empty-state">User management, logs, and platform settings will live here.</p>
    </div>
  );
}

import { useLayout } from "../contexts/useLayout";
import "../../features/comments/components/CommentPanel.css";

export default function NotificationCenter() {
  const { notifications, removeNotification, notificationsOpen, closeNotifications, setActiveRoute } = useLayout();
  if (!notificationsOpen) return null;

  return (
    <div className="comment-panel-backdrop fresh-comments-backdrop" onClick={closeNotifications}>
      <div className="comment-panel fresh-comments" style={{ height: "auto", maxHeight: "60vh", overflowY: "auto" }} onClick={(event) => event.stopPropagation()}>
        <div className="comment-panel-header">
          <h3>Notifications</h3>
          <button className="back-btn" onClick={closeNotifications} aria-label="Close notifications">×</button>
        </div>
        {notifications.length === 0 ? (
          <p className="empty-state">No notifications yet.</p>
        ) : (
          notifications.map((n) => (
            <div key={n.id} className="comment-item" style={{ flexDirection: "column", gap: 4, padding: "10px 14px" }}>
              <strong>{n.title}</strong>
              {n.message && <p className="comment-content">{n.message}</p>}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {n.route && <button className="reply-btn" onClick={() => { setActiveRoute(n.route); closeNotifications(); }}>Open</button>}
                <button className="reply-btn" onClick={() => removeNotification(n.id)}>Dismiss</button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

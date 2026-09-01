import { useLayout } from "../contexts/useLayout";

export default function NotificationCenter() {
  const { notifications, removeNotification, notificationsOpen, closeNotifications } = useLayout();
  if (!notificationsOpen) return null;

  return (
    <div className="comment-panel-backdrop" onClick={closeNotifications}>
      <div className="comment-panel" style={{ height: "auto", maxHeight: "60vh" }} onClick={(event) => event.stopPropagation()}>
        <div className="comment-panel-header">
          <h3>Notifications</h3>
          <button className="back-btn" onClick={closeNotifications} aria-label="Close notifications">×</button>
        </div>
        {notifications.length === 0 ? (
          <p className="empty-state">No notifications yet.</p>
        ) : (
          notifications.map((n) => (
            <div key={n.id} className="comment-item">
              <strong>{n.title}</strong>
              {n.message && <p className="comment-content">{n.message}</p>}
              <button className="reply-btn" onClick={() => removeNotification(n.id)}>Dismiss</button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

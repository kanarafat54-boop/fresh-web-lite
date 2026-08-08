import { useLayout } from "../contexts/LayoutContext";

export default function NotificationCenter() {
  const { notifications, removeNotification } = useLayout();
  if (notifications.length === 0) return null;

  return (
    <div className="comment-panel-backdrop">
      <div className="comment-panel" style={{ height: "auto", maxHeight: "60vh" }}>
        <div className="comment-panel-header">
          <h3>Notifications</h3>
        </div>
        {notifications.map((n) => (
          <div key={n.id} className="comment-item">
            <strong>{n.title}</strong>
            {n.message && <p className="comment-content">{n.message}</p>}
            <button className="reply-btn" onClick={() => removeNotification(n.id)}>Dismiss</button>
          </div>
        ))}
      </div>
    </div>
  );
}

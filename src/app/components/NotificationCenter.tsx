import { useLayout } from "../contexts/LayoutContext";

export default function NotificationCenter() {
  const { notifications, removeNotification } = useLayout();

  if (!notifications.length) {
    return null;
  }

  return (
    <aside className="notification-center">
      {notifications.map((notification) => (
        <div key={notification.id} className="notification-item">
          <p>{notification.message}</p>

          <button
            onClick={() => removeNotification(notification.id)}
          >
            Dismiss
          </button>
        </div>
      ))}
    </aside>
  );
}

export interface UINotification {
  id: string;
  title: string;
  message?: string;
  type?: "info" | "success" | "warning" | "error";
  createdAt: string;
}

type Listener = (n: UINotification) => void;

class NotificationServiceImpl {
  private listeners: Set<Listener> = new Set();

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  notify(notification: Omit<UINotification, "id" | "createdAt">) {
    const full: UINotification = {
      ...notification,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    this.listeners.forEach((listener) => listener(full));
  }
}

export const NotificationService = new NotificationServiceImpl();

export type UINotification = {
  id: string;
  message: string;
  type?: "info" | "success" | "warning" | "error";
  createdAt?: number;
};

type Listener = (notification: UINotification) => void;

class NotificationServiceClass {
  private listeners = new Set<Listener>();

  subscribe(listener: Listener) {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  }

  publish(notification: UINotification) {
    this.listeners.forEach((listener) => {
      listener(notification);
    });
  }
}

export const NotificationService = new NotificationServiceClass();

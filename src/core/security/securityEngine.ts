import type {
  SecurityRequest,
  SecurityLevel,
  AuthenticationMethod,
} from "./types";

class SecurityEngine {
  private history: SecurityRequest[] = [];

  request(
    userId: string,
    action: string,
    level: SecurityLevel,
    method: AuthenticationMethod
  ) {
    const request: SecurityRequest = {
      id: crypto.randomUUID(),
      userId,
      action,
      level,
      method,
      approved: false,
      timestamp: new Date().toISOString(),
    };

    this.history.push(request);

    return request;
  }

  approve(id: string) {
    const request = this.history.find(r => r.id === id);

    if (!request) return false;

    request.approved = true;

    return true;
  }

  getHistory(userId: string) {
    return this.history.filter(r => r.userId === userId);
  }
}

export const securityEngine = new SecurityEngine();

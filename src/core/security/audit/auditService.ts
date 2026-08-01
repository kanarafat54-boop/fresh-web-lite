import type { AuditRecord } from "./auditTypes";

class AuditService {
  private records: AuditRecord[] = [];

  log(record: AuditRecord) {
    this.records.push(record);
  }

  getUserHistory(userId: string) {
    return this.records.filter(r => r.userId === userId);
  }

  getAll() {
    return this.records;
  }

  clear() {
    this.records = [];
  }
}

export const auditService = new AuditService();

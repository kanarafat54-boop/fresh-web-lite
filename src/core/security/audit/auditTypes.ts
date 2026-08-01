export type AuditSeverity =
  | "info"
  | "warning"
  | "critical";

export interface AuditRecord {
  id: string;
  userId: string;
  action: string;
  module: string;
  severity: AuditSeverity;
  timestamp: string;
  details?: string;
}

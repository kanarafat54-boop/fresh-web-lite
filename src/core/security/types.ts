export type SecurityLevel =
  | "low"
  | "medium"
  | "high"
  | "critical";

export type AuthenticationMethod =
  | "password"
  | "pin"
  | "fingerprint"
  | "face"
  | "iris"
  | "voice"
  | "passkey"
  | "otp";

export interface SecurityRequest {
  id: string;
  userId: string;
  action: string;
  level: SecurityLevel;
  method: AuthenticationMethod;
  approved: boolean;
  timestamp: string;
}

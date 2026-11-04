/**
 * Governed agent roles for ARA6.
 *
 * Implements the agent authority ladder from docs/FRESH_WEB_LITE_FINAL_MASTER_SPEC.md:
 *   READ -> ANALYZE -> PROPOSE -> PREPARE -> REQUEST_APPROVAL -> EXECUTE
 *
 * Every registered agent has a role profile that caps what it may do. Authorization is
 * deny-by-default: an agent without a profile can run nothing, a tool outside the profile is
 * refused, and no agent may reach production (merge/deploy) authority. Each decision, allowed
 * or denied, produces an audit record.
 *
 * This file is pure (type-only imports) so it can be unit-tested directly by Node.
 */

export const AUTHORITY_LADDER = ["READ", "ANALYZE", "PROPOSE", "PREPARE", "REQUEST_APPROVAL", "EXECUTE"] as const;
export type AgentAuthority = (typeof AUTHORITY_LADDER)[number];
export const authorityRank = (level: AgentAuthority): number => AUTHORITY_LADDER.indexOf(level);

export interface AgentRoleProfile {
  agentId: string;
  purpose: string;
  /** Highest rung of the ladder this agent may ever reach. */
  maxAuthority: AgentAuthority;
  /** The only tools this agent may run. Anything else is refused, whatever the caller asks for. */
  allowedTools: readonly string[];
  /** May run tools that change state (still requires explicit approval). */
  writeAccess: boolean;
  /** May run tools in the finance category (still requires explicit approval). */
  financialAuthority: boolean;
}

/** Tool categories no agent may ever run: owner approval gates merge and deploy. */
export const PRODUCTION_CATEGORIES: readonly string[] = ["deployment", "production", "release"];

export const AGENT_ROLE_PROFILES: Readonly<Record<string, AgentRoleProfile>> = {
  "fresh-ai": { agentId: "fresh-ai", purpose: "Reasoning and orchestration across the platform", maxAuthority: "PROPOSE", allowedTools: ["fresh-ai", "reasoning", "search"], writeAccess: false, financialAuthority: false },
  wallet: { agentId: "wallet", purpose: "Finance operations on the user's own wallet", maxAuthority: "EXECUTE", allowedTools: ["wallet", "reasoning"], writeAccess: true, financialAuthority: true },
  feed: { agentId: "feed", purpose: "Social content operations", maxAuthority: "EXECUTE", allowedTools: ["feed", "reasoning"], writeAccess: true, financialAuthority: false },
  security: { agentId: "security", purpose: "Security analysis and mitigation preparation (Fresh Shield)", maxAuthority: "PREPARE", allowedTools: ["security", "reasoning"], writeAccess: false, financialAuthority: false },
  research: { agentId: "research", purpose: "Evidence research and synthesis", maxAuthority: "PROPOSE", allowedTools: ["search", "reasoning"], writeAccess: false, financialAuthority: false },
  architecture: { agentId: "architecture", purpose: "System architecture reasoning; proposes, never applies", maxAuthority: "PROPOSE", allowedTools: ["reasoning"], writeAccess: false, financialAuthority: false },
  backend: { agentId: "backend", purpose: "Backend implementation proposals", maxAuthority: "PROPOSE", allowedTools: ["reasoning"], writeAccess: false, financialAuthority: false },
  frontend: { agentId: "frontend", purpose: "Frontend implementation proposals", maxAuthority: "PROPOSE", allowedTools: ["reasoning"], writeAccess: false, financialAuthority: false },
  testing: { agentId: "testing", purpose: "Verification and test planning", maxAuthority: "PROPOSE", allowedTools: ["reasoning"], writeAccess: false, financialAuthority: false },
  documentation: { agentId: "documentation", purpose: "Documentation drafting", maxAuthority: "PROPOSE", allowedTools: ["reasoning"], writeAccess: false, financialAuthority: false },
  deployment: { agentId: "deployment", purpose: "Prepares releases; AI never deploys without the owner", maxAuthority: "PREPARE", allowedTools: ["reasoning"], writeAccess: false, financialAuthority: false },
  media: { agentId: "media", purpose: "Media understanding", maxAuthority: "PROPOSE", allowedTools: ["search", "reasoning"], writeAccess: false, financialAuthority: false },
  learning: { agentId: "learning", purpose: "Learning and education support", maxAuthority: "PROPOSE", allowedTools: ["search", "reasoning"], writeAccess: false, financialAuthority: false },
};

export interface AgentToolFacts {
  id: string;
  category: string;
  sideEffect?: boolean;
  requiresApproval?: boolean;
}

export interface AgentAuthorizationRequest {
  agentId: string;
  tool: AgentToolFacts;
  approved?: boolean;
  requestId?: string;
  taskId?: string;
}

export type AgentAuthorizationCode =
  | "ok"
  | "unknown-role"
  | "tool-not-allowed"
  | "production-denied"
  | "authority-exceeded"
  | "write-not-permitted"
  | "financial-not-permitted"
  | "approval-required";

export interface AgentAuditRecord {
  at: string;
  agentId: string;
  toolId: string;
  required: AgentAuthority;
  allowed: boolean;
  code: AgentAuthorizationCode;
  approved: boolean;
  requestId?: string;
  taskId?: string;
}

export interface AgentAuthorization {
  allowed: boolean;
  code: AgentAuthorizationCode;
  reason: string;
  required: AgentAuthority;
  audit: AgentAuditRecord;
}

export type AgentAuditSink = (record: AgentAuditRecord) => void;

const RECENT_LIMIT = 200;
const recent: AgentAuditRecord[] = [];
let auditSink: AgentAuditSink | null = null;

/** Route audit records to durable storage (for example the fresh_trust_audit table). */
export function setAgentAuditSink(sink: AgentAuditSink | null): void {
  auditSink = sink;
}

/** The most recent authorization decisions, newest last. For observability and tests. */
export function recentAgentAudit(limit = 50): AgentAuditRecord[] {
  return recent.slice(-Math.max(0, limit));
}

/** The ladder rung a tool needs: state-changing tools need EXECUTE; approval-gated tools need REQUEST_APPROVAL. */
export function requiredAuthority(tool: AgentToolFacts): AgentAuthority {
  if (tool.sideEffect) return "EXECUTE";
  if (tool.requiresApproval) return "REQUEST_APPROVAL";
  return "ANALYZE";
}

export function authorizeAgentAction(request: AgentAuthorizationRequest): AgentAuthorization {
  const { agentId, tool } = request;
  const required = requiredAuthority(tool);
  const approved = request.approved === true;

  const finish = (code: AgentAuthorizationCode, reason: string): AgentAuthorization => {
    const audit: AgentAuditRecord = {
      at: new Date().toISOString(),
      agentId,
      toolId: tool.id,
      required,
      allowed: code === "ok",
      code,
      approved,
      requestId: request.requestId,
      taskId: request.taskId,
    };
    recent.push(audit);
    if (recent.length > RECENT_LIMIT) recent.splice(0, recent.length - RECENT_LIMIT);
    if (auditSink) {
      try {
        auditSink(audit);
      } catch {
        // Auditing must never turn a decision into a crash; the in-memory trail still holds it.
      }
    }
    return { allowed: code === "ok", code, reason, required, audit };
  };

  const profile = Object.prototype.hasOwnProperty.call(AGENT_ROLE_PROFILES, agentId) ? AGENT_ROLE_PROFILES[agentId] : undefined;
  if (!profile) return finish("unknown-role", `Agent '${agentId}' has no role profile, so it may not run any tool.`);
  if (PRODUCTION_CATEGORIES.includes(tool.category)) return finish("production-denied", `No agent may run '${tool.id}': production changes require the owner.`);
  if (!profile.allowedTools.includes(tool.id)) return finish("tool-not-allowed", `Agent '${agentId}' is not permitted to use tool '${tool.id}'.`);
  if (authorityRank(required) > authorityRank(profile.maxAuthority)) {
    return finish("authority-exceeded", `Tool '${tool.id}' needs ${required} authority; agent '${agentId}' is limited to ${profile.maxAuthority}.`);
  }
  if (tool.sideEffect && !profile.writeAccess) return finish("write-not-permitted", `Agent '${agentId}' may not run state-changing tools.`);
  if (tool.category === "finance" && !profile.financialAuthority) return finish("financial-not-permitted", `Agent '${agentId}' has no financial authority.`);
  if ((required === "EXECUTE" || tool.requiresApproval) && !approved) return finish("approval-required", `Tool '${tool.id}' requires explicit approval before it runs.`);
  return finish("ok", "Allowed.");
}

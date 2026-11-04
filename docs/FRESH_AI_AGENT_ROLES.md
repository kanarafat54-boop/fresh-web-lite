# Fresh AI Agent Roles and Authority

Roles are governed scopes, not new intelligence. They decide what each ARA6 agent may touch.

Implementation: `src/core/ara6/agents/agentRoles.ts`, enforced in `agentRuntime.execute` after the TRUEMODE gate.
Verification: `npm run test:fresh-agent-roles` (also in the Fresh AI integrity workflow).

## Authority ladder
READ → ANALYZE → PROPOSE → PREPARE → REQUEST_APPROVAL → EXECUTE. Each role has a ceiling.

## Rules
- Deny by default: an agent without a profile runs nothing.
- Tool scoping: an agent may only run tools in its profile, including when a caller passes an explicit `toolId`.
- State-changing tools need EXECUTE, `writeAccess`, and literal `approved === true`.
- Finance tools need `financialAuthority` (wallet only).
- No agent runs deployment, production or release tools. The owner approves merge and deploy.
- Every decision, allowed or denied, is audited (in-memory trail; `setAgentAuditSink` routes to durable storage).

## Roles
| Agent | Ceiling | Tools | Writes |
|---|---|---|---|
| fresh-ai | PROPOSE | fresh-ai, reasoning, search | no |
| wallet | EXECUTE | wallet, reasoning | yes (finance, approval) |
| feed | EXECUTE | feed, reasoning | yes (approval) |
| security | PREPARE | security, reasoning | no |
| research, media, learning | PROPOSE | search, reasoning | no |
| architecture, backend, frontend, testing, documentation | PROPOSE | reasoning | no |
| deployment | PREPARE | reasoning | no |

## Not yet done
Durable audit sink (to `fresh_trust_audit`) is not wired; tool-level ladder rungs beyond ANALYZE/REQUEST_APPROVAL/EXECUTE are not yet used by any registered tool.

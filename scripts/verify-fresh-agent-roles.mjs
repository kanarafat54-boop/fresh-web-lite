// Verifies governed agent roles: deny-by-default authorization, ladder caps, no production authority,
// audit trail, and that the runtime enforces the gate. Run: node scripts/verify-fresh-agent-roles.mjs
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import path from "node:path";

const root = process.cwd();
const read = (p) => readFileSync(path.join(root, p), "utf8");
const assert = (c, m) => { if (!c) { console.error(`FAIL: ${m}`); process.exit(1); } };

const roles = await import(pathToFileURL(path.join(root, "src/core/ara6/agents/agentRoles.ts")).href);
const { authorizeAgentAction, AGENT_ROLE_PROFILES, recentAgentAudit, setAgentAuditSink, requiredAuthority, authorityRank } = roles;

const T = {
  reasoning: { id: "reasoning", category: "reasoning" },
  freshAi: { id: "fresh-ai", category: "ai" },
  search: { id: "search", category: "search" },
  security: { id: "security", category: "security" },
  wallet: { id: "wallet", category: "finance", sideEffect: true, requiresApproval: true },
  feed: { id: "feed", category: "social", sideEffect: true, requiresApproval: true },
  deploy: { id: "deploy", category: "deployment", sideEffect: true, requiresApproval: true },
};
const run = (agentId, tool, approved) => authorizeAgentAction({ agentId, tool, approved });

// Every default agent has a profile, and its default tools are within the profile.
const defaults = read("src/core/ara6/agents/defaultAgents.ts");
const ids = [...defaults.matchAll(/\{ id: "([a-z-]+)", name:/g)].map((m) => m[1]);
assert(ids.length >= 13, "expected the 13 default agents");
for (const id of ids) {
  assert(AGENT_ROLE_PROFILES[id], `agent '${id}' has no role profile`);
  const line = defaults.split("\n").find((l) => l.includes(`id: "${id}"`));
  const tools = [...(line.match(/tools: \[([^\]]*)\]/)?.[1] ?? "").matchAll(/"([^"]+)"/g)].map((m) => m[1]);
  for (const t of tools) assert(AGENT_ROLE_PROFILES[id].allowedTools.includes(t), `agent '${id}' default tool '${t}' missing from its role`);
}

// Deny by default.
assert(run("ghost", T.reasoning).code === "unknown-role", "unknown agent must be denied");
assert(run("__proto__", T.reasoning).code === "unknown-role", "prototype keys must not resolve to a role");
assert(run("constructor", T.reasoning).code === "unknown-role", "constructor must not resolve to a role");

// Tool scoping closes the explicit-toolId bypass.
assert(run("research", T.wallet, true).code === "tool-not-allowed", "research must not use wallet even when approved");
assert(run("documentation", T.search).code === "tool-not-allowed", "documentation limited to reasoning");
assert(run("feed", T.wallet, true).code === "tool-not-allowed", "feed must not use wallet");

// Production is never reachable, even by a profile that allows the tool id.
assert(run("deployment", T.deploy, true).code === "production-denied", "deployment agent must not deploy");
assert(run("wallet", T.deploy, true).code === "production-denied", "no agent may run production tools");

// Authority ladder caps and write/financial flags.
assert(run("fresh-ai", T.wallet, true).allowed === false, "fresh-ai cannot run wallet");
assert(authorityRank("PREPARE") < authorityRank("EXECUTE"), "ladder order");
assert(requiredAuthority(T.wallet) === "EXECUTE" && requiredAuthority(T.reasoning) === "ANALYZE", "required authority mapping");
assert(["deployment", "security"].every((id) => AGENT_ROLE_PROFILES[id].maxAuthority !== "EXECUTE"), "engineering/security roles never EXECUTE");
assert(Object.values(AGENT_ROLE_PROFILES).filter((p) => p.financialAuthority).map((p) => p.agentId).join() === "wallet", "only wallet has financial authority");
assert(Object.values(AGENT_ROLE_PROFILES).filter((p) => p.maxAuthority === "EXECUTE").map((p) => p.agentId).sort().join() === "feed,wallet", "only wallet and feed may reach EXECUTE");

// Approval still required for permitted state-changing tools.
assert(run("wallet", T.wallet, false).code === "approval-required", "wallet needs approval");
assert(run("wallet", T.wallet, "yes").code === "approval-required", "approval must be literal true, not truthy");
assert(run("wallet", T.wallet, true).allowed === true, "wallet allowed once approved");
assert(run("feed", T.feed, true).allowed === true, "feed allowed once approved");

// Read-only analysis flows keep working.
for (const [a, t] of [["fresh-ai", T.freshAi], ["fresh-ai", T.search], ["research", T.search], ["security", T.security], ["architecture", T.reasoning], ["learning", T.search]]) {
  assert(run(a, t).allowed, `${a} should run ${t.id}`);
}

// Audit: every decision recorded, sink failures never crash a decision.
const seen = [];
setAgentAuditSink((r) => seen.push(r));
run("research", T.wallet, true);
setAgentAuditSink(() => { throw new Error("sink down"); });
assert(run("research", T.search).allowed, "sink failure must not change the decision");
setAgentAuditSink(null);
assert(seen.length === 1 && seen[0].allowed === false && seen[0].code === "tool-not-allowed", "sink received denial record");
const last = recentAgentAudit(2);
assert(last.length === 2 && last[1].toolId === "search", "in-memory audit trail keeps decisions");

// Runtime enforces the gate and keeps the TRUEMODE strings other tests rely on.
const runtime = read("src/core/ara6/agents/agentRuntime.ts");
assert(runtime.includes("authorizeAgentAction("), "agentRuntime must call authorizeAgentAction");
assert(runtime.indexOf("authorizeAgentAction(") < runtime.indexOf("toolRegistry.execute("), "authorization must precede tool execution");
assert(runtime.indexOf("TRUEMODE decision evidence is required") < runtime.indexOf("authorizeAgentAction("), "TRUEMODE gate stays first");
assert(runtime.includes('decision.decision === "BLOCK_ACTION"'), "BLOCK_ACTION check preserved");
assert(!/^import .* from "\.\.?\/.*(?<!\.js)";/m.test(read("src/core/ara6/agents/agentRoles.ts")), "agentRoles must stay dependency-free");

console.log("Fresh agent roles verification passed.");

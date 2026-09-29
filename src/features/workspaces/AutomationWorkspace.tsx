import { useEffect, useState } from "react";
import { useFreshId } from "../fresh-id/context/FreshIdContext";
import { createAgent } from "../../core/platform/freshPlatformRuntime";
import { supabase } from "../../lib/supabase";
import "./WorkspacePage.css";

type Agent = { id: string; name: string; goal: string; status: string; created_at: string };

export default function AutomationWorkspace() {
  const { user, isGuest } = useFreshId();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [name, setName] = useState("");
  const [goal, setGoal] = useState("");
  const [message, setMessage] = useState("Your agents are private to your Fresh identity.");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user || isGuest) { setAgents([]); setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase.from("fresh_agents").select("id,name,goal,status,created_at").eq("owner_id", user.id).order("created_at", { ascending: false }).limit(24);
    if (error) setMessage(error.message); else setAgents((data ?? []) as Agent[]);
    setLoading(false);
  };

  useEffect(() => { void load(); }, [user?.id, isGuest]);

  const create = async () => {
    if (!user || isGuest || !name.trim() || !goal.trim()) return;
    try {
      await createAgent(user.id, name.trim(), goal.trim(), { approvalRequired: true });
      setName(""); setGoal(""); setMessage("Agent saved as draft. No autonomous action runs without explicit approval.");
      void load();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not create agent."); }
  };

  return (
    <section className="workspace-page" aria-label="Fresh Automation workspace">
      <header className="workspace-hero"><span className="workspace-eyebrow">Agents · Workflows · Approval</span><h1>Fresh Automation</h1><p>Create personal automation agents with explicit goals and permission boundaries. Draft agents do not execute actions.</p></header>
      {user && !isGuest && <section className="workspace-section"><h2>Create an agent</h2><div className="workspace-card"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Agent name" /><textarea value={goal} onChange={(e) => setGoal(e.target.value)} placeholder="What should this agent help you accomplish?" /><button type="button" onClick={() => void create()} disabled={!name.trim() || !goal.trim()}>Save draft agent</button></div></section>}
      <section className="workspace-section"><h2>Your agents</h2>{!user || isGuest ? <p className="workspace-empty">Sign in to create and view private agents.</p> : loading ? <p className="workspace-empty">Loading agents…</p> : agents.length === 0 ? <p className="workspace-empty">No agents yet.</p> : <div className="workspace-grid">{agents.map((agent) => <article key={agent.id} className="workspace-card"><span className="workspace-badge">{agent.status}</span><h3>{agent.name}</h3><p>{agent.goal}</p></article>)}</div>}<p className="workspace-empty" role="status">{message}</p></section>
    </section>
  );
}

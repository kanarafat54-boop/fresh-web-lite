import { useEffect, useState } from "react";
import { useFreshId } from "../fresh-id/context/FreshIdContext";
import { createOpportunity } from "../../core/platform/freshPlatformRuntime";
import { supabase } from "../../lib/supabase";
import "./WorkspacePage.css";

type Opportunity = { id: string; owner_id: string | null; title: string; description: string; kind: string; status: string };

export default function OpportunityWorkspace() {
  const { user, isGuest } = useFreshId();
  const [items, setItems] = useState<Opportunity[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [kind, setKind] = useState("work");
  const [message, setMessage] = useState("Live opportunity data.");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("fresh_opportunities").select("id,owner_id,title,description,kind,status").eq("status", "open").order("created_at", { ascending: false }).limit(24);
    if (error) setMessage(error.message); else setItems((data ?? []) as Opportunity[]);
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const create = async () => {
    if (!user || isGuest || !title.trim() || !description.trim()) return;
    try {
      await createOpportunity(user.id, title.trim(), description.trim(), kind);
      setTitle(""); setDescription(""); setMessage("Opportunity created and available after normal platform review.");
      void load();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not create opportunity."); }
  };

  return (
    <section className="workspace-page" aria-label="Opportunity workspace">
      <header className="workspace-hero"><span className="workspace-eyebrow">Fresh Intelligence · Work · Learning · Commerce</span><h1>Opportunity Engine</h1><p>Real opportunities can be created, stored and discovered here. Fresh does not invent matches or urgency.</p></header>
      {user && !isGuest && <section className="workspace-section"><h2>Publish an opportunity</h2><div className="workspace-card"><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Opportunity title" /><textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What is needed?" /><select value={kind} onChange={(e) => setKind(e.target.value)}><option value="work">Work</option><option value="learning">Learning</option><option value="creator">Creator collaboration</option><option value="commerce">Commerce</option><option value="community">Community</option></select><button type="button" onClick={() => void create()} disabled={!title.trim() || !description.trim()}>Create opportunity</button></div></section>}
      <section className="workspace-section"><h2>Open opportunities</h2>{loading ? <p className="workspace-empty">Loading opportunities…</p> : items.length === 0 ? <p className="workspace-empty">No open opportunities yet.</p> : <div className="workspace-grid">{items.map((item) => <article key={item.id} className="workspace-card"><span className="workspace-badge">{item.kind}</span><h3>{item.title}</h3><p>{item.description}</p></article>)}</div>}<p className="workspace-empty" role="status">{message}</p></section>
    </section>
  );
}

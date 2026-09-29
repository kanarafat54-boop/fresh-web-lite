import { useEffect, useState } from "react";
import { useFreshId } from "../fresh-id/context/FreshIdContext";
import { createCourse } from "../../core/platform/freshPlatformRuntime";
import { supabase } from "../../lib/supabase";
import "./WorkspacePage.css";

type Course = { id: string; creator_id: string; title: string; description: string; curriculum: unknown; status: string };

export default function LearningWorkspace() {
  const { user, isGuest } = useFreshId();
  const [courses, setCourses] = useState<Course[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [message, setMessage] = useState("Live Academy data.");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.from("fresh_courses").select("id,creator_id,title,description,curriculum,status").eq("status", "published").order("created_at", { ascending: false }).limit(24);
    if (error) setMessage(error.message); else setCourses((data ?? []) as Course[]);
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const publish = async () => {
    if (!user || isGuest || !title.trim()) return;
    try {
      await createCourse(user.id, title.trim(), description.trim(), []);
      setTitle(""); setDescription(""); setMessage("Course created as a draft. Publish it after review.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not create course."); }
  };

  return (
    <section className="workspace-page" aria-label="Learning workspace">
      <header className="workspace-hero"><span className="workspace-eyebrow">Learn · Knowledge · Academy</span><h1>Fresh Academy</h1><p>Courses are durable platform records. Your learning surface can grow from real creator-published curriculum instead of seeded placeholders.</p></header>
      {user && !isGuest && <section className="workspace-section"><h2>Create a course</h2><div className="workspace-card"><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Course title" /><textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What will students learn?" /><button type="button" onClick={() => void publish()} disabled={!title.trim()}>Save course</button></div></section>}
      <section className="workspace-section"><h2>Published courses</h2>{loading ? <p className="workspace-empty">Loading Academy…</p> : courses.length === 0 ? <p className="workspace-empty">No published courses yet.</p> : <div className="workspace-grid">{courses.map((course) => <article key={course.id} className="workspace-card"><span className="workspace-badge">Academy</span><h3>{course.title}</h3><p>{course.description || "No description provided."}</p></article>)}</div>}<p className="workspace-empty" role="status">{message}</p></section>
    </section>
  );
}

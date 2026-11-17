import { useEffect, useMemo, useRef, useState } from "react";
import type { StudioProject } from "../shared/types.ts";
import type { StudioProjectService } from "../projects/projectService.ts";
import { getFreshFlowStudioProfile } from "../../fresh-flow/core/freshFlowStudioIntegration.ts";
import { postText, type PublishOutcome } from "./publishPost.ts";
import {
  MAX_BODY, MAX_SOURCES, MAX_SOURCES_TEXT, MAX_TITLE, countWords, exportFileName, outline, parseSources, preflight, readDraft,
  readingMinutes, starterFor, toMarkdown, toPlainText, toSettings, type Draft,
} from "./writingDoc.ts";

type Props = {
  project: StudioProject;
  service: StudioProjectService | null;
  onSaved: (project: StudioProject) => void;
  notify: (kind: "info" | "error", text: string) => void;
  onClose: () => void;
  /** Present only for Fresh Posts projects. */
  posting?: { signedIn: boolean; published: boolean; run: (draft: Draft) => Promise<PublishOutcome> };
};

function download(text: string, name: string, type: string) {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([text], { type: `${type};charset=utf-8` }));
  link.download = name; link.click();
  window.setTimeout(() => URL.revokeObjectURL(link.href), 4000);
}

/**
 * Writing editor for Studio projects of the text kind (posts, news, books, lessons, research, channel pages).
 * The draft is saved on the project. Export is a Markdown or plain-text file; sending it to a Fresh Flow feed is not connected.
 */
export default function WritingEditor({ project, service, onSaved, notify, onClose, posting }: Props) {
  const [confirming, setConfirming] = useState(false);
  const [posted, setPosted] = useState(false);
  const [isPosting, setPosting] = useState(false);
  const [draft, setDraft] = useState<Draft>(() => readDraft(project.meta.settings));
  const [save, setSave] = useState<"saved" | "saving" | "error">("saved");
  const baseRef = useRef(project);
  const timer = useRef<number | null>(null);
  const latest = useRef(draft);
  latest.current = draft;
  const systemId = project.meta.sourceSystemId ?? null;
  const profile = systemId ? getFreshFlowStudioProfile(systemId) : undefined;
  const needsSources = !!profile?.capabilities.includes("source-attribution");

  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current); }, []);

  const persist = async () => {
    if (!service) return;
    setSave("saving");
    try {
      const saved = await service.updateSettings(baseRef.current, toSettings(latest.current));
      baseRef.current = saved; onSaved(saved); setSave("saved");
    } catch (error) { setSave("error"); notify("error", error instanceof Error ? error.message : "The draft could not be saved."); }
  };
  const change = (next: Draft) => {
    setDraft(next); setSave("saving");
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => void persist(), 700);
  };

  const words = useMemo(() => countWords(draft.body), [draft.body]);
  const heads = useMemo(() => outline(draft.body), [draft.body]);
  const checks = useMemo(() => preflight(draft, needsSources), [draft, needsSources]);
  const parsed = useMemo(() => parseSources(draft.sources), [draft.sources]);
  const starter = starterFor(systemId);
  const ready = checks.every((c) => c.ok);
  const post = useMemo(() => postText(draft), [draft]);
  const publish = async () => {
    if (!posting) return;
    setPosting(true);
    if (timer.current) { window.clearTimeout(timer.current); timer.current = null; await persist(); }
    const outcome = await posting.run(latest.current);
    setPosting(false); setConfirming(false);
    if (!outcome.ok) return notify("error", outcome.reason);
    setPosted(true);
    notify("info", outcome.statusSaved ? "Published to Fresh Posts." : "Published to Fresh Posts, but the project status could not be updated.");
  };

  return (
    <div className="fs-details" aria-label="Writing editor">
      <header className="fs-section-head">
        <div>
          <button type="button" className="fs-link" onClick={onClose}>← Back to project</button>
          <h1>{project.name}</h1>
          <p className="fs-muted">Writing editor · the draft is saved with the project{service?.backendKind === "device" ? " on this device" : ""}.</p>
        </div>
        <span className={`fs-save is-${save}`} role="status">{save === "saved" ? "All changes saved" : save === "saving" ? "Saving…" : "Not saved"}</span>
      </header>
      <section className="fs-panel">
        <label className="fs-field">Title
          <input className="fs-input" maxLength={MAX_TITLE} value={draft.title} onChange={(e) => change({ ...draft, title: e.target.value })} />
        </label>
        <label className="fs-field">Text <span className="fs-muted">Use # for headings. {words} words · about {readingMinutes(words)} min to read · {draft.body.length}/{MAX_BODY} characters</span>
          <textarea className="fs-input fs-write" rows={14} maxLength={MAX_BODY} value={draft.body} onChange={(e) => change({ ...draft, body: e.target.value })} />
        </label>
        {starter && !draft.body.trim() && <button type="button" className="fs-btn" onClick={() => change({ ...draft, body: starter })}>Start from an outline</button>}
        {heads.length > 0 && (
          <>
            <h3>Outline</h3>
            <ul className="fs-list">{heads.map((h, i) => <li key={i} style={{ paddingLeft: (h.level - 1) * 16 }}>{h.text}</li>)}</ul>
          </>
        )}
        <label className="fs-field">Sources <span className="fs-muted">One per line: Title | https://address. {parsed.sources.length}/{MAX_SOURCES}{needsSources ? " · this kind of work needs at least one" : ""}</span>
          <textarea className="fs-input" rows={4} maxLength={MAX_SOURCES_TEXT} value={draft.sources} onChange={(e) => change({ ...draft, sources: e.target.value })} />
        </label>
        <h3>Before you share</h3>
        <ul className="fs-list" aria-label="Checks">
          {checks.map((c) => <li key={c.text}>{c.ok ? "✓" : "✗"} {c.text}</li>)}
        </ul>
        <div className="fs-actions">
          <button type="button" className="fs-btn fs-btn-primary" disabled={!ready} onClick={() => download(toMarkdown(draft), exportFileName(draft.title, "md"), "text/markdown")}>Export Markdown</button>
          <button type="button" className="fs-btn" disabled={!ready} onClick={() => download(toPlainText(draft), exportFileName(draft.title, "txt"), "text/plain")}>Export plain text</button>
        </div>
        {posting ? (
          <div aria-label="Publish to Fresh Posts">
            <h3>Publish to Fresh Posts</h3>
            {!posting.signedIn ? <p className="fs-muted">Sign in with Fresh ID to publish. Until then you can still export the file.</p>
              : !post.ok ? <p className="fs-muted" role="status">{post.reason}</p>
              : posted ? <p role="status">Published to Fresh Posts. Publishing again would create a second post.</p>
              : (
                <>
                  {posting.published && <p className="fs-muted">This project was already published once. Publishing again creates a second post.</p>}
                  <p className="fs-muted">The post shows the title, the text without headings or formatting marks, and your sources. It goes live straight away.</p>
                  {!confirming
                    ? <button type="button" className="fs-btn fs-btn-primary" onClick={() => setConfirming(true)}>Publish to Fresh Posts</button>
                    : <div className="fs-actions">
                        <button type="button" className="fs-btn fs-btn-primary" disabled={isPosting} onClick={() => void publish()}>{isPosting ? "Publishing…" : "Publish now"}</button>
                        <button type="button" className="fs-btn" disabled={isPosting} onClick={() => setConfirming(false)}>Cancel</button>
                      </div>}
                </>
              )}
          </div>
        ) : <p className="fs-muted">Fresh Studio does not send this kind of text to a feed yet. Export the file and post it where it belongs.</p>}
      </section>
    </div>
  );
}

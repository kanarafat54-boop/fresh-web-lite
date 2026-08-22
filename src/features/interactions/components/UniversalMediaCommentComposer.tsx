import { useRef, useState } from "react";
import { validateCommentAttachments } from "../../../core/interactions/attachmentValidation";
import type { UniversalCommentAttachment } from "../../../core/interactions/FreshReactionModel";

export function UniversalMediaCommentComposer({ onSubmit, placeholder = "Add a comment...", disabled = false }: {
  onSubmit: (payload: { body: string; attachments: UniversalCommentAttachment[] }) => Promise<void> | void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [body, setBody] = useState("");
  const [files, setFiles] = useState<Array<{ file: File; preview: string }>>([]);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function addFiles(selected: FileList | null) {
    if (!selected) return;
    const incoming = Array.from(selected);
    const results = validateCommentAttachments(incoming);
    const invalid = results.find((r) => !r.ok);
    if (invalid && !invalid.ok) {
      setError(invalid.reason);
      return;
    }
    setError(null);
    setFiles((current) => {
      const next = [...current.map(({ file }) => file), ...incoming].slice(0, 6);
      return next.map((file) => ({ file, preview: URL.createObjectURL(file) }));
    });
  }

  function remove(index: number) {
    setFiles((current) => {
      const removed = current[index];
      if (removed) URL.revokeObjectURL(removed.preview);
      return current.filter((_, i) => i !== index);
    });
  }

  async function submit() {
    if (disabled || (!body.trim() && files.length === 0)) return;
    const attachments: UniversalCommentAttachment[] = files.map(({ file, preview }) => ({
      kind: file.type.startsWith("image/") ? "image" : file.type.startsWith("video/") ? "video" : file.type.startsWith("audio/") ? "audio" : "file",
      url: preview,
      mimeType: file.type,
    }));
    await onSubmit({ body: body.trim(), attachments });
    setBody("");
    files.forEach(({ preview }) => URL.revokeObjectURL(preview));
    setFiles([]);
    if (inputRef.current) inputRef.current.value = "";
  }

  return <div className="universal-comment-composer" aria-label="Universal comment composer">
    {error && <div className="auth-error" role="alert">{error}</div>}
    {files.length > 0 && <div className="comment-attachment-previews" aria-label="Selected attachments">
      {files.map(({ file, preview }, index) => <div className="comment-attachment-preview" key={`${file.name}-${index}`}>
        {file.type.startsWith("image/") && <img src={preview} alt="Comment attachment preview" />}
        {file.type.startsWith("video/") && <video src={preview} controls />}
        {file.type.startsWith("audio/") && <audio src={preview} controls />}
        {!file.type.startsWith("image/") && !file.type.startsWith("video/") && !file.type.startsWith("audio/") && <span>{file.name}</span>}
        <button type="button" aria-label={`Remove ${file.name}`} onClick={() => remove(index)}>×</button>
      </div>)}
    </div>}
    <div className="comment-input-row">
      <input ref={inputRef} type="file" hidden multiple accept="image/*,video/*,audio/*,.pdf,.txt,.doc,.docx" onChange={(e) => addFiles(e.target.files)} />
      <button type="button" className="icon-only-btn" aria-label="Attach image, video, audio or file" onClick={() => inputRef.current?.click()}>＋</button>
      <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder={placeholder} aria-label={placeholder} />
      <button type="button" className="add-note-btn" disabled={disabled || (!body.trim() && files.length === 0)} onClick={() => void submit()}>Send</button>
    </div>
  </div>;
}

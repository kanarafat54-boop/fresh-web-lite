import { useEffect, useRef, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { useFreshId } from "../../fresh-id/context/FreshIdContext";
import { CloseIcon, SendIcon, MicIcon, VideoCameraIcon, StopIcon } from "../../../components/Icons";
import type { CommentTargetType } from "../types/comment";
import { validateInteractionAttachments } from "../../../core/interactions/FreshAttachmentValidation";
import { announceInteraction } from "../../../core/interactions/FreshInteractionA11y";
import type { UniversalCommentAttachment, InteractionMediaKind } from "../../../core/interactions/FreshReactionModel";

interface CommentPanelProps {
  targetType: CommentTargetType;
  targetId: string;
  onClose: () => void;
}

type Row = {
  id: string;
  author_id: string;
  content: string | null;
  audio_url: string | null;
  video_url: string | null;
  attachments: UniversalCommentAttachment[];
  parent_id: string | null;
  moderation_state?: string;
  created_at: string;
};

type ViewRow = Row & {
  authorName: string;
  authorUsername: string;
  replies: ViewRow[];
};

const TABLE_MAP: Record<CommentTargetType, string> = {
  post: "post_comments",
  short: "short_comments",
};

const COLUMN_MAP: Record<CommentTargetType, string> = {
  post: "post_id",
  short: "short_id",
};

const QUICK_REACTIONS = ["❤️", "😂", "😮", "😢", "🔥", "👏", "🙌", "💯"];
const SHEET_MIN = 55;
const SHEET_MAX = 88;

function buildTree(rows: ViewRow[]): ViewRow[] {
  const map = new Map(rows.map((row) => [row.id, { ...row, replies: [] }]));
  const roots: ViewRow[] = [];
  map.forEach((row) => {
    if (row.parent_id && map.has(row.parent_id)) {
      map.get(row.parent_id)!.replies.push(row);
    } else {
      roots.push(row);
    }
  });
  return roots;
}

function inferKind(file: File): InteractionMediaKind {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("audio/")) return "audio";
  if (file.type.startsWith("video/")) return "video";
  return "file";
}

export function CommentPanel({ targetType, targetId, onClose }: CommentPanelProps) {
  const { user, isGuest } = useFreshId();
  const table = TABLE_MAP[targetType];
  const column = COLUMN_MAP[targetType];

  const [comments, setComments] = useState<ViewRow[]>([]);
  const [draft, setDraft] = useState("");
  const [replyingTo, setReplyingTo] = useState<{ id: string; authorName: string } | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sheetHeight, setSheetHeight] = useState(SHEET_MIN);
  const [recordMode, setRecordMode] = useState<"none" | "audio" | "video">("none");
  const [recording, setRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const dragY = useRef<number | null>(null);
  const dragH = useRef(SHEET_MIN);
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const chunks = useRef<BlobPart[]>([]);
  const live = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    void loadComments();
  }, [targetId, table, column]);

  useEffect(() => {
    return () => {
      stream.current?.getTracks().forEach((track) => track.stop());
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  async function loadComments() {
    setLoading(true);
    setError(null);
    const { data, error: queryError } = await supabase
      .from(table)
      .select("id,author_id,content,audio_url,video_url,attachments,parent_id,moderation_state,created_at")
      .eq(column, targetId)
      .order("created_at", { ascending: true });

    if (queryError) {
      setError(queryError.message);
      setLoading(false);
      return;
    }

    const ids = [...new Set((data ?? []).map((row: any) => row.author_id).filter(Boolean))];
    let profiles: any[] = [];
    if (ids.length) {
      const result = await supabase.from("users").select("id,full_name,username").in("id", ids);
      profiles = result.data ?? [];
    }

    const profileMap = new Map(profiles.map((profile) => [profile.id, profile]));
    const rows: ViewRow[] = (data ?? []).map((row: any) => ({
      ...row,
      attachments: Array.isArray(row.attachments) ? row.attachments : [],
      authorName: profileMap.get(row.author_id)?.full_name ?? "Unknown",
      authorUsername: profileMap.get(row.author_id)?.username ?? "unknown",
      replies: [],
    }));

    setComments(buildTree(rows));
    setLoading(false);
  }

  async function startRecording(mode: "audio" | "video") {
    try {
      const media = await navigator.mediaDevices.getUserMedia(
        mode === "audio" ? { audio: true } : { audio: true, video: { facingMode: "user" } },
      );
      stream.current = media;
      chunks.current = [];
      setRecordMode(mode);

      if (mode === "video" && live.current) {
        live.current.srcObject = media;
        await live.current.play().catch(() => undefined);
      }

      const mediaRecorder = new MediaRecorder(media);
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size) chunks.current.push(event.data);
      };
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks.current, {
          type: mode === "audio" ? "audio/webm" : "video/webm",
        });
        setRecordedBlob(blob);
        setPreview(URL.createObjectURL(blob));
        media.getTracks().forEach((track) => track.stop());
        stream.current = null;
      };
      recorder.current = mediaRecorder;
      mediaRecorder.start();
      setRecording(true);
    } catch (recordError: any) {
      setError(recordError?.message ?? "Media permission denied");
    }
  }

  function stopRecording() {
    recorder.current?.stop();
    setRecording(false);
  }

  function cancelMedia() {
    stream.current?.getTracks().forEach((track) => track.stop());
    setRecordMode("none");
    setRecording(false);
    setRecordedBlob(null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
  }

  async function uploadFile(file: File) {
    if (!user) throw new Error("Sign in required");
    const path = `${user.id}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const { error: uploadError } = await supabase.storage
      .from("comment-media")
      .upload(path, file, { contentType: file.type, upsert: false });
    if (uploadError) throw uploadError;
    const { data } = supabase.storage.from("comment-media").getPublicUrl(path);
    return { kind: inferKind(file), url: data.publicUrl, mimeType: file.type, altText: file.name };
  }

  async function addComment() {
    if (!user || isGuest || (!draft.trim() && !recordedBlob && !files.length)) return;
    setPosting(true);
    setError(null);
    try {
      const attachments: UniversalCommentAttachment[] = [];
      for (const file of files) attachments.push(await uploadFile(file));

      if (recordedBlob) {
        const file = new File([recordedBlob], `${crypto.randomUUID()}.webm`, { type: recordedBlob.type });
        const uploaded = await uploadFile(file);
        attachments.push({ ...uploaded, kind: recordMode === "audio" ? "audio" : "video" });
      }

      const payload = {
        [column]: targetId,
        author_id: user.id,
        content: draft.trim() || null,
        audio_url: attachments.find((item) => item.kind === "audio")?.url ?? null,
        video_url: attachments.find((item) => item.kind === "video")?.url ?? null,
        attachments,
        parent_id: replyingTo?.id ?? null,
        moderation_state: "visible",
      };

      const { error: insertError } = await supabase.from(table).insert(payload);
      if (insertError) throw insertError;

      announceInteraction(replyingTo ? "Reply posted" : "Comment posted");
      setDraft("");
      setReplyingTo(null);
      cancelMedia();
      setFiles([]);
      await loadComments();
    } catch (postError: any) {
      setError(postError?.message ?? "Couldn't post comment");
    } finally {
      setPosting(false);
    }
  }

  function selectFiles(list: FileList | null) {
    if (!list) return;
    const next = [...files, ...Array.from(list)];
    const validation = validateInteractionAttachments(next);
    if (!validation.valid) {
      setError(validation.error ?? "Invalid attachment");
      return;
    }
    setError(null);
    setFiles(next);
  }

  function timeAgo(iso: string) {
    const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
    if (minutes < 1) return "just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  }

  function renderComment(comment: ViewRow, depth = 0): React.ReactNode {
    return (
      <div key={comment.id} style={{ marginLeft: depth * 20 }}>
        <div className="comment-item">
          <div className="comment-header">
            <span className="post-author">{comment.authorName}</span>
            <span className="post-username">@{comment.authorUsername}</span>
            <span className="post-time">{timeAgo(comment.created_at)}</span>
          </div>

          {comment.moderation_state && comment.moderation_state !== "visible" ? (
            <p className="empty-state">This comment is {comment.moderation_state}.</p>
          ) : (
            <>
              {comment.content && <p className="comment-content">{comment.content}</p>}
              {comment.attachments.map((attachment, index) => {
                if (attachment.kind === "video") {
                  return <video key={index} controls src={attachment.url} className="comment-video-player" />;
                }
                if (attachment.kind === "audio") {
                  return <audio key={index} controls src={attachment.url} className="comment-audio-player" />;
                }
                if (attachment.kind === "image") {
                  return <img key={index} src={attachment.url} alt={attachment.altText ?? "Comment attachment"} style={{ maxWidth: "100%", borderRadius: 12 }} />;
                }
                return (
                  <a key={index} href={attachment.url} target="_blank" rel="noreferrer">
                    {attachment.altText ?? "Open attachment"}
                  </a>
                );
              })}
              <button className="reply-btn" onClick={() => setReplyingTo({ id: comment.id, authorName: comment.authorName })}>
                Reply
              </button>
            </>
          )}
        </div>
        {comment.replies.map((reply) => renderComment(reply, depth + 1))}
      </div>
    );
  }

  return (
    <div className="comment-panel-backdrop" onClick={onClose}>
      <div
        className="comment-panel"
        style={{ height: `${sheetHeight}vh`, maxHeight: `${sheetHeight}vh` }}
        onClick={(event) => event.stopPropagation()}
      >
        <div
          className="sheet-drag-handle"
          onPointerDown={(event) => {
            dragY.current = event.clientY;
            dragH.current = sheetHeight;
          }}
          onPointerMove={(event) => {
            if (event.buttons === 1 && dragY.current !== null) {
              setSheetHeight(Math.min(SHEET_MAX, Math.max(SHEET_MIN, dragH.current + ((dragY.current - event.clientY) / window.innerHeight) * 100)));
            }
          }}
          onPointerUp={() => {
            dragY.current = null;
            setSheetHeight((height) => (height > (SHEET_MIN + SHEET_MAX) / 2 ? SHEET_MAX : SHEET_MIN));
          }}
        />

        <div className="comment-panel-header">
          <h3>Comments</h3>
          <button className="back-btn" onClick={onClose} aria-label="Close comments">
            <CloseIcon size={20} />
          </button>
        </div>

        <div className="comment-list">
          {loading && <p className="empty-state">Loading comments...</p>}
          {!loading && !comments.length && <p className="empty-state">No comments yet. Be the first.</p>}
          {comments.map((comment) => renderComment(comment))}
        </div>

        {error && <p className="auth-error" role="alert">{error}</p>}

        {replyingTo && (
          <div className="replying-banner">
            <span>Replying to {replyingTo.authorName}</span>
            <button className="back-btn" onClick={() => setReplyingTo(null)} aria-label="Cancel reply">
              <CloseIcon size={14} />
            </button>
          </div>
        )}

        {recordMode !== "none" && (
          <div className="recorder-panel">
            {recordMode === "video" && !preview && <video ref={live} muted playsInline className="recorder-live-video" />}
            {preview && (recordMode === "audio" ? <audio controls src={preview} /> : <video controls src={preview} className="recorder-live-video" />)}
            <div className="recorder-controls">
              {recording ? (
                <button className="add-note-btn" onClick={stopRecording}><StopIcon size={16} /> Stop</button>
              ) : (
                <button className="add-note-btn" onClick={() => void startRecording(recordMode as "audio" | "video")}>Start recording</button>
              )}
              <button className="icon-btn-outline" onClick={cancelMedia}>Cancel</button>
            </div>
          </div>
        )}

        {!isGuest && user ? (
          <>
            <div className="quick-reaction-row">
              {QUICK_REACTIONS.map((reaction) => (
                <button key={reaction} className="quick-reaction-chip" onClick={() => setDraft((value) => value + reaction)} aria-label={`Add ${reaction}`}>
                  {reaction}
                </button>
              ))}
            </div>
            <div className="comment-input-row">
              <label className="icon-only-btn" aria-label="Attach images or files">
                <input hidden type="file" multiple accept="image/*,audio/*,video/*,.pdf,.txt,.doc,.docx" onChange={(event) => selectFiles(event.target.files)} />
                📎
              </label>
              <button className="icon-only-btn" onClick={() => void startRecording("audio")} aria-label="Record audio"><MicIcon size={18} /></button>
              <button className="icon-only-btn" onClick={() => void startRecording("video")} aria-label="Record video"><VideoCameraIcon size={18} /></button>
              <input
                type="text"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder={replyingTo ? `Reply to ${replyingTo.authorName}...` : "Add a comment..."}
                className="auth-input"
                onKeyDown={(event) => {
                  if (event.key === "Enter") void addComment();
                }}
              />
              <button className="add-note-btn" onClick={() => void addComment()} disabled={posting} aria-label={posting ? "Posting" : "Send comment"}>
                {posting ? "..." : <SendIcon size={16} />}
              </button>
            </div>
            {files.length > 0 && (
              <div aria-label="Selected attachments">
                {files.map((file, index) => (
                  <span key={`${file.name}-${index}`} className="quick-reaction-chip">
                    {file.name}
                    <button onClick={() => setFiles((current) => current.filter((_, itemIndex) => itemIndex !== index))} aria-label={`Remove ${file.name}`}>×</button>
                  </span>
                ))}
              </div>
            )}
          </>
        ) : (
          <p className="empty-state">Register to comment.</p>
        )}
      </div>
    </div>
  );
}

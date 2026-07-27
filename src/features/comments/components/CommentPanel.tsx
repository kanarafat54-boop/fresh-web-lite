/**
 * Fresh Web Lite
 * Shared Comment Panel — threaded replies, draggable sheet, quick reactions,
 * plus voice and video comments/replies
 */

import { useEffect, useRef, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { useFreshId } from "../../fresh-id/context/FreshIdContext";
import { CloseIcon, SendIcon, MicIcon, VideoCameraIcon, StopIcon } from "../../../components/Icons";
import type { Comment, CommentTargetType } from "../types/comment";

interface CommentPanelProps {
  targetType: CommentTargetType;
  targetId: string;
  onClose: () => void;
}

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

function buildTree(flat: Comment[]): Comment[] {
  const map = new Map<string, Comment>();
  flat.forEach((c) => map.set(c.id, { ...c, replies: [] }));

  const roots: Comment[] = [];
  map.forEach((c) => {
    if (c.parentId && map.has(c.parentId)) {
      map.get(c.parentId)!.replies.push(c);
    } else {
      roots.push(c);
    }
  });
  return roots;
}

export function CommentPanel({ targetType, targetId, onClose }: CommentPanelProps) {
  const { user, isGuest } = useFreshId();
  const [comments, setComments] = useState<Comment[]>([]);
  const [draft, setDraft] = useState("");
  const [replyingTo, setReplyingTo] = useState<{ id: string; authorName: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sheetHeight, setSheetHeight] = useState(SHEET_MIN);
  const dragStartY = useRef<number | null>(null);
  const dragStartHeight = useRef(SHEET_MIN);

  const [recordMode, setRecordMode] = useState<"none" | "audio" | "video">("none");
  const [recording, setRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedPreviewUrl, setRecordedPreviewUrl] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const liveVideoRef = useRef<HTMLVideoElement>(null);

  const table = TABLE_MAP[targetType];
  const column = COLUMN_MAP[targetType];

  useEffect(() => {
    loadComments();
  }, [targetId]);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  async function loadComments() {
    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from(table)
      .select(`id, author_id, content, audio_url, video_url, parent_id, created_at`)
      .eq(column, targetId)
      .order("created_at", { ascending: true });

    if (fetchError) {
      setError(`Couldn't load comments: ${fetchError.message}`);
      setLoading(false);
      return;
    }

    const authorIds = [...new Set((data ?? []).map((c: any) => c.author_id))];
    let profileMap = new Map<string, { full_name: string; username: string }>();

    if (authorIds.length > 0) {
      const { data: profilesData } = await supabase
        .from("users")
        .select("id, full_name, username")
        .in("id", authorIds);
      profileMap = new Map((profilesData ?? []).map((u: any) => [u.id, u]));
    }

    const flat: Comment[] = (data ?? []).map((c: any) => {
      const profile = profileMap.get(c.author_id);
      return {
        id: c.id,
        authorId: c.author_id,
        authorName: profile?.full_name ?? "Unknown",
        authorUsername: profile?.username ?? "unknown",
        content: c.content,
        audioUrl: c.audio_url,
        videoUrl: c.video_url,
        parentId: c.parent_id,
        createdAt: c.created_at,
        replies: [],
      };
    });

    setComments(buildTree(flat));
    setLoading(false);
  }

  async function startRecording(mode: "audio" | "video") {
    setError(null);
    try {
      const constraints = mode === "audio" ? { audio: true } : { audio: true, video: { facingMode: "user" } };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      chunksRef.current = [];

      if (mode === "video" && liveVideoRef.current) {
        liveVideoRef.current.srcObject = stream;
        liveVideoRef.current.play().catch(() => {});
      }

      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mode === "audio" ? "audio/webm" : "video/webm" });
        setRecordedBlob(blob);
        setRecordedPreviewUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecordMode(mode);
      setRecording(true);
    } catch (err: any) {
      setError(`Couldn't access ${mode === "audio" ? "microphone" : "camera"}: ${err.message ?? "permission denied"}`);
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  }

  function cancelRecording() {
    if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
    setRecordMode("none");
    setRecording(false);
    setRecordedBlob(null);
    setRecordedPreviewUrl(null);
  }

  async function addComment() {
    if (!user || isGuest) return;
    if (!draft.trim() && !recordedBlob) return;

    setPosting(true);
    setError(null);

    let audioUrl: string | null = null;
    let videoUrl: string | null = null;

    if (recordedBlob) {
      const isAudio = recordMode === "audio";
      const bucket = isAudio ? "comment-audio" : "comment-video";
      const path = `${user.id}/${crypto.randomUUID()}.webm`;

      const { error: uploadError } = await supabase.storage.from(bucket).upload(path, recordedBlob);
      if (uploadError) {
        setError(`Upload failed: ${uploadError.message}`);
        setPosting(false);
        return;
      }

      const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(path);
      if (isAudio) audioUrl = publicUrlData.publicUrl;
      else videoUrl = publicUrlData.publicUrl;
    }

    const { error: insertError } = await supabase.from(table).insert({
      [column]: targetId,
      author_id: user.id,
      content: draft.trim(),
      audio_url: audioUrl,
      video_url: videoUrl,
      parent_id: replyingTo?.id ?? null,
    });

    if (insertError) {
      setError(`Couldn't post comment: ${insertError.message}`);
      setPosting(false);
      return;
    }

    setDraft("");
    setReplyingTo(null);
    cancelRecording();
    setPosting(false);
    loadComments();
  }

  function appendEmoji(emoji: string) {
    setDraft((d) => d + emoji);
  }

  function onDragStart(clientY: number) {
    dragStartY.current = clientY;
    dragStartHeight.current = sheetHeight;
  }

  function onDragMove(clientY: number) {
    if (dragStartY.current === null) return;
    const deltaPx = dragStartY.current - clientY;
    const deltaVh = (deltaPx / window.innerHeight) * 100;
    const next = Math.min(SHEET_MAX, Math.max(SHEET_MIN, dragStartHeight.current + deltaVh));
    setSheetHeight(next);
  }

  function onDragEnd() {
    dragStartY.current = null;
    setSheetHeight((h) => (h > (SHEET_MIN + SHEET_MAX) / 2 ? SHEET_MAX : SHEET_MIN));
  }

  function timeAgo(iso: string) {
    const diffMs = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  }

  function renderComment(c: Comment, depth: number) {
    return (
      <div key={c.id} style={{ marginLeft: depth > 0 ? 20 : 0 }}>
        <div className="comment-item">
          <div className="comment-header">
            <span className="post-author">{c.authorName}</span>
            <span className="post-username">@{c.authorUsername}</span>
            <span className="post-time">{timeAgo(c.createdAt)}</span>
          </div>
          {c.content && <p className="comment-content">{c.content}</p>}
          {c.audioUrl && (
            <audio controls src={c.audioUrl} className="comment-audio-player" />
          )}
          {c.videoUrl && (
            <video controls src={c.videoUrl} className="comment-video-player" />
          )}
          {!isGuest && user && (
            <button
              className="reply-btn"
              onClick={() => setReplyingTo({ id: c.id, authorName: c.authorName })}
            >
              Reply
            </button>
          )}
        </div>
        {c.replies.map((r) => renderComment(r, depth + 1))}
      </div>
    );
  }

  return (
    <div className="comment-panel-backdrop" onClick={onClose}>
      <div
        className="comment-panel"
        style={{ height: `${sheetHeight}vh`, maxHeight: `${sheetHeight}vh` }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="sheet-drag-handle"
          onPointerDown={(e) => onDragStart(e.clientY)}
          onPointerMove={(e) => e.buttons === 1 && onDragMove(e.clientY)}
          onPointerUp={onDragEnd}
        />

        <div className="comment-panel-header">
          <h3>Comments</h3>
          <button className="back-btn" onClick={onClose}><CloseIcon size={20} /></button>
        </div>

        <div className="comment-list">
          {loading && <p className="empty-state">Loading comments...</p>}
          {!loading && comments.length === 0 && (
            <p className="empty-state">No comments yet. Be the first.</p>
          )}
          {comments.map((c) => renderComment(c, 0))}
        </div>

        {error && <p className="auth-error">{error}</p>}

        {replyingTo && (
          <div className="replying-banner">
            <span>Replying to {replyingTo.authorName}</span>
            <button className="back-btn" onClick={() => setReplyingTo(null)}><CloseIcon size={14} /></button>
          </div>
        )}

        {recordMode !== "none" && (
          <div className="recorder-panel">
            {recordMode === "video" && !recordedPreviewUrl && (
              <video ref={liveVideoRef} muted playsInline className="recorder-live-video" />
            )}
            {recordedPreviewUrl && recordMode === "audio" && (
              <audio controls src={recordedPreviewUrl} className="comment-audio-player" />
            )}
            {recordedPreviewUrl && recordMode === "video" && (
              <video controls src={recordedPreviewUrl} className="recorder-live-video" />
            )}
            <div className="recorder-controls">
              {recording && (
                <button className="add-note-btn recording-active" onClick={stopRecording}>
                  <StopIcon size={16} /> Stop
                </button>
              )}
              {!recording && !recordedBlob && (
                <button className="add-note-btn" onClick={() => startRecording(recordMode)}>
                  Start recording
                </button>
              )}
              <button className="icon-btn-outline" onClick={cancelRecording}>Cancel</button>
            </div>
          </div>
        )}

        {!isGuest && user ? (
          <>
            <div className="quick-reaction-row">
              {QUICK_REACTIONS.map((emoji) => (
                <button key={emoji} className="quick-reaction-chip" onClick={() => appendEmoji(emoji)}>
                  {emoji}
                </button>
              ))}
            </div>
            <div className="comment-input-row">
              {recordMode === "none" && (
                <>
                  <button className="icon-only-btn" onClick={() => startRecording("audio")}>
                    <MicIcon size={18} />
                  </button>
                  <button className="icon-only-btn" onClick={() => startRecording("video")}>
                    <VideoCameraIcon size={18} />
                  </button>
                </>
              )}
              <input
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={replyingTo ? `Reply to ${replyingTo.authorName}...` : "Add a comment..."}
                className="auth-input"
                onKeyDown={(e) => e.key === "Enter" && addComment()}
              />
              <button className="add-note-btn" onClick={addComment} disabled={posting}>
                {posting ? "..." : <SendIcon size={16} />}
              </button>
            </div>
          </>
        ) : (
          <p className="empty-state">Register to comment.</p>
        )}
      </div>
    </div>
  );
}

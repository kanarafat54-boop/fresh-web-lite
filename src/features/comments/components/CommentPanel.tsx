/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../../../lib/supabase";
import { useFreshId } from "../../fresh-id/context/FreshIdContext";
import { useProfileNav } from "../../profile/context/ProfileNavContext";
import { CloseIcon, SendIcon, MicIcon, VideoCameraIcon, StopIcon } from "../../../components/Icons";
import type { CommentTargetType } from "../types/comment";
import { validateInteractionAttachments } from "../../../core/interactions/FreshAttachmentValidation";
import { announceInteraction } from "../../../core/interactions/FreshInteractionA11y";
import { COMMENT_REACTIONS, applyReactionChoice, breakdownChips, emptySummary, isUnappliedReactionError, reactionDef, summarizeReactions, type ReactionSummary } from "../core/commentReactions";
import type { UniversalCommentAttachment, InteractionMediaKind } from "../../../core/interactions/FreshReactionModel";
import { rankRootsBySignal } from "../../../core/platform/commentSignalRanking";
import { sortCommentRoots, mentionQueryAt, insertMention, splitMentions, type CommentSortMode } from "../core/commentTools";
import { loadMutedCreators, setCreatorMuted } from "../../fresh-flow/core/shortsSafety";
import { loadBlockedIds } from "../../fresh-flow/core/userBlocksService";
import { withoutBlockedAuthors } from "../../fresh-flow/core/userBlocks";
import ShortsReportSheet from "../../fresh-flow/components/ShortsReportSheet";
import { explainControlError, isCommentHiddenState } from "../../fresh-flow/core/shortsPrivacy";
import { restrictAccount, reviewHeldComment } from "../../fresh-flow/core/shortsPrivacyService";
import "./CommentPanel.css";

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
  pinned_at?: string | null;
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
  const map = new Map<string, ViewRow>(rows.map((row) => [row.id, { ...row, replies: [] }]));
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

function countAll(rows: ViewRow[]): number {
  return rows.reduce((total, row) => total + 1 + countAll(row.replies), 0);
}

function compact(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return String(count);
}

function inferKind(file: File): InteractionMediaKind {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("audio/")) return "audio";
  if (file.type.startsWith("video/")) return "video";
  return "file";
}

export function CommentPanel({ targetType, targetId, onClose }: CommentPanelProps) {
  const { user, isGuest } = useFreshId();
  const { openProfile } = useProfileNav();
  const table = TABLE_MAP[targetType];
  const column = COLUMN_MAP[targetType];
  const [comments, setComments] = useState<ViewRow[]>([]);
  const [shortAuthorId, setShortAuthorId] = useState<string | null>(null);
  const [pinningId, setPinningId] = useState<string | null>(null);
  const [sortMode, setSortMode] = useState<CommentSortMode>("oldest");
  const [mutedAuthors, setMutedAuthors] = useState<Set<string>>(new Set());
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [reportCommentId, setReportCommentId] = useState<string | null>(null);
  const [mentionHits, setMentionHits] = useState<Array<{ username: string; name: string }>>([]);
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
  const [likes, setLikes] = useState<Record<string, { count: number; mine: boolean }>>({});
  const [reactions, setReactions] = useState<Record<string, ReactionSummary>>({});
  const [pickerFor, setPickerFor] = useState<string | null>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const dragY = useRef<number | null>(null);
  const dragH = useRef(SHEET_MIN);
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const chunks = useRef<BlobPart[]>([]);
  const live = useRef<HTMLVideoElement>(null);

  const displayComments = useMemo(() => {
    const visible = comments.filter((row) => !mutedAuthors.has(row.author_id));
    const stripReplies = (row: ViewRow): ViewRow => ({ ...row, replies: row.replies.filter((reply) => !mutedAuthors.has(reply.author_id)).map(stripReplies) });
    const cleaned = visible.map(stripReplies);
    const ordered = sortMode === "relevant" ? rankRootsBySignal(cleaned) as ViewRow[] : sortCommentRoots(cleaned, sortMode, (id) => likes[id]?.count ?? 0);
    return [...ordered].sort((a, b) => Number(Boolean(b.pinned_at)) - Number(Boolean(a.pinned_at)));
  }, [comments, sortMode, mutedAuthors, likes]);

  useEffect(() => {
    if (!user || isGuest) return;
    void loadMutedCreators(user.id).then(setMutedAuthors);
  }, [user, isGuest]);

  useEffect(() => {
    const query = mentionQueryAt(draft);
    if (!query || query.length < 1) { setMentionHits([]); return; }
    let cancelled = false;
    void supabase.from("user_public_profiles").select("username, full_name").ilike("username", `${query.replace(/[\\%_]/g, "")}%`).limit(5).then(({ data }) => {
      if (!cancelled) setMentionHits(((data ?? []) as any[]).filter((row) => row.username).map((row) => ({ username: row.username, name: row.full_name || row.username })));
    });
    return () => { cancelled = true; };
  }, [draft]);

  function reportComment(commentId: string) {
    setMenuFor(null);
    if (!user || isGuest) { setNotice("Sign in to report a comment."); return; }
    // Short comments use the full reporting sheet (category and explanation); other surfaces keep the simple report.
    if (targetType === "short") { setReportCommentId(commentId); return; }
    void supabase.from("reports").insert({ target_type: `${targetType}_comment`, target_id: commentId, reporter_id: user.id, reason: "user_reported" }).then(({ error: reportError }) => {
      setNotice(reportError ? "Fresh could not send your report. Try again." : "Report sent. Thanks.");
    });
  }

  async function deleteComment(commentId: string) {
    setConfirmDelete(null); setMenuFor(null);
    const { error: deleteError } = await supabase.from(table).delete().eq("id", commentId);
    if (deleteError) { setNotice("Fresh could not delete that comment."); return; }
    setNotice("Comment deleted.");
    await loadComments();
  }

  async function reviewHeld(commentId: string, approve: boolean) {
    const result = await reviewHeldComment(commentId, approve);
    if (result.ok) { setNotice(approve ? "Comment approved." : "Comment removed."); await loadComments(); }
    else setNotice(result.unavailable ? "Held comments are not available yet." : (explainControlError(result.message) ?? "Fresh could not update that comment. Try again."));
  }

  async function restrictAuthor(authorId: string, name: string) {
    setMenuFor(null);
    if (!user || isGuest) { setNotice("Sign in to restrict someone."); return; }
    const result = await restrictAccount(user.id, authorId);
    setNotice(result === "restricted" ? `Restricted ${name}. Their future comments on your Shorts are held for your approval. They are not told.` : result === "unavailable" ? "Restrict is not available yet." : "Fresh could not restrict that account. Try again.");
  }

  async function blockAuthor(authorId: string, name: string) {
    setMenuFor(null);
    if (!user || isGuest) { setNotice("Sign in to block someone."); return; }
    try { setMutedAuthors(await setCreatorMuted(user.id, authorId, true)); setNotice(`Blocked ${name}. Their comments and Shorts are hidden for you.`); }
    catch { setNotice("Fresh could not save that. Try again."); }
  }

  useEffect(() => {
    void loadComments();
    if (targetType === "short") {
      void supabase.from("shorts").select("author_id").eq("id", targetId).maybeSingle()
        .then(({ data }) => setShortAuthorId((data as any)?.author_id ?? null));
    } else setShortAuthorId(null);
  }, [targetId, table, column, targetType]);

  useEffect(() => {
    return () => {
      stream.current?.getTracks().forEach((track) => track.stop());
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  async function loadComments() {
    setLoading(true);
    setError(null);
    const primary = await supabase.from(table)
      .select("id,author_id,content,audio_url,video_url,attachments,parent_id,moderation_state,created_at,pinned_at")
      .eq(column, targetId).order("created_at", { ascending: true });
    let data: any[] | null = primary.data as any[] | null;
    let queryError: any = primary.error;
    if (targetType === "short" && primary.error && /pinned_at|column/i.test(primary.error.message)) {
      const fallback = await supabase.from(table)
        .select("id,author_id,content,audio_url,video_url,attachments,parent_id,moderation_state,created_at")
        .eq(column, targetId).order("created_at", { ascending: true });
      data = fallback.data as any[] | null;
      queryError = fallback.error;
    }
    if (queryError) {
      setError(queryError.message);
      setLoading(false);
      return;
    }
    // Comments by accounts the viewer blocked are hidden from them.
    if (user && !isGuest) {
      const blocked = await loadBlockedIds(user.id);
      data = withoutBlockedAuthors((data ?? []) as any[], blocked, (row: any) => row.author_id);
    }
    const ids = [...new Set((data ?? []).map((row: any) => row.author_id).filter(Boolean))];
    let profiles: any[] = [];
    if (ids.length) {
      const result = await supabase.from("user_public_profiles").select("id,full_name,username").in("id", ids);
      profiles = result.data ?? [];
    }
    const profileMap = new Map(profiles.map((profile) => [profile.id, profile]));
    const rows: ViewRow[] = (data ?? []).map((row: any) => ({
      ...row,
      pinned_at: row.pinned_at ?? null,
      attachments: Array.isArray(row.attachments) ? row.attachments : [],
      authorName: profileMap.get(row.author_id)?.full_name ?? "Unknown",
      authorUsername: profileMap.get(row.author_id)?.username ?? "unknown",
      replies: [],
    }));
    setComments(buildTree(rows));
    setLoading(false);
    if (targetType === "short" && rows.length) {
      const reactionRows = await supabase.from("short_comment_reactions").select("comment_id,user_id,reaction_type").in("comment_id", rows.map((row) => row.id));
      const summaries = summarizeReactions((reactionRows.data ?? []) as any[], user?.id);
      const next: Record<string, { count: number; mine: boolean }> = {};
      for (const [commentId, summary] of Object.entries(summaries)) next[commentId] = { count: summary.counts.like ?? 0, mine: summary.mine === "like" };
      setLikes(next);
      setReactions(summaries);
    }
  }

  async function togglePinned(commentId: string, currentlyPinned: boolean) {
    if (!user || isGuest || targetType !== "short" || user.id !== shortAuthorId) return;
    setPinningId(commentId);
    setError(null);
    const { error: pinError } = await supabase.rpc("pin_short_comment", { p_comment_id: commentId, p_pinned: !currentlyPinned });
    if (pinError) {
      setError(pinError.message.includes("function") || pinError.message.includes("schema cache")
        ? "Pinned comments are waiting for the Fresh Shorts database migration."
        : pinError.message);
    } else {
      setComments((rows) => rows.map((row) => ({ ...row, pinned_at: row.id === commentId ? (!currentlyPinned ? new Date().toISOString() : null) : (!currentlyPinned ? null : row.pinned_at) })));
      setNotice(currentlyPinned ? "Comment unpinned." : "Comment pinned to the top.");
    }
    setPinningId(null);
  }

  async function toggleLike(commentId: string) {
    if (!user || isGuest || targetType !== "short") return;
    const current = likes[commentId] ?? { count: 0, mine: false };
    const before = reactions[commentId] ?? emptySummary();
    setLikes((all) => ({ ...all, [commentId]: { count: Math.max(0, current.count + (current.mine ? -1 : 1)), mine: !current.mine } }));
    setReactions((all) => ({ ...all, [commentId]: applyReactionChoice(before, "like") }));
    const result = current.mine
      ? await supabase.from("short_comment_reactions").delete().eq("comment_id", commentId).eq("user_id", user.id)
      : await supabase.from("short_comment_reactions").upsert({ comment_id: commentId, user_id: user.id, reaction_type: "like" }, { onConflict: "comment_id,user_id" });
    if (result.error) {
      setLikes((all) => ({ ...all, [commentId]: current }));
      setReactions((all) => ({ ...all, [commentId]: before }));
      setError(result.error.message);
    }
  }

  async function chooseReaction(commentId: string, type: string) {
    if (!user || isGuest || targetType !== "short") return;
    const before = reactions[commentId] ?? emptySummary();
    const after = applyReactionChoice(before, type);
    setPickerFor(null);
    setReactions((all) => ({ ...all, [commentId]: after }));
    setLikes((all) => ({ ...all, [commentId]: { count: after.counts.like ?? 0, mine: after.mine === "like" } }));
    const result = after.mine
      ? await supabase.from("short_comment_reactions").upsert({ comment_id: commentId, user_id: user.id, reaction_type: type }, { onConflict: "comment_id,user_id" })
      : await supabase.from("short_comment_reactions").delete().eq("comment_id", commentId).eq("user_id", user.id);
    if (result.error) {
      setReactions((all) => ({ ...all, [commentId]: before }));
      setLikes((all) => ({ ...all, [commentId]: { count: before.counts.like ?? 0, mine: before.mine === "like" } }));
      setError(isUnappliedReactionError(result.error) ? "That reaction is waiting for the Fresh Shorts database update. Try another reaction for now." : result.error.message);
    }
  }

  async function startRecording(mode: "audio" | "video") {
    try {
      const media = await navigator.mediaDevices.getUserMedia(mode === "audio" ? { audio: true } : { audio: true, video: { facingMode: "user" } });
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
        const blob = new Blob(chunks.current, { type: mode === "audio" ? "audio/webm" : "video/webm" });
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
    const { error: uploadError } = await supabase.storage.from("comment-media").upload(path, file, { contentType: file.type, upsert: false });
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
      setError(explainControlError(postError?.message) ?? postError?.message ?? "Couldn't post comment");
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

  const mentionIds = useMemo(() => {
    const map = new Map<string, string>();
    const walk = (rows: ViewRow[]) => rows.forEach((row) => { if (row.authorUsername !== "unknown") map.set(row.authorUsername.toLowerCase(), row.author_id); walk(row.replies); });
    walk(comments);
    return map;
  }, [comments]);

  function renderComment(comment: ViewRow, depth = 0): React.ReactNode {
    const like = likes[comment.id] ?? { count: 0, mine: false };
    const hidden = isCommentHiddenState(comment.moderation_state);
    const held = comment.moderation_state === "pending";
    return (
      <div key={comment.id} className={depth ? "comment-reply" : "comment-root"}>
        <div className="comment-item">
          <button type="button" className="comment-avatar" onClick={() => openProfile(comment.author_id)} aria-label={`Open ${comment.authorName}'s profile`}>{(comment.authorName || "?").slice(0, 1).toUpperCase()}</button>
          <div className="comment-body">
            <div className="comment-header">
              <button type="button" className="comment-author-profile" onClick={() => openProfile(comment.author_id)}>{comment.authorUsername !== "unknown" ? comment.authorUsername : comment.authorName}</button>
              <span className="post-time">{timeAgo(comment.created_at)}</span>
            </div>
            {held && <span className="short-comment-held" role="status">{user?.id === comment.author_id ? "Held for review. Only you and the creator can see this until it is approved." : "Held for your review."}</span>}
            {held && targetType === "short" && user?.id === shortAuthorId && !isGuest && (
              <span className="comment-menu" role="group" aria-label="Review held comment">
                <button type="button" className="reply-btn" onClick={() => void reviewHeld(comment.id, true)}>Approve</button>
                <button type="button" className="reply-btn" onClick={() => void reviewHeld(comment.id, false)}>Remove</button>
              </span>
            )}
            {comment.pinned_at && !hidden && <span className="short-comment-pinned" aria-label="Pinned by creator">📌 Pinned by creator</span>}
            {hidden ? (
              <p className="empty-state">This comment is {comment.moderation_state}.</p>
            ) : (
              <>
                {comment.content && <p className="comment-content">{splitMentions(comment.content).map((part, i) => part.mention ? <button key={i} type="button" className="comment-mention" onClick={() => { const known = mentionIds.get(part.mention!.toLowerCase()); if (known) openProfile(known); }}>{part.text}</button> : <span key={i}>{part.text}</span>)}</p>}
                {comment.attachments.map((attachment, index) => {
                  if (attachment.kind === "video") return <video key={index} controls src={attachment.url} className="comment-video-player" />;
                  if (attachment.kind === "audio") return <audio key={index} controls src={attachment.url} className="comment-audio-player" />;
                  if (attachment.kind === "image") return <img key={index} src={attachment.url} alt={attachment.altText ?? "Comment attachment"} className="comment-image" />;
                  return <a key={index} href={attachment.url} target="_blank" rel="noreferrer">{attachment.altText ?? "Open attachment"}</a>;
                })}
                <button className="reply-btn" onClick={() => setReplyingTo({ id: comment.id, authorName: comment.authorName })}>Reply</button>
                {targetType === "short" && depth === 0 && user?.id === shortAuthorId && !isGuest && <button className="reply-btn" type="button" disabled={pinningId === comment.id} onClick={() => void togglePinned(comment.id, Boolean(comment.pinned_at))}>{pinningId === comment.id ? "…" : comment.pinned_at ? "Unpin" : "Pin"}</button>}
                <button className="reply-btn" onClick={() => setMenuFor(menuFor === comment.id ? null : comment.id)} aria-expanded={menuFor === comment.id} aria-label="More comment actions">⋯</button>
                {menuFor === comment.id && (
                  <span className="comment-menu" role="group" aria-label="Comment actions">
                    {user && comment.author_id === user.id ? (
                      confirmDelete === comment.id
                        ? <button type="button" className="reply-btn" onClick={() => void deleteComment(comment.id)}>Confirm delete</button>
                        : <button type="button" className="reply-btn" onClick={() => setConfirmDelete(comment.id)}>Delete my comment</button>
                    ) : (
                      <>
                        <button type="button" className="reply-btn" onClick={() => void reportComment(comment.id)}>Report</button>
                        {targetType === "short" && user?.id === shortAuthorId && !isGuest && <button type="button" className="reply-btn" onClick={() => void restrictAuthor(comment.author_id, comment.authorName)}>Restrict {comment.authorUsername !== "unknown" ? `@${comment.authorUsername}` : comment.authorName}</button>}
                        <button type="button" className="reply-btn" onClick={() => void blockAuthor(comment.author_id, comment.authorName)}>Block {comment.authorUsername !== "unknown" ? `@${comment.authorUsername}` : comment.authorName}</button>
                      </>
                    )}
                  </span>
                )}
              </>
            )}
          </div>
          {targetType === "short" && !hidden && (
            <button type="button" className={`comment-like${like.mine ? " liked" : ""}`} onClick={() => void toggleLike(comment.id)} aria-pressed={like.mine} aria-label={like.mine ? "Unlike comment" : "Like comment"} disabled={isGuest || !user}>
              <span aria-hidden="true">{like.mine ? "♥" : "♡"}</span>
              <small>{like.count ? compact(like.count) : ""}</small>
            </button>
          )}
          {targetType === "short" && !hidden && (
            <button type="button" className="comment-react" onClick={() => setPickerFor((open) => (open === comment.id ? null : comment.id))} aria-expanded={pickerFor === comment.id} aria-label="React to comment" disabled={isGuest || !user}>
              <span aria-hidden="true">{(() => { const mine = (reactions[comment.id] ?? emptySummary()).mine; const def = mine ? reactionDef(mine) : null; return def && mine !== "like" ? def.emoji : "☺"; })()}</span>
            </button>
          )}
        </div>
        {targetType === "short" && !hidden && breakdownChips(reactions[comment.id] ?? emptySummary()).length > 0 && (
          <div className="comment-reaction-chips" aria-label="Reactions">
            {breakdownChips(reactions[comment.id] ?? emptySummary()).map((chip) => <span key={chip.type} className="comment-reaction-chip" title={chip.label}><span aria-hidden="true">{chip.emoji}</span> {compact(chip.count)}</span>)}
          </div>
        )}
        {pickerFor === comment.id && (
          <div className="comment-reaction-picker" role="group" aria-label="Choose a reaction">
            {COMMENT_REACTIONS.map((def) => (
              <button key={def.type} type="button" className={(reactions[comment.id] ?? emptySummary()).mine === def.type ? "selected" : ""} onClick={() => void chooseReaction(comment.id, def.type)} aria-label={def.label} aria-pressed={(reactions[comment.id] ?? emptySummary()).mine === def.type} title={def.label}>
                <span aria-hidden="true">{def.emoji}</span>
              </button>
            ))}
          </div>
        )}
        {comment.replies.map((reply) => renderComment(reply, depth + 1))}
      </div>
    );
  }

  return (
    <div className="comment-panel-backdrop fresh-comments-backdrop" onClick={onClose}>
      <div className="comment-panel fresh-comments" role="dialog" aria-label="Comments" style={{ height: `${sheetHeight}vh`, maxHeight: `${sheetHeight}vh` }} onClick={(event) => event.stopPropagation()}>
        <div className="sheet-drag-handle" onPointerDown={(event) => { dragY.current = event.clientY; dragH.current = sheetHeight; }} onPointerMove={(event) => { if (event.buttons === 1 && dragY.current !== null) setSheetHeight(Math.min(SHEET_MAX, Math.max(SHEET_MIN, dragH.current + ((dragY.current - event.clientY) / window.innerHeight) * 100))); }} onPointerUp={() => { dragY.current = null; setSheetHeight((height) => height > (SHEET_MIN + SHEET_MAX) / 2 ? SHEET_MAX : SHEET_MIN); }} />
        <div className="comment-panel-header">
          <h3>Comments{comments.length ? ` (${compact(countAll(comments))})` : ""}</h3>
          <button className="back-btn comment-close-btn" onClick={onClose} aria-label="Close comments"><CloseIcon size={20} /></button>
          <div className="comment-sort-row">
            {([ ["relevant", "Relevant"], ["newest", "Newest"], ["liked", "Most liked"], ["oldest", "Oldest"] ] as Array<[CommentSortMode, string]>).map(([mode, label]) => (
              <button key={mode} type="button" className="reply-btn" onClick={() => setSortMode(mode)} aria-pressed={sortMode === mode} title={mode === "relevant" ? "Domain expertise / signal-value ranking" : undefined}>{label}</button>
            ))}
          </div>
        </div>
        <div className="comment-list">
          {loading && <p className="empty-state">Loading comments...</p>}
          {!loading && !comments.length && <p className="empty-state">No comments yet. Be the first.</p>}
          {displayComments.map((comment) => renderComment(comment))}
        </div>
        {error && <p className="auth-error" role="alert">{error}</p>}
        {notice && <p className="empty-state" role="status">{notice}</p>}
        {replyingTo && <div className="replying-banner"><span>Replying to {replyingTo.authorName}</span><button className="back-btn" onClick={() => setReplyingTo(null)} aria-label="Cancel reply"><CloseIcon size={14} /></button></div>}
        {recordMode !== "none" && <div className="recorder-panel">
          {recordMode === "video" && !preview && <video ref={live} muted playsInline className="recorder-live-video" />}
          {preview && (recordMode === "audio" ? <audio controls src={preview} /> : <video controls src={preview} className="recorder-live-video" />)}
          <div className="recorder-controls">
            {recording ? <button className="add-note-btn" onClick={stopRecording}><StopIcon size={16} /> Stop</button> : <button className="add-note-btn" onClick={() => void startRecording(recordMode as "audio" | "video")}>Start recording</button>}
            <button className="icon-btn-outline" onClick={cancelMedia}>Cancel</button>
          </div>
        </div>}
        {!isGuest && user ? <>
          {mentionHits.length > 0 && <div className="quick-reaction-row" role="listbox" aria-label="Mention suggestions">{mentionHits.map((hit) => <button key={hit.username} type="button" role="option" aria-selected="false" className="quick-reaction-chip" onClick={() => { setDraft((value) => insertMention(value, hit.username)); setMentionHits([]); }}>@{hit.username}</button>)}</div>}
          {emojiOpen && <div className="quick-reaction-row">{QUICK_REACTIONS.map((reaction) => <button key={reaction} className="quick-reaction-chip" onClick={() => setDraft((value) => value + reaction)} aria-label={`Add ${reaction}`}>{reaction}</button>)}</div>}
          <div className="comment-input-row">
            <input type="text" value={draft} onChange={(event) => setDraft(event.target.value)} placeholder={replyingTo ? `Reply to ${replyingTo.authorName}...` : "Add a comment..."} className="comment-input" aria-label="Add a comment" onKeyDown={(event) => { if (event.key === "Enter") void addComment(); }} />
            <button className="icon-only-btn" onClick={() => setEmojiOpen((open) => !open)} aria-label="Emoji" aria-pressed={emojiOpen}>☺</button>
            <label className="icon-only-btn" aria-label="Attach images or files"><input hidden type="file" multiple accept="image/*,audio/*,video/*,.pdf,.txt,.doc,.docx" onChange={(event) => selectFiles(event.target.files)} />📎</label>
            <button className="icon-only-btn" onClick={() => void startRecording("audio")} aria-label="Record audio"><MicIcon size={18} /></button>
            <button className="icon-only-btn" onClick={() => void startRecording("video")} aria-label="Record video"><VideoCameraIcon size={18} /></button>
            <button className="comment-send" onClick={() => void addComment()} disabled={posting} aria-label={posting ? "Posting" : "Send comment"}>{posting ? "…" : <SendIcon size={16} />}</button>
          </div>
          {files.length > 0 && <div aria-label="Selected attachments">{files.map((file, index) => <span key={`${file.name}-${index}`} className="quick-reaction-chip">{file.name}<button onClick={() => setFiles((current) => current.filter((_, itemIndex) => itemIndex !== index))} aria-label={`Remove ${file.name}`}>×</button></span>)}</div>}
        </> : <p className="empty-state">Register to comment.</p>}
      </div>
      {reportCommentId && user && !isGuest ? (
        <div onClick={(event) => event.stopPropagation()}>
          <ShortsReportSheet targetType="short_comment" targetId={reportCommentId} userId={user.id} onClose={() => setReportCommentId(null)} onSent={() => setNotice("Report sent. Thanks.")} />
        </div>
      ) : null}
    </div>
  );
}

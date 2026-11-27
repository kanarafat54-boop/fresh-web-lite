/**
 * Rich comment content that needs no new database column:
 *  - Stickers travel as the comment text `:sticker:<id>:`. A client that does not know the id shows it as plain text.
 *  - Links are found in the text when it is shown; only http(s) addresses become tappable.
 */

export type CommentSticker = { id: string; glyph: string; label: string };

export const COMMENT_STICKERS: readonly CommentSticker[] = [
  { id: "fire", glyph: "🔥", label: "On fire" },
  { id: "love", glyph: "😍", label: "Love it" },
  { id: "lol", glyph: "🤣", label: "Laughing" },
  { id: "wow", glyph: "🤯", label: "Mind blown" },
  { id: "clap", glyph: "👏", label: "Applause" },
  { id: "hundred", glyph: "💯", label: "Hundred" },
  { id: "cry", glyph: "😭", label: "Crying" },
  { id: "think", glyph: "🤔", label: "Thinking" },
  { id: "party", glyph: "🥳", label: "Party" },
  { id: "salute", glyph: "🫡", label: "Salute" },
  { id: "heart", glyph: "💜", label: "Purple heart" },
  { id: "rocket", glyph: "🚀", label: "To the moon" },
];

export const COMMENT_EMOJI_GROUPS: readonly { label: string; emoji: readonly string[] }[] = [
  { label: "Smileys", emoji: ["😀", "😂", "🥹", "😊", "😍", "😘", "😎", "🤩", "🥳", "😮", "😢", "😭", "😡", "🤔", "🙄", "😴"] },
  { label: "Hands", emoji: ["👍", "👎", "👏", "🙌", "🙏", "💪", "🤝", "✌️", "🤞", "👌", "🫶", "👋"] },
  { label: "Hearts and symbols", emoji: ["❤️", "💜", "💙", "💚", "🔥", "✨", "💯", "⭐", "🎉", "💡", "✅", "❓"] },
];

const STICKER_RE = /^:sticker:([a-z0-9_-]{1,24}):$/;

export function stickerToken(id: string): string {
  return `:sticker:${id}:`;
}

/** The sticker a whole comment consists of, or null when the comment is ordinary text. */
export function parseSticker(content: string | null | undefined): CommentSticker | null {
  const match = STICKER_RE.exec((content ?? "").trim());
  return match ? COMMENT_STICKERS.find((sticker) => sticker.id === match[1]) ?? null : null;
}

export type LinkPart = { text: string; href?: string; host?: string };

/** Splits text into plain parts and http(s) links. Trailing punctuation stays outside the link. */
export function splitLinks(text: string): LinkPart[] {
  const parts: LinkPart[] = [];
  let last = 0;
  for (const match of text.matchAll(/https?:\/\/[^\s<>"']+/gi)) {
    const start = match.index ?? 0;
    const raw = match[0];
    const trimmed = raw.replace(/[.,;:!?)\]}]+$/, "");
    let url: URL;
    try { url = new URL(trimmed); } catch { continue; }
    if (url.protocol !== "http:" && url.protocol !== "https:") continue;
    if (start > last) parts.push({ text: text.slice(last, start) });
    parts.push({ text: trimmed, href: url.href, host: url.hostname.replace(/^www\./, "") });
    last = start + trimmed.length;
  }
  if (last < text.length) parts.push({ text: text.slice(last) });
  return parts;
}

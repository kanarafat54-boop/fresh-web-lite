/**
 * Symbol stickers. Each is a text layer holding one symbol from the DejaVu Sans font, which the export already uses,
 * so what you see is what the render produces. They are single-colour symbols, not colour emoji or animated packs.
 * Every symbol below was checked to exist in DejaVu Sans.
 */
import type { TextLayer } from "./timeline.ts";

export type Sticker = { glyph: string; name: string; color: string };

export const STICKERS: readonly Sticker[] = [
  { glyph: "★", name: "Star", color: "#ffd54a" }, { glyph: "❤", name: "Heart", color: "#ff4d6d" }, { glyph: "✔", name: "Tick", color: "#5dde8a" },
  { glyph: "✖", name: "Cross", color: "#ff5a5a" }, { glyph: "➜", name: "Arrow", color: "#ffffff" }, { glyph: "☀", name: "Sun", color: "#ffd54a" },
  { glyph: "☁", name: "Cloud", color: "#dbe7ff" }, { glyph: "☂", name: "Umbrella", color: "#6ec1ff" }, { glyph: "❄", name: "Snowflake", color: "#bfe6ff" },
  { glyph: "☺", name: "Smile", color: "#ffd54a" }, { glyph: "♪", name: "Note", color: "#c9a7ff" }, { glyph: "♫", name: "Notes", color: "#c9a7ff" },
  { glyph: "⚡", name: "Lightning", color: "#ffe14a" }, { glyph: "✿", name: "Flower", color: "#ff8fc7" }, { glyph: "✈", name: "Plane", color: "#ffffff" },
  { glyph: "⚑", name: "Flag", color: "#ff5a5a" }, { glyph: "✂", name: "Scissors", color: "#ffffff" }, { glyph: "✉", name: "Letter", color: "#ffffff" },
  { glyph: "☎", name: "Phone", color: "#5dde8a" }, { glyph: "♛", name: "Crown", color: "#ffd54a" }, { glyph: "✦", name: "Sparkle", color: "#ffe9a0" },
  { glyph: "☕", name: "Coffee", color: "#e0b48a" }, { glyph: "✪", name: "Badge", color: "#ffd54a" }, { glyph: "♞", name: "Knight", color: "#ffffff" },
];

/** What the editor adds for a sticker: big, unboxed, and easing in so it does not just pop onto the picture. */
export function stickerLayer(s: Sticker): Partial<Omit<TextLayer, "id">> {
  return { text: s.glyph, size: 0.22, color: s.color, bold: false, box: false, animIn: "rise", animSeconds: 0.4, duration: 3 };
}

/** Emoji shown in the Stickers tab. They are drawn with the device's own colour emoji font, then added as pictures. */
export type EmojiGroup = { id: string; label: string; items: readonly string[] };
const set = (s: string): string[] => Array.from(new Intl.Segmenter("en", { granularity: "grapheme" }).segment(s), (x) => x.segment);
export const EMOJI_GROUPS: readonly EmojiGroup[] = [
  { id: "faces", label: "Faces", items: set("😀😂🤣😊😍🥰😘😎🤩🥳😜🤪🤔😏😴😭😢😡🤯😱🥺🙄😇🤗🤫") },
  { id: "love", label: "Hearts", items: set("❤️🧡💛💚💙💜🖤🤍💖💗💘💕💞💔❣️✨") },
  { id: "hands", label: "Hands", items: set("👍👎👏🙌👌✌️🤞🤟🤘👋🙏💪🫶☝️👉👈") },
  { id: "party", label: "Party", items: set("🎉🎊🎈🎁🏆🥇🎂🍾🥂🎶🎤🎬📸🔥💯⭐🌟") },
  { id: "nature", label: "Nature", items: set("🌈☀️🌙⚡❄️🌸🌹🌴🌊🐶🐱🦋🦄🐼🐯🍀") },
  { id: "food", label: "Food", items: set("🍕🍔🍟🌮🍣🍩🍦🍓🍉🍎☕🍺🍿🍫🥑🍜") },
  { id: "things", label: "Things", items: set("📱💻🎮🚗✈️🏠💰💎👑🎧📣🔔💡🚀⚽🏀") },
];

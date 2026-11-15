/**
 * Coloured sticker art. Every design here is original vector art drawn for Fresh Studio as SVG text, then turned into a
 * transparent PNG in the browser (stickerRaster.ts) and added to the video as a picture overlay, so the export draws
 * exactly the same pixels the preview shows. Stickers are named for what they do, and none copies a brand's logo.
 * Pure string builders: no DOM, so they are testable under Node.
 */

export type StickerGroup = "reactions" | "callouts" | "badges" | "social";
export type StickerArt = {
  id: string;
  name: string;
  group: StickerGroup;
  /** Pill-shaped stickers carry words the person can change. */
  text?: { label: string; fallback: string; max: number };
  build: (text?: string) => string;
};

export const STICKER_GROUPS: readonly { id: StickerGroup; label: string; hint: string }[] = [
  { id: "reactions", label: "Reactions", hint: "Faces and hearts for a quick reaction" },
  { id: "callouts", label: "Callouts", hint: "Arrows, bursts and labels that point at things" },
  { id: "badges", label: "Badges", hint: "Awards, tags and ribbons" },
  { id: "social", label: "Social", hint: "Subscribe, follow, mention and share chips" },
];

export function escapeXml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[c] as string);
}
/** Keeps pill text short, single-line and free of control characters. */
export function cleanLabel(raw: string | undefined, fallback: string, max: number): string {
  const t = (raw ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
  return t || fallback;
}

const FONT = `font-family="Arial, Helvetica, sans-serif" font-weight="800"`;
const svg = (w: number, h: number, body: string, defs = "") => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><defs>${defs}</defs>${body}</svg>`;
const grad = (id: string, a: string, b: string, vertical = true) => `<linearGradient id="${id}" x1="0" y1="0" x2="${vertical ? 0 : 1}" y2="${vertical ? 1 : 1}"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient>`;
const shadow = `<filter id="sh" x="-20%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="5" stdDeviation="5" flood-color="#000" flood-opacity=".35"/></filter>`;

/** A round face on a yellow disc; `features` draws the eyes and mouth. */
const face = (features: string, extra = "") => svg(256, 256,
  `<g filter="url(#sh)"><circle cx="128" cy="128" r="112" fill="url(#f)" stroke="#c98a00" stroke-width="4"/>${features}${extra}</g>`,
  grad("f", "#ffe66b", "#ffb300") + shadow);
const eye = (x: number, y = 104) => `<ellipse cx="${x}" cy="${y}" rx="13" ry="18" fill="#4a2c00"/><circle cx="${x + 4}" cy="${y - 6}" r="4.5" fill="#fff"/>`;

const heartPath = "M128 222 C40 150 24 100 24 72 C24 42 48 24 76 24 C98 24 118 36 128 56 C138 36 158 24 180 24 C208 24 232 42 232 72 C232 100 216 150 128 222 Z";

/** A pill with an icon on the left and editable words; width follows the text length. */
function pill(text: string, fill: string, ink: string, icon: string, edge = "none"): string {
  const t = escapeXml(text), len = Math.min(34 * text.length, 34 * 24), w = 150 + len, tx = 110;
  return svg(w, 112,
    `<g filter="url(#sh)"><rect x="8" y="6" width="${w - 16}" height="92" rx="46" fill="${fill}" stroke="${edge}" stroke-width="4"/>${icon}` +
    `<text x="${tx}" y="73" ${FONT} font-size="54" fill="${ink}" textLength="${len}" lengthAdjust="spacingAndGlyphs">${t}</text></g>`, shadow);
}
const playIcon = `<circle cx="58" cy="52" r="26" fill="#fff"/><path d="M50 38 L50 66 L74 52 Z" fill="#e60000"/>`;
const dotIcon = (c: string) => `<circle cx="58" cy="52" r="20" fill="${c}"/>`;
const heartIcon = `<path transform="translate(34 28) scale(.19)" d="${heartPath}" fill="#fff"/>`;
const atIcon = `<circle cx="58" cy="52" r="26" fill="#fff"/><text x="58" y="68" text-anchor="middle" ${FONT} font-size="44" fill="#b020a0">@</text>`;
const planeIcon = `<circle cx="58" cy="52" r="26" fill="#fff"/><path d="M42 54 L76 38 L66 70 L56 60 L50 66 L50 56 Z" fill="#229ed9"/>`;
const bellIcon = `<circle cx="58" cy="52" r="26" fill="#fff"/><path d="M58 32 C48 32 44 42 44 50 L44 58 L40 64 L76 64 L72 58 L72 50 C72 42 68 32 58 32 Z" fill="#f5a300"/><circle cx="58" cy="70" r="5" fill="#f5a300"/>`;
const hashIcon = `<circle cx="58" cy="52" r="26" fill="#fff"/><text x="58" y="68" text-anchor="middle" ${FONT} font-size="44" fill="#0aa">#</text>`;

const burst = (text: string, fill: string, ink: string) => {
  const pts: string[] = [];
  for (let i = 0; i < 24; i++) { const a = (i / 24) * Math.PI * 2, r = i % 2 ? 100 : 124; pts.push(`${(128 + Math.cos(a) * r).toFixed(1)},${(128 + Math.sin(a) * r).toFixed(1)}`); }
  const t = escapeXml(text), len = Math.min(26 * text.length, 170);
  return svg(256, 256, `<g filter="url(#sh)"><polygon points="${pts.join(" ")}" fill="${fill}" stroke="#fff" stroke-width="6" stroke-linejoin="round"/>` +
    `<text x="128" y="150" text-anchor="middle" ${FONT} font-size="64" fill="${ink}" textLength="${len}" lengthAdjust="spacingAndGlyphs">${t}</text></g>`, shadow);
};
const bubble = (text: string, fill: string, ink: string) => {
  const t = escapeXml(text), len = Math.min(30 * text.length, 30 * 24), w = 90 + len;
  return svg(w, 150, `<g filter="url(#sh)"><path d="M40 8 H${w - 40} Q${w - 8} 8 ${w - 8} 40 V80 Q${w - 8} 112 ${w - 40} 112 H90 L50 142 L58 112 H40 Q8 112 8 80 V40 Q8 8 40 8 Z" fill="${fill}" stroke="#fff" stroke-width="5" stroke-linejoin="round"/>` +
    `<text x="${w / 2}" y="82" text-anchor="middle" ${FONT} font-size="58" fill="${ink}" textLength="${len}" lengthAdjust="spacingAndGlyphs">${t}</text></g>`, shadow);
};
const tag = (text: string, fill: string, ink: string) => {
  const t = escapeXml(text), len = Math.min(30 * text.length, 30 * 24), w = 130 + len;
  return svg(w, 112, `<g filter="url(#sh)"><path d="M8 56 L44 8 H${w - 12} V104 H44 Z" fill="${fill}" stroke="#fff" stroke-width="4" stroke-linejoin="round"/><circle cx="46" cy="56" r="10" fill="#fff"/>` +
    `<text x="${70 + len / 2}" y="76" text-anchor="middle" ${FONT} font-size="56" fill="${ink}" textLength="${len}" lengthAdjust="spacingAndGlyphs">${t}</text></g>`, shadow);
};
const star = (cx: number, cy: number, ro: number, ri: number, n = 5) => Array.from({ length: n * 2 }, (_, i) => { const a = -Math.PI / 2 + (i / (n * 2)) * Math.PI * 2, r = i % 2 ? ri : ro; return `${(cx + Math.cos(a) * r).toFixed(1)},${(cy + Math.sin(a) * r).toFixed(1)}`; }).join(" ");

export const STICKER_ART: readonly StickerArt[] = [
  // ----- reactions -----
  { id: "love", name: "Love", group: "reactions", build: () => svg(256, 256, `<g filter="url(#sh)"><path d="${heartPath}" fill="url(#h)" stroke="#a3001f" stroke-width="5" stroke-linejoin="round"/><path d="M66 70 C58 76 54 86 56 98" stroke="#fff" stroke-opacity=".7" stroke-width="10" stroke-linecap="round" fill="none"/></g>`, grad("h", "#ff6b81", "#e0123a") + shadow) },
  { id: "fire", name: "Fire", group: "reactions", build: () => svg(256, 256, `<g filter="url(#sh)"><path d="M128 14 C140 60 206 80 206 156 C206 206 172 242 128 242 C84 242 50 206 50 156 C50 120 72 104 80 78 C96 96 100 112 108 118 C106 78 112 44 128 14 Z" fill="url(#fi)" stroke="#b33a00" stroke-width="5" stroke-linejoin="round"/><path d="M128 242 C100 242 86 220 88 198 C90 172 112 160 118 138 C140 160 168 172 168 202 C168 226 150 242 128 242 Z" fill="#ffe36b"/></g>`, grad("fi", "#ff9a1f", "#e32b00") + shadow) },
  { id: "laugh", name: "Laughing", group: "reactions", build: () => face(`<path d="M62 100 Q82 80 102 100" stroke="#4a2c00" stroke-width="10" fill="none" stroke-linecap="round"/><path d="M154 100 Q174 80 194 100" stroke="#4a2c00" stroke-width="10" fill="none" stroke-linecap="round"/><path d="M60 140 Q128 230 196 140 Z" fill="#6b1500" stroke="#4a2c00" stroke-width="6" stroke-linejoin="round"/><path d="M84 168 Q128 214 172 168 Q128 184 84 168 Z" fill="#ff7a8a"/>`, `<path d="M40 112 Q30 150 52 150 Q64 150 56 120 Z" fill="#6ec1ff"/><path d="M216 112 Q226 150 204 150 Q192 150 200 120 Z" fill="#6ec1ff"/>`) },
  { id: "wow", name: "Wow", group: "reactions", build: () => face(`${eye(88, 100)}${eye(168, 100)}<path d="M62 70 Q88 52 112 66" stroke="#4a2c00" stroke-width="8" fill="none" stroke-linecap="round"/><path d="M144 66 Q168 52 194 70" stroke="#4a2c00" stroke-width="8" fill="none" stroke-linecap="round"/><ellipse cx="128" cy="180" rx="26" ry="34" fill="#6b1500" stroke="#4a2c00" stroke-width="6"/>`) },
  { id: "heart-eyes", name: "Heart eyes", group: "reactions", build: () => face(`<path transform="translate(54 76) scale(.2)" d="${heartPath}" fill="#e0123a"/><path transform="translate(150 76) scale(.2)" d="${heartPath}" fill="#e0123a"/><path d="M76 156 Q128 214 180 156 Q128 176 76 156 Z" fill="#6b1500" stroke="#4a2c00" stroke-width="6" stroke-linejoin="round"/>`) },
  { id: "cry", name: "Crying", group: "reactions", build: () => face(`${eye(88)}${eye(168)}<path d="M84 190 Q128 154 172 190" stroke="#4a2c00" stroke-width="10" fill="none" stroke-linecap="round"/><path d="M62 70 Q86 80 108 72" stroke="#4a2c00" stroke-width="8" fill="none" stroke-linecap="round"/><path d="M148 72 Q170 80 194 70" stroke="#4a2c00" stroke-width="8" fill="none" stroke-linecap="round"/>`, `<path d="M80 128 Q64 176 84 176 Q100 176 90 128 Z" fill="#4db3ff"/><path d="M176 128 Q160 176 180 176 Q196 176 186 128 Z" fill="#4db3ff"/>`) },
  { id: "angry", name: "Angry", group: "reactions", build: () => svg(256, 256, `<g filter="url(#sh)"><circle cx="128" cy="128" r="112" fill="url(#an)" stroke="#8a1200" stroke-width="4"/><ellipse cx="90" cy="116" rx="12" ry="14" fill="#2b0a00"/><ellipse cx="166" cy="116" rx="12" ry="14" fill="#2b0a00"/><path d="M58 88 L112 108" stroke="#2b0a00" stroke-width="12" stroke-linecap="round"/><path d="M198 88 L144 108" stroke="#2b0a00" stroke-width="12" stroke-linecap="round"/><path d="M84 186 Q128 150 172 186" stroke="#2b0a00" stroke-width="11" fill="none" stroke-linecap="round"/></g>`, grad("an", "#ff9966", "#e0301e") + shadow) },
  { id: "like", name: "Thumbs up", group: "reactions", build: () => svg(256, 256, `<g filter="url(#sh)"><path d="M28 112 H76 V220 H28 Z" fill="#2a6df4" stroke="#123c99" stroke-width="5" stroke-linejoin="round"/><path d="M84 112 C108 90 120 60 122 34 C122 20 144 18 150 36 C158 62 148 88 140 104 H212 C232 104 240 126 230 142 C238 156 232 172 220 178 C226 192 218 206 206 208 C208 222 198 232 184 232 H84 Z" fill="#4d8bff" stroke="#123c99" stroke-width="5" stroke-linejoin="round"/></g>`, shadow) },
  { id: "clap", name: "Party", group: "reactions", build: () => svg(256, 256, `<g filter="url(#sh)"><path d="M30 228 L96 80 L176 160 Z" fill="url(#pp)" stroke="#a35b00" stroke-width="5" stroke-linejoin="round"/><path d="M62 156 L108 190" stroke="#fff" stroke-opacity=".6" stroke-width="8"/></g><circle cx="150" cy="60" r="9" fill="#ff4d6d"/><circle cx="196" cy="96" r="8" fill="#4dd2ff"/><circle cx="214" cy="52" r="7" fill="#7be07b"/><rect x="120" y="22" width="14" height="14" fill="#b36bff" transform="rotate(25 127 29)"/><rect x="186" y="150" width="14" height="14" fill="#ffd54a" transform="rotate(-20 193 157)"/><path d="M160 112 Q190 70 226 100" stroke="#ff4d6d" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M130 52 Q120 20 160 14" stroke="#4dd2ff" stroke-width="6" fill="none" stroke-linecap="round"/>`, grad("pp", "#ffd54a", "#ff9a1f") + shadow) },
  // ----- callouts -----
  { id: "arrow", name: "Arrow", group: "callouts", build: () => svg(256, 256, `<g filter="url(#sh)"><path d="M20 98 H132 V48 L236 128 L132 208 V158 H20 Z" fill="url(#ar)" stroke="#fff" stroke-width="6" stroke-linejoin="round"/></g>`, grad("ar", "#ffe14a", "#ff9a00") + shadow) },
  { id: "ring", name: "Circle it", group: "callouts", build: () => svg(256, 256, `<g filter="url(#sh)"><path d="M128 28 C196 24 238 70 232 130 C226 192 170 232 112 226 C56 220 18 174 28 116 C36 66 84 34 140 36" fill="none" stroke="#ff2d55" stroke-width="16" stroke-linecap="round"/></g>`, shadow) },
  { id: "burst-wow", name: "Wow burst", group: "callouts", text: { label: "Burst words", fallback: "WOW", max: 6 }, build: (t) => burst(cleanLabel(t, "WOW", 6), "#ff3b6b", "#fff") },
  { id: "burst-new", name: "New burst", group: "callouts", text: { label: "Burst words", fallback: "NEW", max: 6 }, build: (t) => burst(cleanLabel(t, "NEW", 6), "#ffd21f", "#c4002f") },
  { id: "bubble-lol", name: "Speech bubble", group: "callouts", text: { label: "Bubble words", fallback: "LOL", max: 14 }, build: (t) => bubble(cleanLabel(t, "LOL", 14), "#7a4dff", "#fff") },
  { id: "bubble-ask", name: "Question bubble", group: "callouts", text: { label: "Bubble words", fallback: "Why?", max: 14 }, build: (t) => bubble(cleanLabel(t, "Why?", 14), "#ffffff", "#2b2b2b") },
  { id: "pin", name: "Location pin", group: "callouts", build: () => svg(256, 256, `<g filter="url(#sh)"><path d="M128 238 C70 170 44 136 44 100 C44 56 82 22 128 22 C174 22 212 56 212 100 C212 136 186 170 128 238 Z" fill="url(#pn)" stroke="#8a0a24" stroke-width="5" stroke-linejoin="round"/><circle cx="128" cy="98" r="32" fill="#fff"/></g>`, grad("pn", "#ff5a6e", "#d4002a") + shadow) },
  { id: "live", name: "Live", group: "callouts", text: { label: "Label", fallback: "LIVE", max: 12 }, build: (t) => pill(cleanLabel(t, "LIVE", 12), "#e60023", "#fff", dotIcon("#fff")) },
  // ----- badges -----
  { id: "star-badge", name: "Gold star", group: "badges", build: () => svg(256, 256, `<g filter="url(#sh)"><polygon points="${star(128, 132, 116, 52)}" fill="url(#gs)" stroke="#b36b00" stroke-width="6" stroke-linejoin="round"/><polygon points="${star(128, 132, 70, 30)}" fill="#fff3b0" fill-opacity=".7"/></g>`, grad("gs", "#ffe66b", "#ffb300") + shadow) },
  { id: "verified", name: "Check badge", group: "badges", build: () => svg(256, 256, `<g filter="url(#sh)"><polygon points="${star(128, 128, 116, 96, 12)}" fill="url(#vb)" stroke="#fff" stroke-width="5" stroke-linejoin="round"/><path d="M78 130 L114 166 L180 92" fill="none" stroke="#fff" stroke-width="22" stroke-linecap="round" stroke-linejoin="round"/></g>`, grad("vb", "#4da3ff", "#1553d6") + shadow) },
  { id: "crown", name: "Crown", group: "badges", build: () => svg(256, 256, `<g filter="url(#sh)"><path d="M28 208 L18 80 L82 132 L128 40 L174 132 L238 80 L228 208 Z" fill="url(#cr)" stroke="#a35b00" stroke-width="6" stroke-linejoin="round"/><rect x="28" y="196" width="200" height="26" rx="8" fill="#ffb300" stroke="#a35b00" stroke-width="5"/><circle cx="128" cy="150" r="14" fill="#e0123a"/><circle cx="76" cy="168" r="9" fill="#2a6df4"/><circle cx="180" cy="168" r="9" fill="#2a6df4"/></g>`, grad("cr", "#ffe66b", "#ffb300") + shadow) },
  { id: "trophy", name: "Trophy", group: "badges", build: () => svg(256, 256, `<g filter="url(#sh)"><path d="M70 28 H186 V102 Q186 166 128 170 Q70 166 70 102 Z" fill="url(#tr)" stroke="#a35b00" stroke-width="6" stroke-linejoin="round"/><path d="M70 48 H34 Q30 108 78 120" fill="none" stroke="#a35b00" stroke-width="12" stroke-linecap="round"/><path d="M186 48 H222 Q226 108 178 120" fill="none" stroke="#a35b00" stroke-width="12" stroke-linecap="round"/><rect x="112" y="168" width="32" height="34" fill="#e09a00" stroke="#a35b00" stroke-width="5"/><rect x="76" y="200" width="104" height="32" rx="8" fill="#b36b00" stroke="#7a4400" stroke-width="5"/></g>`, grad("tr", "#ffe66b", "#ffb300") + shadow) },
  { id: "hot", name: "Hot tag", group: "badges", text: { label: "Tag words", fallback: "HOT", max: 10 }, build: (t) => tag(cleanLabel(t, "HOT", 10), "#ff3b30", "#fff") },
  { id: "sale", name: "Sale tag", group: "badges", text: { label: "Tag words", fallback: "SALE", max: 10 }, build: (t) => tag(cleanLabel(t, "SALE", 10), "#ffd21f", "#c4002f") },
  { id: "ribbon", name: "Ribbon", group: "badges", text: { label: "Ribbon words", fallback: "No. 1", max: 12 }, build: (t) => { const s = escapeXml(cleanLabel(t, "No. 1", 12)), len = Math.min(30 * s.length, 360), w = 120 + len; return svg(w, 120, `<g filter="url(#sh)"><path d="M8 28 H${w - 8} L${w - 36} 62 L${w - 8} 96 H8 L36 62 Z" fill="url(#rb)" stroke="#fff" stroke-width="4" stroke-linejoin="round"/><text x="${w / 2}" y="76" text-anchor="middle" ${FONT} font-size="52" fill="#fff" textLength="${len}" lengthAdjust="spacingAndGlyphs">${s}</text></g>`, grad("rb", "#8a5cff", "#4d2bd6") + shadow); } },
  // ----- social -----
  { id: "subscribe", name: "Subscribe", group: "social", text: { label: "Button words", fallback: "SUBSCRIBE", max: 14 }, build: (t) => pill(cleanLabel(t, "SUBSCRIBE", 14), "#e60000", "#fff", playIcon) },
  { id: "bell", name: "Bell button", group: "social", text: { label: "Button words", fallback: "TURN ON", max: 14 }, build: (t) => pill(cleanLabel(t, "TURN ON", 14), "#272727", "#fff", bellIcon) },
  { id: "follow", name: "Follow", group: "social", text: { label: "Button words", fallback: "FOLLOW", max: 14 }, build: (t) => pill(cleanLabel(t, "FOLLOW", 14), "#2a6df4", "#fff", heartIcon) },
  { id: "mention", name: "Mention", group: "social", text: { label: "Name", fallback: "yourname", max: 16 }, build: (t) => pill(cleanLabel(t, "yourname", 16), "#d62976", "#fff", atIcon) },
  { id: "send", name: "Share", group: "social", text: { label: "Button words", fallback: "SEND", max: 14 }, build: (t) => pill(cleanLabel(t, "SEND", 14), "#229ed9", "#fff", planeIcon) },
  { id: "hashtag", name: "Hashtag", group: "social", text: { label: "Tag", fallback: "trending", max: 16 }, build: (t) => pill(cleanLabel(t, "trending", 16), "#00a8a8", "#fff", hashIcon) },
  { id: "story-ring", name: "Story ring", group: "social", build: () => svg(256, 256, `<g filter="url(#sh)"><circle cx="128" cy="128" r="104" fill="none" stroke="url(#sr)" stroke-width="20"/><circle cx="128" cy="128" r="84" fill="none" stroke="#fff" stroke-width="8"/></g>`, `<linearGradient id="sr" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#ffd21f"/><stop offset=".45" stop-color="#ff3b6b"/><stop offset="1" stop-color="#8a3ffc"/></linearGradient>` + shadow) },
  { id: "glitch", name: "Glitch title", group: "social", text: { label: "Title words", fallback: "Watch this", max: 16 }, build: (t) => { const s = escapeXml(cleanLabel(t, "Watch this", 16)), len = Math.min(34 * s.length, 34 * 24), w = 80 + len; const tx = (dx: number, c: string) => `<text x="${40 + dx}" y="${88 + (dx ? dx / 2 : 0)}" ${FONT} font-size="68" fill="${c}" textLength="${len}" lengthAdjust="spacingAndGlyphs">${s}</text>`; return svg(w, 130, `${tx(-5, "#25f4ee")}${tx(5, "#fe2c55")}${tx(0, "#ffffff")}`); } },
  { id: "counter", name: "Like counter", group: "social", text: { label: "Count", fallback: "12.4K", max: 8 }, build: (t) => pill(cleanLabel(t, "12.4K", 8), "#ffffff", "#262626", `<path transform="translate(34 28) scale(.19)" d="${heartPath}" fill="#ff2d55"/>`, "#e6e6e6") },
];

export const stickerArtById = (id: string): StickerArt | undefined => STICKER_ART.find((s) => s.id === id);

/** Turns sticker art and emoji into transparent PNG files in the browser, so they can be added as picture overlays. */
import { escapeXml } from "./stickerArt.ts";

const canvasToPng = (canvas: HTMLCanvasElement): Promise<Blob> =>
  new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("This browser could not make the sticker picture."))), "image/png"));

/** Draws an SVG string at `scale` times its own size. */
export async function svgToPng(svg: string, scale = 2): Promise<{ blob: Blob; width: number; height: number }> {
  const m = svg.match(/width="(\d+)" height="(\d+)"/);
  if (!m) throw new Error("Sticker art has no size.");
  const w = Number(m[1]) * scale, h = Number(m[2]) * scale;
  const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("This browser could not draw that sticker."));
      el.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("This browser cannot draw pictures.");
    ctx.drawImage(img, 0, 0, w, h);
    return { blob: await canvasToPng(canvas), width: w, height: h };
  } finally { URL.revokeObjectURL(url); }
}

/** Draws one emoji with the device's colour emoji font. */
export async function emojiToPng(emoji: string, size = 256): Promise<{ blob: Blob; width: number; height: number }> {
  const canvas = document.createElement("canvas");
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("This browser cannot draw pictures.");
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.font = `${Math.round(size * 0.78)}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji","Twemoji Mozilla",sans-serif`;
  ctx.fillText(emoji, size / 2, size / 2 + size * 0.04);
  return { blob: await canvasToPng(canvas), width: size, height: size };
}

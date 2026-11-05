export type CaptionSegment = { text: string; tag?: string };

const HASHTAG = /#[\p{L}\p{N}_]+/gu;

/** Splits a caption into plain text and hashtag segments so hashtags can be tappable. */
export function splitCaption(caption: string): CaptionSegment[] {
  const segments: CaptionSegment[] = [];
  let last = 0;
  for (const match of caption.matchAll(HASHTAG)) {
    const index = match.index ?? 0;
    if (index > last) segments.push({ text: caption.slice(last, index) });
    segments.push({ text: match[0], tag: match[0].slice(1) });
    last = index + match[0].length;
  }
  if (last < caption.length) segments.push({ text: caption.slice(last) });
  return segments;
}

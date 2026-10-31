import type { SVGProps } from "react";

/** Line icons for the Fresh Shorts rail, matching the design (stroke icons, no emoji). */
const base: SVGProps<SVGSVGElement> = {
  width: 28, height: 28, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor",
  strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true, focusable: false,
};

export const CommentIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}><path d="M21 11.5a8.5 8.5 0 0 1-12.4 7.55L3 20.5l1.5-4.9A8.5 8.5 0 1 1 21 11.5Z" /><path d="M8 11.5h.01M12 11.5h.01M16 11.5h.01" strokeWidth="2.4" /></svg>
);
export const BookmarkIcon = ({ filled, ...p }: SVGProps<SVGSVGElement> & { filled?: boolean }) => (
  <svg {...base} {...p} fill={filled ? "currentColor" : "none"}><path d="M6 3.5h12a1 1 0 0 1 1 1V21l-7-4.5L5 21V4.5a1 1 0 0 1 1-1Z" /></svg>
);
export const ShareIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}><path d="M14 4l7 7-7 7v-4.2C8.5 13.8 5 15.5 3 19c.6-5.6 3.8-9.2 11-9.8V4Z" /></svg>
);
export const GiftIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}><rect x="3.5" y="8.5" width="17" height="4" rx="1" /><path d="M5 12.5V20h14v-7.5M12 8.5V20" /><path d="M12 8.5C10 8.5 7.5 8 7.5 6a2 2 0 0 1 3.6-1.2L12 6l.9-1.2A2 2 0 0 1 16.5 6c0 2-2.5 2.5-4.5 2.5Z" /></svg>
);
export const MoreIcon = (p: SVGProps<SVGSVGElement>) => (
  <svg {...base} {...p}><circle cx="5.5" cy="12" r="1.3" fill="currentColor" /><circle cx="12" cy="12" r="1.3" fill="currentColor" /><circle cx="18.5" cy="12" r="1.3" fill="currentColor" /></svg>
);

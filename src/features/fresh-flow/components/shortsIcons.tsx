import type { ReactNode } from "react";
import "./shortsIcons.css";

/**
 * Fresh Shorts icon set. Replaces the emoji and text glyphs that were used for tabs, the action rail,
 * the action menu and the Fresh Flow bottom navigation, so every control draws with the same stroke,
 * scales crisply on low-resolution Android screens, and follows the current text colour.
 *
 * Style matches src/components/Icons.tsx: 24px grid, round caps and joins, 1.75 stroke.
 */
export type ShortsIconProps = { size?: number; className?: string; filled?: boolean; strokeWidth?: number };

const svg = ({ size = 24, className, strokeWidth = 1.75 }: ShortsIconProps, children: ReactNode) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
    focusable="false"
  >
    {children}
  </svg>
);

const fill = (p: ShortsIconProps) => (p.filled ? "currentColor" : "none");

// --- Discovery tabs ---------------------------------------------------------------------------
export const ForYouIcon = (p: ShortsIconProps) => svg(p, <path d="m12 3 2.4 5.6L20 9.3l-4.2 3.8 1.3 5.9L12 16l-5.1 3 1.3-5.9L4 9.3l5.6-.7L12 3Z" fill={fill(p)} />);
export const FollowingIcon = (p: ShortsIconProps) => svg(p, <><circle cx="9" cy="8" r="3.2" /><path d="M3 20a6 6 0 0 1 12 0" /><path d="M17 8.5a2.7 2.7 0 0 1 0 5M18.5 15.2A5.2 5.2 0 0 1 21.5 20" /></>);
export const TrendingIcon = (p: ShortsIconProps) => svg(p, <><path d="m3 17 6-6 4 4 7-8" /><path d="M15 7h5v5" /></>);
export const PicksIcon = (p: ShortsIconProps) => svg(p, <><path d="m12 3 1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8L12 3Z" /><path d="m18.5 15 .8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8.8-2.2Z" /></>);
export const LearnTabIcon = (p: ShortsIconProps) => svg(p, <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H12v16H6.5A2.5 2.5 0 0 0 4 21.5v-16Z" /><path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H12v16h5.5a2.5 2.5 0 0 1 2.5 2.5v-16Z" /></>);
export const RelaxIcon = (p: ShortsIconProps) => svg(p, <><path d="M3 9c2-2 4-2 6 0s4 2 6 0 4-2 6 0" /><path d="M3 14c2-2 4-2 6 0s4 2 6 0 4-2 6 0" /><path d="M3 19c2-2 4-2 6 0s4 2 6 0 4-2 6 0" /></>);

// --- Action rail ------------------------------------------------------------------------------
export const RailCommentIcon = (p: ShortsIconProps) => svg(p, <path d="M20 12a8 8 0 0 1-11.6 7.1L4 20l1-4A8 8 0 1 1 20 12Z" />);
export const RailRepostIcon = (p: ShortsIconProps) => svg(p, <><path d="m17 3 4 4-4 4" /><path d="M3 11V9a2 2 0 0 1 2-2h16" /><path d="m7 21-4-4 4-4" /><path d="M21 13v2a2 2 0 0 1-2 2H3" /></>);
export const RailSaveIcon = (p: ShortsIconProps) => svg(p, <path d="M6 3.5h12a1 1 0 0 1 1 1V21l-7-4.5L5 21V4.5a1 1 0 0 1 1-1Z" fill={fill(p)} />);
export const RailShareIcon = (p: ShortsIconProps) => svg(p, <><path d="M14 4l7 6.5-7 6.5v-4c-5 0-8 1.5-10 5 .5-6 4-10 10-10.5V4Z" /></>);
export const RailMoreIcon = (p: ShortsIconProps) => svg(p, <><circle cx="5" cy="12" r="1.4" fill="currentColor" /><circle cx="12" cy="12" r="1.4" fill="currentColor" /><circle cx="19" cy="12" r="1.4" fill="currentColor" /></>);

// --- Action menu ------------------------------------------------------------------------------
export const GiftIcon = (p: ShortsIconProps) => svg(p, <><rect x="3" y="8" width="18" height="4" rx="1" /><path d="M5 12v8h14v-8M12 8v12" /><path d="M12 8c-1.5-4-5.5-4-5.5-1.5S10 8 12 8Zm0 0c1.5-4 5.5-4 5.5-1.5S14 8 12 8Z" /></>);
export const AskAIIcon = PicksIcon;
export const VolumeOnIcon = (p: ShortsIconProps) => svg(p, <><path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5H4Z" /><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a8 8 0 0 1 0 11" /></>);
export const VolumeOffIcon = (p: ShortsIconProps) => svg(p, <><path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5H4Z" /><path d="m16 9.5 5 5M21 9.5l-5 5" /></>);
export const SpeedIcon = (p: ShortsIconProps) => svg(p, <><path d="M4 18a8 8 0 1 1 16 0" /><path d="m12 18 4-6" /><circle cx="12" cy="18" r="1" fill="currentColor" /></>);
export const QuoteIcon = (p: ShortsIconProps) => svg(p, <><path d="M5 17v-4a5 5 0 0 1 5-5" /><path d="M5 13h4v4H5zM14 17v-4a5 5 0 0 1 5-5" /><path d="M14 13h4v4h-4z" /></>);
export const RemixIcon = (p: ShortsIconProps) => svg(p, <><path d="M3 7h4l10 10h4" /><path d="M3 17h4l3-3M14 10l3-3h4" /><path d="m19 5 2 2-2 2M19 15l2 2-2 2" /></>);
export const DuetIcon = (p: ShortsIconProps) => svg(p, <><rect x="3" y="5" width="8" height="14" rx="2" /><rect x="13" y="5" width="8" height="14" rx="2" /></>);
export const CollabIcon = (p: ShortsIconProps) => svg(p, <><circle cx="8.5" cy="9" r="3" /><circle cx="15.5" cy="9" r="3" /><path d="M3 20a5.5 5.5 0 0 1 11-1M13 19a5.5 5.5 0 0 1 8 .5" /></>);
export const EditToolsIcon = (p: ShortsIconProps) => svg(p, <><circle cx="6" cy="7" r="2.5" /><circle cx="6" cy="17" r="2.5" /><path d="m8 8.5 12 8M8 15.5l12-8" /></>);
export const CaptionsIcon = (p: ShortsIconProps) => svg(p, <><rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="M10 10.2a2.2 2.2 0 1 0 0 3.6M17 10.2a2.2 2.2 0 1 0 0 3.6" /></>);
export const EffectsIcon = (p: ShortsIconProps) => svg(p, <><path d="m12 3 1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3Z" /><path d="m18 14 .8 2.2L21 17l-2.2.8L18 20l-.8-2.2L15 17l2.2-.8L18 14Z" /></>);
export const MoreLikeIcon = (p: ShortsIconProps) => svg(p, <><circle cx="12" cy="12" r="9" /><path d="M12 8v8M8 12h8" /></>);
export const LessLikeIcon = (p: ShortsIconProps) => svg(p, <><circle cx="12" cy="12" r="9" /><path d="M8 12h8" /></>);
export const HideTopicIcon = (p: ShortsIconProps) => svg(p, <><path d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6Z" /><circle cx="12" cy="12" r="2.6" /><path d="m4 4 16 16" /></>);
export const ManageIcon = (p: ShortsIconProps) => svg(p, <><path d="M4 7h10M18 7h2M4 17h2M10 17h10" /><circle cx="16" cy="7" r="2" /><circle cx="8" cy="17" r="2" /></>);
export const NotInterestedIcon = (p: ShortsIconProps) => svg(p, <><circle cx="12" cy="12" r="9" /><path d="m5.6 5.6 12.8 12.8" /></>);
export const MuteCreatorIcon = (p: ShortsIconProps) => svg(p, <><path d="M6 17h12l-1.5-2V10a4.5 4.5 0 0 0-9 0v5L6 17Z" /><path d="M10 20a2 2 0 0 0 4 0M4 4l16 16" /></>);

// --- Fresh Flow bottom navigation -------------------------------------------------------------
export const NavHomeIcon = (p: ShortsIconProps) => svg(p, <path d="M4 11 12 4l8 7v8.5a.5.5 0 0 1-.5.5H15v-5.5H9V20H4.5a.5.5 0 0 1-.5-.5V11Z" fill={fill(p)} />);
export const NavShortsIcon = (p: ShortsIconProps) => svg(p, <path d="M13 2 5 13.5h6L10 22l9-12h-6.5L13 2Z" fill={fill(p)} />);
export const NavVideoIcon = (p: ShortsIconProps) => svg(p, <><rect x="3" y="5" width="18" height="14" rx="3" /><path d="m10.5 9.5 4.5 2.5-4.5 2.5v-5Z" fill="currentColor" /></>);
export const NavMessagesIcon = (p: ShortsIconProps) => svg(p, <><path d="M20 12a8 8 0 0 1-11.6 7.1L4 20l1-4A8 8 0 1 1 20 12Z" fill={fill(p)} /></>);
export const NavMailIcon = (p: ShortsIconProps) => svg(p, <><rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="m4 7.5 8 6 8-6" /></>);
export const NavCreateIcon = (p: ShortsIconProps) => svg(p, <path d="M12 5v14M5 12h14" strokeWidth={2.25} />);
export const DataSaverIcon = (p: ShortsIconProps) => svg(p, <><path d="M12 3c4 4.5 6.5 7.6 6.5 10.5A6.5 6.5 0 0 1 5.5 13.5C5.5 10.6 8 7.5 12 3Z" /><path d="m9.5 14 2 2 3-3.5" /></>);
export const InfoIcon = (p: ShortsIconProps) => svg(p, <><circle cx="12" cy="12" r="9" /><path d="M12 11v5.5" /><circle cx="12" cy="7.8" r="0.6" fill="currentColor" /></>);

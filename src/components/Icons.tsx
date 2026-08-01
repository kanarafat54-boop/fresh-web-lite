/**
 * Fresh Web Lite
 * Shared line-icon set — consistent monochrome icons, no external dependency
 */

type IconProps = { size?: number; className?: string };

const base = (size = 22) => ({
  width: size,
  height: size,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
});

export const NotesIcon = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}><path d="M4 4h16v16H4z" opacity="0"/><path d="M6 3h9l5 5v13H6z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h6M9 9h3"/></svg>
);
export const TasksIcon = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}><rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8 12l2.5 2.5L16 9"/></svg>
);
export const CalcIcon = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}><rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 11h1M12 11h1M16 11h1M8 15h1M12 15h1M16 15h1M8 18h1M12 18h1M16 18h1"/></svg>
);
export const LogIcon = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}><path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/></svg>
);
export const HomeIcon = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}><path d="M3 11.5 12 4l9 7.5"/><path d="M5 10v10h14V10"/></svg>
);
export const FilmIcon = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 4v16M17 4v16M3 9h4M17 9h4M3 15h4M17 15h4"/></svg>
);
export const BookmarkIcon = ({ size, className, filled }: IconProps & { filled?: boolean }) => (
  <svg {...base(size)} className={className} fill={filled ? "currentColor" : "none"}><path d="M6 3h12v18l-6-4.5L6 21z"/></svg>
);
export const SettingsIcon = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>
);
export const HeartIcon = ({ size, className, filled }: IconProps & { filled?: boolean }) => (
  <svg {...base(size)} className={className} fill={filled ? "currentColor" : "none"}><path d="M12 21s-7.5-4.6-10-9.3C.5 8.1 2.3 4 6.3 4 8.6 4 10.6 5.3 12 7c1.4-1.7 3.4-3 5.7-3 4 0 5.8 4.1 4.3 7.7C19.5 16.4 12 21 12 21z"/></svg>
);
export const CommentIcon = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}><path d="M21 11.5a8.4 8.4 0 0 1-8.9 8.4 8.9 8.9 0 0 1-3.5-.8L3 21l1.9-5.6A8.4 8.4 0 0 1 21 11.5z"/></svg>
);
export const CameraIcon = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}><path d="M4 8h3l1.5-2h7L17 8h3v11H4z"/><circle cx="12" cy="13.5" r="3.2"/></svg>
);
export const ScissorsIcon = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}><circle cx="6" cy="6" r="2.5"/><circle cx="6" cy="18" r="2.5"/><path d="M8.5 8 20 20M8.5 16 20 4"/></svg>
);
export const CloseIcon = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}><path d="M6 6l12 12M18 6L6 18"/></svg>
);
export const SendIcon = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}><path d="M22 2 11 13M22 2l-7 20-4-9-9-4z"/></svg>
);
export const PlusIcon = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}><path d="M12 5v14M5 12h14"/></svg>
);
export const BackIcon = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}><path d="M15 18l-6-6 6-6"/></svg>
);

export const SearchIcon = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
);
export const BellIcon = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}><path d="M6 9a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6"/><path d="M10 20a2 2 0 0 0 4 0"/></svg>
);
export const ChevronDownIcon = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}><path d="M6 9l6 6 6-6"/></svg>
);

export const reactionEmoji: Record<string, string> = {
  like: "👍",
  love: "❤️",
  laugh: "😂",
  wow: "😮",
  sad: "😢",
  angry: "😡",
};
export const reactionOrder = ["like", "love", "laugh", "wow", "sad", "angry"];

export const ShareIcon = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 10.5l6.8-3.9M8.6 13.5l6.8 3.9"/></svg>
);
export const LinkIcon = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1.5 1.5"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1.5-1.5"/></svg>
);
export const QrIcon = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h3v3h-3zM19 14h2M14 19h2M19 19h2"/></svg>
);
export const CheckIcon = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}><path d="M20 6L9 17l-5-5"/></svg>
);

export const MoreIcon = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className} fill="currentColor" stroke="none"><circle cx="12" cy="5" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="12" cy="19" r="1.8"/></svg>
);
export const FlagIcon = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}><path d="M5 3v18"/><path d="M5 4h12l-3 4 3 4H5"/></svg>
);
export const EyeOffIcon = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}><path d="M3 3l18 18"/><path d="M10.6 10.6a2 2 0 0 0 2.8 2.8"/><path d="M9.3 5.3A10.4 10.4 0 0 1 12 5c5 0 9 4 10.5 7-.6 1.2-1.5 2.5-2.7 3.6M6.6 6.6C4.7 8 3.3 9.8 1.5 12c1.5 3 5.5 7 10.5 7 1 0 2-.1 2.9-.4"/></svg>
);

export const EditIcon = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>
);

export const UserPlusIcon = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}><circle cx="9" cy="8" r="4"/><path d="M2 21v-2a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v2"/><path d="M19 8v6M22 11h-6"/></svg>
);
export const UserCheckIcon = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}><circle cx="9" cy="8" r="4"/><path d="M2 21v-2a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v2"/><path d="M17 11l2 2 4-4"/></svg>
);
export const RepostIcon = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}><path d="M17 2l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 22l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
);
export const BrokenHeartIcon = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}><path d="M12 21s-7.5-4.6-10-9.3C.5 8.1 2.3 4 6.3 4c2 0 3.8 1 5.2 2.4L10 10l3 2-2 3 3 4-2 2z"/></svg>
);
export const ChevronUpIcon = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}><path d="M18 15l-6-6-6 6"/></svg>
);
export const ChevronLeftIcon = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}><path d="M15 18l-6-6 6-6"/></svg>
);

export const XCircleIcon = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}><circle cx="12" cy="12" r="9"/><path d="M9 9l6 6M15 9l-6 6"/></svg>
);

export const ListIcon = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}><path d="M8 6h13M8 12h13M8 18h13"/><path d="M3 6h.01M3 12h.01M3 18h.01"/></svg>
);

export const MicIcon = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0"/><path d="M12 17v4M8 21h8"/></svg>
);
export const VideoCameraIcon = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}><rect x="2" y="6" width="14" height="12" rx="2"/><path d="M16 10l6-4v12l-6-4"/></svg>
);
export const StopIcon = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className} fill="currentColor" stroke="none"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>
);

export const RotateIcon = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}><path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 3v6h-6"/></svg>
);
export const FlipHorizontalIcon = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}><path d="M12 3v18"/><path d="M16 7l4 5-4 5M8 7l-4 5 4 5"/></svg>
);
export const GaugeIcon = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}><circle cx="12" cy="12" r="9"/><path d="M12 12l4-4"/><path d="M12 7v1M17 12h-1M7 12h1"/></svg>
);
export const RewindIcon = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}><path d="M11 19V5l-8 7z"/><path d="M21 19V5l-8 7z"/></svg>
);
export const TypeIcon = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}><path d="M4 7V4h16v3"/><path d="M9 20h6M12 4v16"/></svg>
);

export const FreshIdIcon = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}>
    <circle cx="12" cy="8" r="4"/>
    <path d="M4 21c1.5-4 5-6 8-6s6.5 2 8 6"/>
    <path d="M18 5l2 2 3-3"/>
  </svg>
);

export const AIIcon = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}>
    <circle cx="12" cy="12" r="8"/>
    <path d="M9 10h.01M15 10h.01"/>
    <path d="M8 15c2 2 6 2 8 0"/>
    <path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>
  </svg>
);

export const WalletIcon = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}>
    <path d="M4 7h15a2 2 0 0 1 2 2v10H4z"/>
    <path d="M4 7V5a2 2 0 0 1 2-2h12"/>
    <circle cx="17" cy="14" r="1"/>
  </svg>
);

export const FeedIcon = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}>
    <rect x="4" y="5" width="16" height="14" rx="3"/>
    <path d="M8 9h8M8 13h6"/>
    <circle cx="8" cy="17" r="1"/>
  </svg>
);

export const ProfileIcon = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}>
    <circle cx="12" cy="8" r="4"/>
    <path d="M5 21c1.5-4 4-6 7-6s5.5 2 7 6"/>
  </svg>
);

export const SparkAIIcon = ({ size, className }: IconProps) => (
  <svg {...base(size)} className={className}>
    <path d="M12 2l1.8 6.2L20 10l-6.2 1.8L12 18l-1.8-6.2L4 10l6.2-1.8z"/>
    <path d="M19 17l.8 2.2L22 20l-2.2.8L19 23l-.8-2.2L16 20l2.2-.8z"/>
  </svg>
);


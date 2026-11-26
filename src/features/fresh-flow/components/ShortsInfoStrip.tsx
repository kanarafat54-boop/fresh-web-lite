import type { ReactNode } from "react";
import { ChevronRightIcon, InfoIcon } from "./shortsIcons";
import "./shortsInfoStrip.css";

type Props = {
  /** Used for styling hooks and tests: what the strip is telling the viewer. */
  kind: "context" | "download" | "notice";
  children: ReactNode;
  /** When given, the whole strip is one button with a chevron. Without it the strip is a plain status line. */
  onClick?: () => void;
  /** "overlay" floats inside the player card above the bottom navigation; "inline" flows in a sheet or page. */
  placement?: "overlay" | "inline";
  icon?: ReactNode;
};

/**
 * One slot for short, honest notices about a Short or a screen: Fresh Context ("Learn more about this topic"),
 * "Download is available because this creator enabled it", and plain explanations inside sheets. Keeping them in a
 * single component keeps their look, tap target and screen-reader behavior the same everywhere.
 */
export default function ShortsInfoStrip({ kind, children, onClick, placement = "inline", icon }: Props) {
  const className = `shorts-info-strip${placement === "overlay" ? " fresh-flow-context-strip" : ""}`;
  const body = (
    <>
      {icon ?? <InfoIcon size={18} />}
      <span className="fresh-flow-context-strip-text shorts-info-strip-text">{children}</span>
      {onClick ? <ChevronRightIcon size={18} /> : null}
    </>
  );
  return onClick
    ? <button type="button" className={className} data-kind={kind} onClick={onClick}>{body}</button>
    : <div className={className} data-kind={kind} role="status">{body}</div>;
}

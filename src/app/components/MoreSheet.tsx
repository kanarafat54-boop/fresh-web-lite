import { useEffect, useRef } from "react";
import { ACCOUNT_ITEMS, NAV_GROUPS, isNavItemActive, type NavItem } from "../navigation/navModel";
import { useLayout } from "../contexts/useLayout";
import "./MoreSheet.css";

type MoreSheetProps = { open: boolean; onClose: () => void };

/** Every Fresh workspace, grouped by purpose. Used by the mobile "More" button and the top-bar menu. */
export default function MoreSheet({ open, onClose }: MoreSheetProps) {
  const { activeRoute, setActiveRoute } = useLayout();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const go = (item: NavItem) => {
    setActiveRoute(item.id);
    onClose();
  };

  const renderItem = (item: NavItem) => {
    const active = isNavItemActive(item, activeRoute);
    return (
      <button key={item.id} type="button" className={`fresh-more-item${active ? " active" : ""}`} aria-current={active ? "page" : undefined} onClick={() => go(item)}>
        <i aria-hidden="true">{item.icon}</i>
        <span>
          <b>{item.label}</b>
          <small>{item.hint}</small>
        </span>
      </button>
    );
  };

  return (
    <div className="fresh-more-backdrop" onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="fresh-more-sheet" role="dialog" aria-modal="true" aria-label="All Fresh workspaces">
        <div className="fresh-more-head">
          <strong>All of Fresh</strong>
          <button ref={closeRef} type="button" className="fresh-more-close" onClick={onClose} aria-label="Close menu">✕</button>
        </div>
        <div className="fresh-more-scroll">
          {NAV_GROUPS.map((group) => (
            <section key={group.id} className="fresh-more-group" aria-label={group.label}>
              <h2>{group.label}</h2>
              <div className="fresh-more-grid">{group.items.map(renderItem)}</div>
            </section>
          ))}
          <section className="fresh-more-group" aria-label="Account">
            <h2>Account</h2>
            <div className="fresh-more-grid">{ACCOUNT_ITEMS.map(renderItem)}</div>
          </section>
        </div>
      </div>
    </div>
  );
}

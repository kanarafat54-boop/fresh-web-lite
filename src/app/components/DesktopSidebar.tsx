import { useLayout } from "../contexts/useLayout";
import { ACCOUNT_ITEMS, NAV_GROUPS, isNavItemActive, type NavItem } from "../navigation/navModel";
import "./DesktopSidebar.css";

export default function DesktopSidebar() {
  const { activeRoute, setActiveRoute } = useLayout();
  const go = (id: string) => setActiveRoute(id);

  const renderItem = (item: NavItem) => {
    const active = isNavItemActive(item, activeRoute);
    return (
      <button
        key={item.id}
        type="button"
        className={`fresh-sidebar-item ${active ? "active" : ""}`}
        onClick={() => go(item.id)}
        aria-current={active ? "page" : undefined}
        title={item.hint}
      >
        <i aria-hidden="true">{item.icon}</i>
        <span>{item.label}</span>
      </button>
    );
  };

  return (
    <aside className="fresh-desktop-sidebar" aria-label="Fresh workspace navigation">
      <div className="fresh-sidebar-workspace">
        <div className="fresh-sidebar-mark">F</div>
        <div>
          <strong>Fresh</strong>
          <span>Everything connected</span>
        </div>
      </div>

      <button className="fresh-sidebar-create" type="button" onClick={() => go("studio")}>
        <span>＋</span>
        <strong>Create</strong>
        <kbd>⌘ N</kbd>
      </button>

      <div className="fresh-sidebar-scroll">
        {NAV_GROUPS.map((group) => (
          <div className="fresh-sidebar-group" key={group.id} role="group" aria-label={group.label}>
            <span className="fresh-sidebar-label">{group.label}</span>
            {group.items.map(renderItem)}
          </div>
        ))}
      </div>

      <div className="fresh-sidebar-footer">
        {ACCOUNT_ITEMS.slice().reverse().map((item) => {
          const active = isNavItemActive(item, activeRoute);
          return item.id === "profile" ? (
            <button key={item.id} type="button" onClick={() => go(item.id)} aria-current={active ? "page" : undefined}>
              <span className="fresh-sidebar-avatar">M</span>
              <span className="fresh-sidebar-profile-copy">
                <strong>{item.label}</strong>
                <small>Account &amp; preferences</small>
              </span>
              <span>›</span>
            </button>
          ) : (
            <button key={item.id} type="button" onClick={() => go(item.id)} aria-current={active ? "page" : undefined}>
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </aside>
  );
}

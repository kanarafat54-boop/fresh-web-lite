import { useEffect, useState } from "react";
import { BellIcon, ChevronDownIcon, SearchIcon, SettingsIcon } from "../../components/Icons";
import { useLayout } from "../contexts/useLayout";
import { useFreshId } from "../../features/fresh-id/context/FreshIdContext";
import "../../features/fresh-flow/components/FreshFlowReferenceShell.css";
import { OPEN_MORE_EVENT } from "./BottomNav";
import "./TopBar.css";

export default function TopBar() {
  const { toggleSidebar, setActiveRoute, notifications, openNotifications, openSearch } = useLayout();
  const { isAuthenticated, setAuthView } = useFreshId();
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  useEffect(() => {
    const saved = window.localStorage.getItem("fresh-theme");
    const next =
      saved === "light" || saved === "dark"
        ? saved
        : window.matchMedia("(prefers-color-scheme: light)").matches
          ? "light"
          : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
  }, []);
  function setFreshTheme(next: "dark" | "light") {
    setTheme(next);
    document.documentElement.dataset.theme = next;
    window.localStorage.setItem("fresh-theme", next);
  }
  function openAuth() {
    setAuthView("form");
    setActiveRoute("auth-signin");
  }
  function openProfile() {
    if (isAuthenticated) setActiveRoute("profile");
    else openAuth();
  }
  function openMenu() {
    toggleSidebar();
    // On narrow screens the sidebar is hidden, so open the full grouped menu instead.
    if (window.matchMedia("(max-width: 900px)").matches) window.dispatchEvent(new CustomEvent(OPEN_MORE_EVENT));
  }
  function openCreate() {
    setActiveRoute("studio");
  }

  return (
    <header className="fresh-universal-topbar" aria-label="Fresh universal navigation">
      <div className="fresh-universal-brand">
        <button className="fresh-universal-menu" type="button" onClick={openMenu} aria-label="Open Fresh ecosystem navigation">
          <span>☰</span>
        </button>
        <button className="fresh-universal-logo" type="button" onClick={() => setActiveRoute("feed")} aria-label="Fresh home">
          F
        </button>
        <button className="fresh-universal-brand-copy" type="button" onClick={() => setActiveRoute("feed")} aria-label="Open Fresh home">
          <strong>Fresh</strong>
          <span>Universal ecosystem</span>
        </button>
      </div>
      <button className="fresh-universal-search" type="button" onClick={openSearch} aria-label="Search Fresh">
        <SearchIcon size={18} />
        <span>Search anything across Fresh…</span>
        <kbd>⌘ K</kbd>
      </button>
      <div className="fresh-universal-workspace" aria-label="Current workspace">
        <span className="fresh-workspace-dot" /> <span>Personal workspace</span>
        <ChevronDownIcon size={14} />
      </div>
      <div className="fresh-theme-switch" role="group" aria-label="Appearance">
        <button type="button" className={theme === "dark" ? "is-active" : ""} onClick={() => setFreshTheme("dark")} aria-label="Dark mode" title="Dark mode">
          ◐
        </button>
        <button type="button" className={theme === "light" ? "is-active" : ""} onClick={() => setFreshTheme("light")} aria-label="Light mode" title="Light mode">
          ☼
        </button>
      </div>
      <nav className="fresh-universal-actions" aria-label="Quick actions">
        <button className="fresh-mobile-search-action" type="button" onClick={openSearch} aria-label="Search Fresh" title="Search Fresh">
          <SearchIcon size={19} />
        </button>
        <button type="button" onClick={openCreate} aria-label="Create" title="Create">
          <span>＋</span>
        </button>
        <button type="button" onClick={() => window.dispatchEvent(new CustomEvent("fresh-ai-open"))} aria-label="Open Fresh AI" title="Fresh AI">
          <span>✦</span>
        </button>
        <button type="button" onClick={openNotifications} aria-label="Notifications" title="Notifications">
          <BellIcon size={19} />
          {notifications.length > 0 && <i aria-hidden="true">{Math.min(notifications.length, 9)}</i>}
        </button>
        <button type="button" onClick={() => setActiveRoute("settings")} aria-label="Settings" title="Settings">
          <SettingsIcon size={19} />
        </button>
        <button
          className="fresh-universal-profile"
          type="button"
          onClick={openProfile}
          aria-label={isAuthenticated ? "Open profile" : "Sign in"}
          title={isAuthenticated ? "Profile" : "Sign in"}
        >
          <span className="fresh-universal-avatar" aria-hidden="true">
            {isAuthenticated ? "M" : "?"}
          </span>
          <ChevronDownIcon size={14} />
        </button>
      </nav>
    </header>
  );
}

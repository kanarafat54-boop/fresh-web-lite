import { useEffect, useState } from "react";
import { useLayout } from "../../app/contexts/useLayout";
import "./SettingsWorkspace.css";

type Theme = "dark" | "light";

export default function SettingsWorkspace() {
  const { setActiveRoute } = useLayout();
  const [theme, setTheme] = useState<Theme>("dark");
  const [notifications, setNotifications] = useState(true);

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("fresh-theme");
    if (savedTheme === "light" || savedTheme === "dark") {
      setTheme(savedTheme);
      document.documentElement.dataset.theme = savedTheme;
    } else {
      const next: Theme = window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
      setTheme(next);
      document.documentElement.dataset.theme = next;
    }
    setNotifications(window.localStorage.getItem("fresh-notifications") !== "off");
  }, []);

  const changeTheme = (next: Theme) => {
    setTheme(next);
    document.documentElement.dataset.theme = next;
    window.localStorage.setItem("fresh-theme", next);
  };

  const changeNotifications = (enabled: boolean) => {
    setNotifications(enabled);
    window.localStorage.setItem("fresh-notifications", enabled ? "on" : "off");
  };

  return <div className="fresh-settings-page">
    <header className="fresh-settings-header">
      <div>
        <span className="fresh-settings-eyebrow">FRESH SETTINGS</span>
        <h1>Settings</h1>
        <p>Control your Fresh experience without leaving the platform.</p>
      </div>
      <button type="button" onClick={() => setActiveRoute("feed")}>Back Home</button>
    </header>

    <section className="fresh-settings-card" aria-labelledby="appearance-title">
      <div><h2 id="appearance-title">Appearance</h2><p>Choose the background and contrast that fit you.</p></div>
      <div className="fresh-settings-choice-row">
        <button type="button" className={theme === "dark" ? "selected" : ""} onClick={() => changeTheme("dark")} aria-pressed={theme === "dark"}>◐ <span><strong>Dark</strong><small>Focused and immersive</small></span></button>
        <button type="button" className={theme === "light" ? "selected" : ""} onClick={() => changeTheme("light")} aria-pressed={theme === "light"}>☼ <span><strong>Light</strong><small>Bright and clear</small></span></button>
      </div>
    </section>

    <section className="fresh-settings-card">
      <div><h2>Notifications</h2><p>Control product notifications from Fresh actions.</p></div>
      <button type="button" className={notifications ? "fresh-settings-toggle on" : "fresh-settings-toggle"} aria-pressed={notifications} onClick={() => changeNotifications(!notifications)}>
        <span aria-hidden="true" />{notifications ? "On" : "Off"}
      </button>
    </section>

    <section className="fresh-settings-card">
      <div><h2>Account & privacy</h2><p>Manage identity, profile and privacy controls from their dedicated surfaces.</p></div>
      <div className="fresh-settings-actions">
        <button type="button" onClick={() => setActiveRoute("profile")}>Open Profile</button>
        <button type="button" onClick={() => setActiveRoute("trust")}>Open Trust</button>
      </div>
    </section>
  </div>;
}

import AppRouter from "./AppRouter";
import { ThemeProvider, useTheme } from "./providers/ThemeProvider";
import { LayoutProvider } from "./contexts/LayoutProvider";
import { useLayout } from "./contexts/useLayout";
import GlobalFreshAI from "./components/GlobalFreshAI";
import FreshAIMain from "./components/FreshAIMain";
import FreshAIContextPanel from "./components/FreshAIContextPanel";
import "../index.css";

function GlobalThemeControl() {
  const { theme, setTheme } = useTheme();
  return (
    <div className="fresh-global-theme" role="group" aria-label="Fresh appearance">
      <button type="button" className={theme === "light" ? "is-active" : ""} onClick={() => setTheme("light")} aria-pressed={theme === "light"}>Light</button>
      <button type="button" className={theme === "dark" ? "is-active" : ""} onClick={() => setTheme("dark")} aria-pressed={theme === "dark"}>Dark</button>
    </div>
  );
}

function FreshAIExperience() {
  const { activeRoute } = useLayout();
  const isAI = (activeRoute ?? "").toLowerCase() === "/ai";
  return isAI ? <FreshAIMain /> : <GlobalFreshAI />;
}

export default function AppShell() {
  return (
    <ThemeProvider>
      <LayoutProvider>
        <div className="app-shell-root">
          <AppRouter />
          <GlobalThemeControl />
          <FreshAIContextPanel />
          <FreshAIExperience />
        </div>
      </LayoutProvider>
    </ThemeProvider>
  );
}

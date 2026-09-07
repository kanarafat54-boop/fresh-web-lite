import AppRouter from "./AppRouter";
import { ThemeProvider } from "./providers/ThemeProvider";
import { LayoutProvider } from "./contexts/LayoutProvider";
import GlobalFreshAI from "./components/GlobalFreshAI";

export default function AppShell() {
  return (
    <ThemeProvider>
      <LayoutProvider>
        <div className="app-shell-root">
          <AppRouter />
          <GlobalFreshAI />
        </div>
      </LayoutProvider>
    </ThemeProvider>
  );
}

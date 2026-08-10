import AppRouter from "./AppRouter";
import { ThemeProvider } from "./providers/ThemeProvider";
import { LayoutProvider } from "./contexts/LayoutProvider";

export default function AppShell() {
  return (
    <ThemeProvider>
      <LayoutProvider>
        <div className="app-shell-root">
          <AppRouter />
        </div>
      </LayoutProvider>
    </ThemeProvider>
  );
}

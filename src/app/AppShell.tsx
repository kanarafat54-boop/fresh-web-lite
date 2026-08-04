import React from "react";
import AppRouter from "./AppRouter";
import { ThemeProvider } from "./providers/ThemeProvider";
import { LayoutProvider } from "./contexts/LayoutContext";

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

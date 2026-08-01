import type { ReactNode } from "react";
import TopBar from "./components/TopBar";
import BottomNav from "./components/BottomNav";

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="fresh-app">
      <TopBar />

      <main>
        {children}
      </main>

      <BottomNav />
    </div>
  );
}

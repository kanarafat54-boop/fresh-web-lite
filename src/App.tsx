import "./features/shorts/components/shorts-flow.css";
import AppShell from "./app/AppShell";
import MemphisArafatPage from "./features/creator/MemphisArafatPage";

/**
 * The root application is intentionally thin.
 * Runtime providers are owned by main.tsx; application composition lives in AppShell.
 */
export default function App() {
  const path = window.location.pathname.replace(/\/+$/, "") || "/";

  if (path === "/memphis-arafat") {
    return <MemphisArafatPage />;
  }

  return <AppShell />;
}

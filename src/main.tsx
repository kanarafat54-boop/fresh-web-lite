import { StrictMode, Component, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";

import "./index.css";
import "./design-system/design-system.css";

type BootState = "loading" | "ready" | "error";

class RuntimeErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error?: Error }
> {
  state = { hasError: false, error: undefined as Error | undefined };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return <BootFailure error={this.state.error} />;
    }

    return this.props.children;
  }
}

function BootScreen({ state, error }: { state: BootState; error?: Error }) {
  if (state === "ready") return null;

  return (
    <div className="boot-screen" role={state === "error" ? "alert" : undefined}>
      <div className="boot-card">
        <div className="boot-mark">F</div>
        <h1>Fresh Web Lite</h1>
        {state === "loading" ? (
          <p>Starting the platform…</p>
        ) : (
          <>
            <p>Fresh Web Lite could not start.</p>
            <pre>{error?.message ?? "Unknown startup error"}</pre>
            <p className="boot-help">
              Open the browser console for the full diagnostic. This screen is
              intentional: a production startup failure must never appear as a
              blank page.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function BootFailure({ error }: { error?: Error }) {
  return <BootScreen state="error" error={error} />;
}

async function bootstrap(root: Root) {
  try {
    const [
      { default: App },
      { FreshIdProvider },
      { FreshCoreProvider },
      { ProfileNavProvider },
    ] = await Promise.all([
      import("./App"),
      import("./features/fresh-id/context/FreshIdContext"),
      import("./app/providers/FreshCoreProvider"),
      import("./features/profile/context/ProfileNavContext"),
    ]);

    root.render(
      <StrictMode>
        <RuntimeErrorBoundary>
          <FreshCoreProvider>
            <FreshIdProvider>
              <ProfileNavProvider>
                <App />
              </ProfileNavProvider>
            </FreshIdProvider>
          </FreshCoreProvider>
        </RuntimeErrorBoundary>
      </StrictMode>
    );
  } catch (error) {
    console.error("Fresh Web Lite startup failed", error);
    root.render(<BootFailure error={error instanceof Error ? error : undefined} />);
  }
}

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Fresh Web Lite root element (#root) is missing.");
}

const root = createRoot(rootElement);
root.render(<BootScreen state="loading" />);
void bootstrap(root);

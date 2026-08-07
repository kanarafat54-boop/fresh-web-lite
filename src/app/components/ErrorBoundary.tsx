import { Component } from "react";
import type { ReactNode } from "react";

type Props = {
  featureName?: string;
  children: ReactNode;
};

type State = {
  hasError: boolean;
};

export default class ErrorBoundary extends Component<Props, State> {
  state: State = {
    hasError: false,
  };

  static getDerivedStateFromError(): State {
    return {
      hasError: true,
    };
  }

  componentDidCatch(error: Error) {
    console.error("ErrorBoundary:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div>
          <h2>{this.props.featureName ?? "Application"} failed to load</h2>
          <button
            onClick={() => window.location.reload()}
          >
            Reload
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

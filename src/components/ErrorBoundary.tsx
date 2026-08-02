import { Component, type ErrorInfo, type ReactNode } from "react";
import { Link } from "react-router-dom";

interface Props {
  children: ReactNode;
}

interface State {
  failed: boolean;
}

/** Keeps one broken lazy route from blanking the header or the whole SPA. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("[rh] route render failed", error, info.componentStack);
  }

  render(): ReactNode {
    if (!this.state.failed) return this.props.children;
    return (
      <main className="mx-auto max-w-sm px-4 py-20 text-center" role="alert">
        <p className="font-display text-lg font-bold">This screen hit a snag</p>
        <p className="mt-2 text-sm text-ink-soft">
          Your session is safe. Open another section and try again.
        </p>
        <Link to="/rewards" className="btn-accent mt-6 px-6 py-2.5 text-sm">
          Back to rewards
        </Link>
      </main>
    );
  }
}

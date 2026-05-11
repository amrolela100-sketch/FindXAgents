import React from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "./ui/button";

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-full flex flex-col items-center justify-center p-8 text-center">
          <div
            className="p-8 rounded-2xl max-w-md w-full"
            style={{
              background: "var(--glass)",
              backdropFilter: "blur(20px) saturate(180%)",
              WebkitBackdropFilter: "blur(20px) saturate(180%)",
              border: "1px solid rgba(239,68,68, 0.25)",
              boxShadow: "0 8px 40px rgba(239,68,68, 0.10), inset 0 1px 0 rgba(255,255,255,0.10)",
            }}
          >
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4"
              style={{ background: "rgba(239,68,68, 0.12)", border: "1px solid rgba(239,68,68, 0.25)" }}
            >
              <AlertCircle className="w-6 h-6" style={{ color: "#F87171" }} />
            </div>
            <h2 className="text-2xl font-serif font-bold mb-2" style={{ color: "var(--text)" }}>
              Something went wrong
            </h2>
            <p className="text-sm mb-6 whitespace-pre-wrap" style={{ color: "var(--text-muted)" }}>
              {this.state.error?.message || "An unexpected error occurred while rendering this page."}
            </p>
            <button
              onClick={this.handleRetry}
              className="btn btn-primary w-full gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Try again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

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
        <div className="min-h-full flex flex-col items-center justify-center p-8 text-center bg-[#F7F5F0]">
          <div className="bg-white p-8 rounded-2xl shadow-sm max-w-md w-full border border-red-100">
            <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <h2 className="text-2xl font-serif font-bold text-[#1A1A1A] mb-2">Something went wrong</h2>
            <p className="text-sm text-[#7A756D] mb-6 whitespace-pre-wrap">
              {this.state.error?.message || "An unexpected error occurred while rendering this page."}
            </p>
            <Button onClick={this.handleRetry} className="w-full gap-2 bg-[#1A1A1A] text-white hover:bg-[#333]">
              <RefreshCw className="w-4 h-4" />
              Try again
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

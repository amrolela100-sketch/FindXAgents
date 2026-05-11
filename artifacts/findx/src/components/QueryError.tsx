import { AlertCircle, RefreshCw } from "lucide-react";

interface QueryErrorProps {
  error: Error | null;
  resetErrorBoundary?: () => void;
}

export function QueryError({ error, resetErrorBoundary }: QueryErrorProps) {
  return (
    <div
      className="flex flex-col items-center justify-center p-8 text-center rounded-2xl"
      style={{
        background: "rgba(239,68,68, 0.06)",
        border: "1px solid rgba(239,68,68, 0.20)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
      }}
    >
      <AlertCircle className="w-8 h-8 mb-3" style={{ color: "#F87171" }} />
      <h3 className="text-lg font-serif font-semibold mb-2" style={{ color: "#F87171" }}>
        Failed to load data
      </h3>
      <p className="text-sm mb-4 max-w-md" style={{ color: "var(--text-muted)" }}>
        {error?.message || "An error occurred while fetching data from the server."}
      </p>
      {resetErrorBoundary && (
        <button
          onClick={resetErrorBoundary}
          className="btn btn-secondary gap-2"
          style={{ borderColor: "rgba(239,68,68,0.30)", color: "#F87171" }}
        >
          <RefreshCw className="w-4 h-4" />
          Try Again
        </button>
      )}
    </div>
  );
}

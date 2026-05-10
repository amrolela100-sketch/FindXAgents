import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "./ui/button";

interface QueryErrorProps {
  error: Error | null;
  resetErrorBoundary?: () => void;
}

export function QueryError({ error, resetErrorBoundary }: QueryErrorProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center border rounded-xl bg-red-50/50 border-red-100">
      <AlertCircle className="w-8 h-8 text-red-500 mb-3" />
      <h3 className="text-lg font-serif font-semibold text-red-900 mb-2">Failed to load data</h3>
      <p className="text-sm text-red-600 mb-4 max-w-md">
        {error?.message || "An error occurred while fetching data from the server."}
      </p>
      {resetErrorBoundary && (
        <Button 
          variant="outline" 
          onClick={resetErrorBoundary}
          className="bg-white border-red-200 text-red-700 hover:bg-red-50 gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Try Again
        </Button>
      )}
    </div>
  );
}

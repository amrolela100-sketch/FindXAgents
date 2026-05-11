import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "../supabase";

interface UseRealtimeDataOptions {
  enabled?: boolean;
}

interface UseRealtimeDataResult<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
  /** Alias for refetch — kept for backward compatibility */
  refresh: () => void;
}

export function useRealtimeData<T>(
  fetchFn: () => Promise<T>,
  tables: string[],
  fallbackIntervalMs = 30_000,
  options?: UseRealtimeDataOptions,
): UseRealtimeDataResult<T> {
  const enabled = options?.enabled ?? true;
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFnRef = useRef(fetchFn);
  fetchFnRef.current = fetchFn;

  const tablesRef = useRef(tables);
  tablesRef.current = tables;

  const executeFetch = useCallback(async () => {
    try {
      setError(null);
      const result = await fetchFnRef.current();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;

    setIsLoading(true);
    executeFetch();

    const channelList = tablesRef.current.map((table) =>
      supabase
        .channel(`rt:${table}:${Math.random().toString(36).slice(2)}`)
        .on("postgres_changes", { event: "*", schema: "public", table }, () => {
          executeFetch();
        })
        .subscribe(),
    );

    const interval = setInterval(executeFetch, fallbackIntervalMs);

    return () => {
      channelList.forEach((ch) => supabase.removeChannel(ch));
      clearInterval(interval);
    };
  }, [enabled, executeFetch, fallbackIntervalMs]);

  return { data, isLoading, error, refetch: executeFetch, refresh: executeFetch };
}

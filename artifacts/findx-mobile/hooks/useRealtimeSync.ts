import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export function useRealtimeSync() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const leadsChannel = supabase
      .channel("rt-mobile-leads")
      .on("postgres_changes", { event: "*", schema: "public", table: "leads" }, () => {
        queryClient.invalidateQueries({ queryKey: ["leads"] });
        queryClient.invalidateQueries({ queryKey: ["lead"] });
        queryClient.invalidateQueries({ queryKey: ["dashboard"] });
        queryClient.invalidateQueries({ queryKey: ["outreaches"] });
        queryClient.invalidateQueries({ queryKey: ["analyses"] });
      })
      .subscribe();

    const runsChannel = supabase
      .channel("rt-mobile-runs")
      .on("postgres_changes", { event: "*", schema: "public", table: "agent_pipeline_runs" }, () => {
        queryClient.invalidateQueries({ queryKey: ["runs"] });
        queryClient.invalidateQueries({ queryKey: ["run"] });
        queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      })
      .subscribe();

    const outreachesChannel = supabase
      .channel("rt-mobile-outreaches")
      .on("postgres_changes", { event: "*", schema: "public", table: "outreaches" }, () => {
        queryClient.invalidateQueries({ queryKey: ["outreaches"] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(leadsChannel);
      supabase.removeChannel(runsChannel);
      supabase.removeChannel(outreachesChannel);
    };
  }, [queryClient]);
}

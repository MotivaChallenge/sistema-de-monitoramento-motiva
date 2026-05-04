import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Subscreve mudanças em alerts/segments e revalida queries dependentes.
 * Deve ser montado uma vez por sessão autenticada (ex.: no AppLayout).
 */
export const useRealtimeRefresh = () => {
  const qc = useQueryClient();
  useEffect(() => {
    const channel = supabase
      .channel("vegia-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "alerts" }, () => {
        qc.invalidateQueries({ queryKey: ["alerts-feed"] });
        qc.invalidateQueries({ queryKey: ["alerts-with-segments"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "segments" }, () => {
        qc.invalidateQueries({ queryKey: ["segments"] });
        qc.invalidateQueries({ queryKey: ["segment"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "rocada_events" }, () => {
        qc.invalidateQueries({ queryKey: ["rocada_events"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [qc]);
};
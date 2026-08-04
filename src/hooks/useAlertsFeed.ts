import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Status } from "@/types/domain";

export interface AlertFeedItem {
  id: string;
  segmentId: string;
  km: string;
  status: Status;
  message: string;
  createdAt: string;
}

const QUERY_KEY = ["alerts-feed"];

export const useAlertsFeed = () => {
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async (): Promise<AlertFeedItem[]> => {
      const { data, error } = await supabase
        .from("alerts")
        .select("id, segment_id, status, message, created_at, segments(km)")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []).map((r: any) => ({
        id: r.id,
        segmentId: r.segment_id,
        km: r.segments?.km ?? r.segment_id,
        status: r.status as Status,
        message: r.message ?? "Alteração de status registrada",
        createdAt: r.created_at,
      }));
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel(`alerts-feed-rt-${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "alerts" },
        () => qc.invalidateQueries({ queryKey: QUERY_KEY })
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);

  return query;
};

/**
 * Contagem exata de alertas ativos (crítico/atenção).
 * O feed é limitado a 20 itens, por isso o badge usa uma contagem própria.
 */
export const useActiveAlertsCount = () =>
  useQuery({
    queryKey: ["alerts-active-count"],
    queryFn: async (): Promise<number> => {
      const { count, error } = await supabase
        .from("alerts")
        .select("id", { count: "exact", head: true })
        .in("status", ["critico", "atencao"]);
      if (error) throw error;
      return count ?? 0;
    },
  });

const LAST_SEEN_KEY = "vegia.alerts.lastSeen";

export const getLastSeen = (): number => {
  const v = localStorage.getItem(LAST_SEEN_KEY);
  return v ? Number(v) : 0;
};

export const markAllSeen = () => {
  localStorage.setItem(LAST_SEEN_KEY, String(Date.now()));
  window.dispatchEvent(new Event("vegia:alerts-seen"));
};
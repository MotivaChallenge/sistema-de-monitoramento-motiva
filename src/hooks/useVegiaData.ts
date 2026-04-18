import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Segment, Status } from "@/data/mock";

interface CvImage {
  id: number;
  km: string;
  label: string;
  confidence: number;
  status: Status;
  caption: string;
  box?: { x: number; y: number; w: number; h: number };
}

const mapSegment = (r: any): Segment => ({
  id: r.id,
  km: r.km,
  kmStart: Number(r.km_start),
  kmEnd: Number(r.km_end),
  tipo: r.tipo,
  ndvi: Number(r.ndvi),
  altura: r.altura,
  limite: r.limite,
  status: r.status as Status,
  clausula: r.clausula,
  clauseFull: r.clause_full,
  ultimaRocada: r.ultima_rocada,
  deadline: r.deadline ?? undefined,
  deadlineUrgent: r.deadline_urgent ?? false,
  notificationId: r.notification_id ?? undefined,
  insight: r.insight ?? undefined,
  street: r.street ?? undefined,
  detection: r.detection ?? undefined,
});

export const useSegments = () =>
  useQuery({
    queryKey: ["segments"],
    queryFn: async (): Promise<Segment[]> => {
      const { data, error } = await supabase.from("segments").select("*").order("km_start");
      if (error) throw error;
      return (data ?? []).map(mapSegment);
    },
  });

export const useSegment = (id?: string) =>
  useQuery({
    queryKey: ["segment", id],
    enabled: !!id,
    queryFn: async (): Promise<Segment | null> => {
      const { data, error } = await supabase.from("segments").select("*").eq("id", id!).maybeSingle();
      if (error) throw error;
      return data ? mapSegment(data) : null;
    },
  });

export const useAlerts = () =>
  useQuery({
    queryKey: ["alerts-with-segments"],
    queryFn: async (): Promise<Segment[]> => {
      const { data, error } = await supabase
        .from("alerts")
        .select("segment_id, segments(*)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((a: any) => mapSegment(a.segments)).filter(Boolean);
    },
  });

export const useCvResults = () =>
  useQuery({
    queryKey: ["cv_results"],
    queryFn: async (): Promise<CvImage[]> => {
      const { data, error } = await supabase.from("cv_results").select("*").order("id");
      if (error) throw error;
      return (data ?? []).map((r: any) => ({
        id: r.id,
        km: r.km,
        label: r.label,
        confidence: Number(r.confidence),
        status: r.status as Status,
        caption: r.caption ?? "",
        box: r.box ?? undefined,
      }));
    },
  });

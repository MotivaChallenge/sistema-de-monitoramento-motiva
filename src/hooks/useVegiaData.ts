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

// ---------- Real-data hooks (km_markers, rocada, reports, measurements) ----------

export interface KmMarker { km: number; lat: number; lng: number }
export interface RocadaClass {
  id: number; classe: string; lat: number; lng: number;
  area_m2: number | null; km_approx: number | null;
  polygon: [number, number][];
}
export interface InspectionReport {
  id: number; report_code: string; rodovia: string; unidade: string;
  versao: string | null; km_start: number; km_end: number; data_levantamento: string;
}
export interface Measurement {
  id: number; report_id: number; item_codigo: string; item_descricao: string;
  km_offset: number; nivel: number | null; na: boolean;
}

export const useKmMarkers = () =>
  useQuery({
    queryKey: ["km_markers"],
    queryFn: async (): Promise<KmMarker[]> => {
      const { data, error } = await supabase
        .from("km_markers").select("km_value,lat,lng").order("km_value");
      if (error) throw error;
      return (data ?? []).map((r: any) => ({
        km: Number(r.km_value), lat: Number(r.lat), lng: Number(r.lng),
      }));
    },
  });

export const useRocadaClassification = () =>
  useQuery({
    queryKey: ["rocada_classification"],
    queryFn: async (): Promise<RocadaClass[]> => {
      const { data, error } = await supabase
        .from("rocada_classification")
        .select("id,classe,centroid_lat,centroid_lng,area_m2,km_approx,polygon_coords");
      if (error) throw error;
      return (data ?? []).map((r: any) => ({
        id: r.id,
        classe: r.classe,
        lat: Number(r.centroid_lat),
        lng: Number(r.centroid_lng),
        area_m2: r.area_m2 != null ? Number(r.area_m2) : null,
        km_approx: r.km_approx != null ? Number(r.km_approx) : null,
        polygon: (r.polygon_coords ?? []) as [number, number][],
      }));
    },
  });

export const useInspectionReports = () =>
  useQuery({
    queryKey: ["inspection_reports"],
    queryFn: async (): Promise<InspectionReport[]> => {
      const { data, error } = await supabase
        .from("inspection_reports").select("*").order("data_levantamento", { ascending: false });
      if (error) throw error;
      return (data ?? []) as InspectionReport[];
    },
  });

export const useInspectionMeasurements = (reportId?: number) =>
  useQuery({
    queryKey: ["inspection_measurements", reportId],
    enabled: !!reportId,
    queryFn: async (): Promise<Measurement[]> => {
      const { data, error } = await supabase
        .from("inspection_measurements")
        .select("*")
        .eq("report_id", reportId!)
        .order("km_offset");
      if (error) throw error;
      return (data ?? []) as Measurement[];
    },
  });

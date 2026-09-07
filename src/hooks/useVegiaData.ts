import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Segment, Status } from "@/types/domain";
import { statusFromAltura } from "@/lib/status";

interface CvImage {
  id: number;
  km: string;
  label: string;
  confidence: number;
  status: Status;
  caption: string;
  box?: { x: number; y: number; w: number; h: number };
  /** Trecho ao qual a detecção está vinculada (null = não vinculada). */
  segmentId?: string | null;
  rodovia?: string | null;
  kmValue?: number | null;
  source?: string | null;
  model?: string | null;
  capturedAt?: string | null;
  reviewStatus?: string | null;
  modelVersion?: string | null;
  imageRef?: string | null;
  lat?: number | null;
  lng?: number | null;
  alertId?: string | null;
  workOrderId?: string | null;
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
  status: statusFromAltura(Number(r.altura)),
  statusBanco: r.status as Status,
  clausula: r.clausula,
  clauseFull: r.clause_full,
  ultimaRocada: r.ultima_rocada,
  rodovia: r.rodovia ?? undefined,
  deadline: r.deadline ?? undefined,
  deadlineUrgent: r.deadline_urgent ?? false,
  notificationId: r.notification_id ?? undefined,
  insight: r.insight ?? undefined,
  street: r.street ?? undefined,
  detection: r.detection ?? undefined,
  uncertaintyCm: r.uncertainty_cm != null ? Number(r.uncertainty_cm) : null,
  ndviSource: (r.ndvi_source as "seed" | "sentinel2") ?? "seed",
  lastSatelliteReadAt: r.last_satellite_read_at ?? null,
  satelliteImages: r.satellite_images ?? null,
  satelliteValidPixels: r.satellite_valid_pixels ?? null,
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
        segmentId: r.segment_id ?? null,
        rodovia: r.rodovia ?? null,
        kmValue: r.km_value != null ? Number(r.km_value) : null,
        source: r.source ?? null,
        model: r.model ?? null,
        capturedAt: r.captured_at ?? null,
        reviewStatus: r.review_status ?? null,
        modelVersion: r.model_version ?? null,
        imageRef: r.image_ref ?? null,
        lat: r.lat != null ? Number(r.lat) : null,
        lng: r.lng != null ? Number(r.lng) : null,
        alertId: r.alert_id ?? null,
        workOrderId: r.work_order_id ?? null,
      }));
    },
  });

// ---------- Real-data hooks (km_markers, rocada, reports, measurements) ----------

export interface KmMarker { km: number; lat: number; lng: number }
export interface Highway {
  code: string;
  nome: string;
  concessao: string;
  uf_inicio: string;
  uf_fim: string;
  km_inicio: number;
  km_fim: number;
  start_lat: number;
  start_lng: number;
  end_lat: number;
  end_lng: number;
  cor: string;
}
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

export const useHighways = () =>
  useQuery({
    queryKey: ["highways"],
    queryFn: async (): Promise<Highway[]> => {
      const { data, error } = await supabase
        .from("highways")
        .select("*")
        .order("concessao")
        .order("nome");
      if (error) throw error;
      return (data ?? []).map((r: any) => ({
        code: r.code,
        nome: r.nome,
        concessao: r.concessao,
        uf_inicio: r.uf_inicio,
        uf_fim: r.uf_fim,
        km_inicio: Number(r.km_inicio),
        km_fim: Number(r.km_fim),
        start_lat: Number(r.start_lat),
        start_lng: Number(r.start_lng),
        end_lat: Number(r.end_lat),
        end_lng: Number(r.end_lng),
        cor: r.cor,
      }));
    },
  });

export const useKmMarkers = (rodovia?: string) =>
  useQuery({
    queryKey: ["km_markers", rodovia ?? "all"],
    queryFn: async (): Promise<KmMarker[]> => {
      let q = supabase.from("km_markers").select("km_value,lat,lng,rodovia").order("km_value");
      if (rodovia) q = q.eq("rodovia", rodovia);
      const { data, error } = await q;
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

// ---------- NDVI history, teams, coverage ----------

export interface NdviHistoryPoint { date: string; value: number }

const formatDate = (iso: string) => {
  const d = new Date(iso + "T00:00:00");
  const meses = ["JAN","FEV","MAR","ABR","MAI","JUN","JUL","AGO","SET","OUT","NOV","DEZ"];
  return `${String(d.getDate()).padStart(2,"0")} ${meses[d.getMonth()]}`;
};

export const useSegmentNdviHistory = (segmentId?: string) =>
  useQuery({
    queryKey: ["segment_ndvi_history", segmentId],
    enabled: !!segmentId,
    queryFn: async (): Promise<{ date: string; value: number }[]> => {
      const { data, error } = await supabase
        .from("segment_ndvi_history")
        .select("data,altura_cm")
        .eq("segment_id", segmentId!)
        .order("data", { ascending: true })
        .limit(7);
      if (error) throw error;
      const rows = (data ?? []) as { data: string; altura_cm: number }[];
      return rows.map((r, i) => ({
        date: i === rows.length - 1 ? "HOJE" : formatDate(r.data),
        value: Number(r.altura_cm),
      }));
    },
  });

export const useNdviTrend = () =>
  useQuery({
    queryKey: ["ndvi_trend"],
    queryFn: async (): Promise<{ label: string; value: number }[]> => {
      const { data, error } = await supabase
        .from("segment_ndvi_history")
        .select("data,ndvi")
        .order("data", { ascending: false })
        .limit(2000);
      if (error) throw error;
      const byDate = new Map<string, { sum: number; n: number }>();
      for (const r of (data ?? []) as { data: string; ndvi: number }[]) {
        const acc = byDate.get(r.data) ?? { sum: 0, n: 0 };
        acc.sum += Number(r.ndvi);
        acc.n += 1;
        byDate.set(r.data, acc);
      }
      const sortedDates = [...byDate.keys()].sort().slice(-6);
      return sortedDates.map((d, i) => ({
        label: `L${i + 1}`,
        value: Number((byDate.get(d)!.sum / byDate.get(d)!.n).toFixed(2)),
      }));
    },
  });

export interface HeatmapBand { from: number; to: number; status: Status }

export const useNdviHeatmap = () =>
  useQuery({
    queryKey: ["ndvi_heatmap"],
    queryFn: async (): Promise<HeatmapBand[]> => {
      const { data, error } = await supabase
        .from("segments")
        .select("km_start,km_end,status,altura")
        .order("km_start", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((s: any) => ({
        from: Number(s.km_start),
        to: Number(s.km_end),
        status: statusFromAltura(Number(s.altura)),
      }));
    },
  });

export interface SegmentTeam { nome: string; base_km: number; tempo_resposta_min: number }

export const useSegmentTeam = (segmentId?: string) =>
  useQuery({
    queryKey: ["segment_team", segmentId],
    enabled: !!segmentId,
    queryFn: async (): Promise<SegmentTeam | null> => {
      const { data, error } = await supabase
        .from("segment_team_assignment")
        .select("field_teams(nome,base_km,tempo_resposta_min)")
        .eq("segment_id", segmentId!)
        .maybeSingle();
      if (error) throw error;
      const t = (data as any)?.field_teams;
      if (!t) return null;
      return {
        nome: t.nome,
        base_km: Number(t.base_km),
        tempo_resposta_min: t.tempo_resposta_min,
      };
    },
  });

export const useTotalCoverage = () =>
  useQuery({
    queryKey: ["total_coverage"],
    queryFn: async (): Promise<number> => {
      const { data, error } = await supabase
        .from("segments")
        .select("km_start,km_end");
      if (error) throw error;
      const rows = (data ?? []) as { km_start: number; km_end: number }[];
      if (!rows.length) return 0;
      const min = Math.min(...rows.map(r => Number(r.km_start)));
      const max = Math.max(...rows.map(r => Number(r.km_end)));
      return Number((max - min).toFixed(1));
    },
  });

// ---------- Field teams (CRUD) ----------

export type TeamStatus = "disponivel" | "campo" | "manutencao" | "afastada";

export interface FieldTeam {
  id: string;
  nome: string;
  base_km: number;
  tempo_resposta_min: number;
  funcionarios: number;
  capacidade_dia: number;
  regiao: string;
  status: TeamStatus;
  eficiencia: number;
}

export const useFieldTeams = () =>
  useQuery({
    queryKey: ["field_teams"],
    queryFn: async (): Promise<FieldTeam[]> => {
      const { data, error } = await supabase
        .from("field_teams")
        .select("*")
        .order("nome");
      if (error) throw error;
      return (data ?? []).map((r: any) => ({
        id: r.id,
        nome: r.nome,
        base_km: Number(r.base_km),
        tempo_resposta_min: r.tempo_resposta_min,
        funcionarios: r.funcionarios,
        capacidade_dia: r.capacidade_dia,
        regiao: r.regiao,
        status: r.status as TeamStatus,
        eficiencia: r.eficiencia,
      }));
    },
  });

// ---------- Work orders ----------

export type WorkOrderStatus = "pendente" | "em_andamento" | "concluida" | "cancelada";
export type WorkOrderPriority = "baixa" | "media" | "alta" | "critica";

export interface WorkOrder {
  id: string;
  code: string;
  segment_id: string;
  team_id: string | null;
  tipo_servico: string;
  priority: WorkOrderPriority;
  status: WorkOrderStatus;
  scheduled_for: string | null;
  started_at: string | null;
  completed_at: string | null;
  notes: string | null;
  created_at: string;
}

export const useWorkOrders = () =>
  useQuery({
    queryKey: ["work_orders"],
    queryFn: async (): Promise<WorkOrder[]> => {
      const { data, error } = await supabase
        .from("work_orders")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as WorkOrder[];
    },
  });

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "./useAuth";

export interface RocadaEvent {
  id: string;
  segment_id: string;
  data: string;
  responsavel: string | null;
  observacao: string | null;
  created_at: string;
}

export interface SegmentObservation {
  id: string;
  segment_id: string;
  texto: string;
  autor: string | null;
  created_at: string;
}

const todayISO = () => new Date().toISOString().slice(0, 10);
const todayBR = () => {
  const d = new Date();
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
};

export const useRocadaEvents = (segmentId?: string) =>
  useQuery({
    queryKey: ["rocada_events", segmentId],
    enabled: !!segmentId,
    queryFn: async (): Promise<RocadaEvent[]> => {
      const { data, error } = await supabase
        .from("rocada_events")
        .select("*")
        .eq("segment_id", segmentId!)
        .order("data", { ascending: false });
      if (error) throw error;
      return data as RocadaEvent[];
    },
  });

export const useSegmentObservations = (segmentId?: string) =>
  useQuery({
    queryKey: ["segment_observations", segmentId],
    enabled: !!segmentId,
    queryFn: async (): Promise<SegmentObservation[]> => {
      const { data, error } = await supabase
        .from("segment_observations")
        .select("*")
        .eq("segment_id", segmentId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as SegmentObservation[];
    },
  });

export const useResolveAlertsForSegment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (segmentId: string) => {
      const { error } = await supabase.from("alerts").delete().eq("segment_id", segmentId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["alerts-feed"] });
      qc.invalidateQueries({ queryKey: ["alerts-with-segments"] });
      toast.success("Alertas resolvidos");
    },
    onError: (e: Error) => toast.error("Não foi possível resolver", { description: e.message }),
  });
};

export const useRegisterRocada = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: { segmentId: string; responsavel?: string; observacao?: string }) => {
      const data = todayISO();
      const { error } = await supabase.from("rocada_events").insert({
        segment_id: input.segmentId,
        data,
        responsavel: input.responsavel ?? null,
        observacao: input.observacao ?? null,
        created_by: user?.id ?? null,
      });
      if (error) throw error;
      // Atualiza segments.ultima_rocada (campo legado) e zera altura para refletir intervenção
      const { error: segErr } = await supabase
        .from("segments")
        .update({ ultima_rocada: todayISO(), altura: 0, status: "conforme" })
        .eq("id", input.segmentId);
      if (segErr) throw segErr;
      // Remove alertas vinculados ao segmento
      await supabase.from("alerts").delete().eq("segment_id", input.segmentId);
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["rocada_events", vars.segmentId] });
      qc.invalidateQueries({ queryKey: ["segment", vars.segmentId] });
      qc.invalidateQueries({ queryKey: ["segments"] });
      qc.invalidateQueries({ queryKey: ["alerts-feed"] });
      qc.invalidateQueries({ queryKey: ["alerts-with-segments"] });
      toast.success("Roçada registrada", { description: "IRC e alertas atualizados." });
    },
    onError: (e: Error) => toast.error("Falha ao registrar roçada", { description: e.message }),
  });
};

export const useAddObservation = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: { segmentId: string; texto: string; autor?: string }) => {
      const { error } = await supabase.from("segment_observations").insert({
        segment_id: input.segmentId,
        texto: input.texto,
        autor: input.autor ?? null,
        created_by: user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["segment_observations", vars.segmentId] });
      toast.success("Observação registrada");
    },
    onError: (e: Error) => toast.error("Falha ao salvar observação", { description: e.message }),
  });
};
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ModelValidation {
  model_id: string;
  model_version: string;
  calibration_date: string | null;
  sample_count: number | null;
  validation_sample_count: number | null;
  mae_cm: number | null;
  rmse_cm: number | null;
  bias_cm: number | null;
  confidence_level: number | null;
  uncertainty_cm: number | null;
  uncertainty_method: string | null;
  last_field_validation_at: string | null;
  notes: string | null;
}

/**
 * Métricas de validação do modelo de altura por versão.
 * Sem linha registrada, a interface declara "validação quantitativa pendente"
 * — nenhum valor é inventado.
 */
export const useModelValidation = (modelVersion?: string) =>
  useQuery({
    queryKey: ["model_validation", modelVersion ?? "latest"],
    queryFn: async (): Promise<ModelValidation | null> => {
      let q = supabase
        .from("model_validation")
        .select("*")
        .order("calibration_date", { ascending: false, nullsFirst: false })
        .limit(1);
      if (modelVersion) q = q.eq("model_version", modelVersion);
      const { data, error } = await q;
      if (error) throw error;
      return (data?.[0] as ModelValidation | undefined) ?? null;
    },
    staleTime: 5 * 60_000,
  });

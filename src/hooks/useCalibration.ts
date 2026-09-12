import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  buildPairs, calibrate, DEFAULT_MAX_LAG_DAYS, MIN_CALIBRATION_PAIRS,
  type CalibrationResult, type FieldMeasurement, type SatelliteReading,
} from "@/lib/calibration";

export interface ActiveCalibration {
  id: string;
  model_id: string;
  model_version: string;
  slope: number;
  intercept: number;
  n_pairs: number;
  mae_cm: number | null;
  rmse_cm: number | null;
  bias_cm: number | null;
  r2: number | null;
  residual_sd_cm: number | null;
  uncertainty_cm: number | null;
  max_lag_days: number;
  method: string;
  created_at: string;
  notes: string | null;
}

/** Calibração ativa do modelo de altura (null = ainda no resíduo assumido). */
export const useActiveCalibration = () =>
  useQuery({
    queryKey: ["height_model_calibration", "active"],
    queryFn: async (): Promise<ActiveCalibration | null> => {
      const { data, error } = await supabase
        .from("height_model_calibration")
        .select("*")
        .eq("active", true)
        .limit(1);
      if (error) throw error;
      return (data?.[0] as ActiveCalibration | undefined) ?? null;
    },
    staleTime: 5 * 60_000,
  });

const fetchPairsData = async () => {
  const [m, r] = await Promise.all([
    supabase.from("field_height_measurements").select("segment_id, measured_at, altura_cm"),
    supabase.from("segment_satellite_readings").select("segment_id, read_at, ndvi_median, savi_median, saturated"),
  ]);
  if (m.error) throw m.error;
  if (r.error) throw r.error;
  return {
    measurements: (m.data ?? []) as FieldMeasurement[],
    readings: (r.data ?? []) as SatelliteReading[],
  };
};

/** Prévia da calibração possível com os dados existentes hoje. */
export const useCalibrationPreview = (maxLagDays = DEFAULT_MAX_LAG_DAYS) =>
  useQuery({
    queryKey: ["height_model_calibration", "preview", maxLagDays],
    queryFn: async (): Promise<{ result: CalibrationResult | null; pairCount: number; measurementCount: number }> => {
      const { measurements, readings } = await fetchPairsData();
      const pairs = buildPairs(measurements, readings, maxLagDays);
      return {
        result: calibrate(pairs, maxLagDays),
        pairCount: pairs.length,
        measurementCount: measurements.length,
      };
    },
    staleTime: 60_000,
  });

/** Recalcula e publica a calibração (somente administradores). */
export const useRunCalibration = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (maxLagDays: number = DEFAULT_MAX_LAG_DAYS) => {
      const { measurements, readings } = await fetchPairsData();
      const pairs = buildPairs(measurements, readings, maxLagDays);
      const result = calibrate(pairs, maxLagDays);
      if (!result) throw new Error("Pares insuficientes para ajustar o modelo.");
      if (!result.publishable) {
        throw new Error(
          `São necessários ao menos ${MIN_CALIBRATION_PAIRS} pares medição/satélite; há ${result.nPairs}.`,
        );
      }

      const { data: current } = await supabase
        .from("height_model_calibration").select("id").eq("active", true);
      for (const row of current ?? []) {
        const { error } = await supabase
          .from("height_model_calibration").update({ active: false }).eq("id", row.id);
        if (error) throw error;
      }

      const version = `v2-campo-${new Date().toISOString().slice(0, 10)}`;
      const { error } = await supabase.from("height_model_calibration").insert({
        model_version: version,
        slope: result.slope,
        intercept: result.intercept,
        n_pairs: result.nPairs,
        mae_cm: result.maeCm,
        rmse_cm: result.rmseCm,
        bias_cm: result.biasCm,
        r2: result.r2,
        residual_sd_cm: result.residualSdCm,
        uncertainty_cm: result.uncertaintyCm,
        max_lag_days: maxLagDays,
        method: "ols + loocv sobre medições de campo pareadas",
        active: true,
        notes: `Incerteza publicada = RMSE de validação cruzada leave-one-out sobre ${result.nPairs} pares.`,
      });
      if (error) throw error;
      return result;
    },
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ["height_model_calibration"] });
      toast.success(`Modelo recalibrado: incerteza ± ${r.uncertaintyCm} cm com ${r.nPairs} pares.`);
    },
    onError: (e: Error) => toast.error(e.message || "Não foi possível recalibrar o modelo."),
  });
};

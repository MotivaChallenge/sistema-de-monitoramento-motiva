import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { IndexKey } from "@/lib/spectral-indices";

export interface ZonalStats {
  mean: number | null;
  median: number | null;
  min: number | null;
  max: number | null;
  stdDev: number | null;
  validPixels: number;
}

export interface Experimental5m {
  metadata: {
    native_resolution_m: number;
    display_resolution_m: number;
    resampling_method: "bilinear" | "nearest";
    is_experimental: boolean;
    creates_new_information: boolean;
    valid_native_pixel_count: number;
  };
  indices: Record<IndexKey, ZonalStats>;
  aviso: string;
}

export interface GeeNdviResult {
  source: string;
  point: { lat: number; lng: number };
  radiusMeters: number;
  periodo: { de: string; ate: string };
  imagens: number;
  hasData: boolean;
  ndvi: number | null;
  alturaEstimadaCm: number | null;
  heightModel: string;
  indices: Record<IndexKey, ZonalStats>;
  quality: {
    cloudMask: string;
    composite: string;
    nativeResolutionM: number;
    saviL: number;
    validPixels: number;
    lowPixelCount: boolean;
  };
  experimental5m: Experimental5m | null;
}

interface Options {
  /** Ativa o modo experimental de grade de 5 m (reamostragem). */
  resample5m?: boolean;
  resamplingMethod?: "bilinear" | "nearest";
}

/** Índices espectrais reais (Sentinel-2 via Google Earth Engine) para um ponto da rodovia. */
export const useGeeNdvi = (lat?: number, lng?: number, enabled = true, options: Options = {}) => {
  const { resample5m = false, resamplingMethod = "bilinear" } = options;
  return useQuery({
    queryKey: ["gee-ndvi", lat, lng, resample5m, resamplingMethod],
    enabled: enabled && Number.isFinite(lat) && Number.isFinite(lng),
    staleTime: 1000 * 60 * 30,
    retry: false,
    queryFn: async (): Promise<GeeNdviResult> => {
      const { data, error } = await supabase.functions.invoke<GeeNdviResult>("gee-ndvi", {
        body: { lat, lng, radius: 150, days: 60, resample5m, resamplingMethod },
      });
      if (error) throw error;
      if (!data) throw new Error("Sem resposta do Earth Engine");
      return data;
    },
  });
};

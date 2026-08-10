import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface GeeNdviResult {
  source: string;
  point: { lat: number; lng: number };
  radiusMeters: number;
  periodo: { de: string; ate: string };
  imagens: number;
  ndvi: number | null;
  alturaEstimadaCm: number | null;
}

/** NDVI real (Sentinel-2 via Google Earth Engine) para um ponto da rodovia. */
export const useGeeNdvi = (lat?: number, lng?: number, enabled = true) =>
  useQuery({
    queryKey: ["gee-ndvi", lat, lng],
    enabled: enabled && Number.isFinite(lat) && Number.isFinite(lng),
    staleTime: 1000 * 60 * 30,
    retry: false,
    queryFn: async (): Promise<GeeNdviResult> => {
      const { data, error } = await supabase.functions.invoke<GeeNdviResult>("gee-ndvi", {
        body: { lat, lng, radius: 150, days: 60 },
      });
      if (error) throw error;
      if (!data) throw new Error("Sem resposta do Earth Engine");
      return data;
    },
  });

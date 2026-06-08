import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface OpenMeteoDay {
  date: string;
  tempMax: number;
  tempMin: number;
  tempAvg: number;
  rainMm: number;
  humidity: number;
  windKmh: number;
  solarRadMj: number;
  growthCmPerDay: number;
}
export interface OpenMeteoResponse {
  source: string;
  location: string;
  horizonDays: number;
  forecast: OpenMeteoDay[];
  summary: { totalRainMm: number; estimatedGrowthCm: number; growthLevel: "baixo" | "moderado" | "alto" };
  fetchedAt: string;
}

export const useOpenMeteo = (days: 7 | 15 | 16 | 30 = 16) =>
  useQuery({
    queryKey: ["open-meteo", days],
    queryFn: async (): Promise<OpenMeteoResponse> => {
      const { data, error } = await supabase.functions.invoke("open-meteo-forecast", {
        body: null,
        method: "GET" as any,
      } as any).catch(async () => {
        // Fallback: chamada direta com query string
        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/open-meteo-forecast?days=${days}`;
        const r = await fetch(url, {
          headers: { Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` },
        });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return { data: await r.json(), error: null };
      });
      if (error) throw error;
      return data as OpenMeteoResponse;
    },
    staleTime: 1000 * 60 * 30,
  });
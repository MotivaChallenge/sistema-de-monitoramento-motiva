import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ForecastDay {
  date: string;
  tempAvg: number;
  humidity: number;
  rainMm: number;
  icon: string;
  description: string;
  growthCmPerDay: number;
}
export interface WeatherResponse {
  location: string;
  forecast: ForecastDay[];
  summary: { totalRainMm: number; estimatedGrowthCm: number; growthLevel: "baixo" | "moderado" | "alto" };
}

export const useWeather = () =>
  useQuery({
    queryKey: ["weather-rodoanel"],
    queryFn: async (): Promise<WeatherResponse> => {
      const { data, error } = await supabase.functions.invoke("weather-rodoanel");
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      return data as WeatherResponse;
    },
    staleTime: 1000 * 60 * 30,
  });
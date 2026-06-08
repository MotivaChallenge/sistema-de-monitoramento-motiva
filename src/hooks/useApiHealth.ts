import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ApiHealthCheck {
  id: string;
  name: string;
  category: "clima" | "satelite" | "geo" | "infra" | "ia";
  status: "online" | "degraded" | "offline";
  latencyMs: number | null;
  detail?: string;
  lastSync: string;
}
export interface ApiHealthResponse {
  checks: ApiHealthCheck[];
  summary: { total: number; online: number; degraded: number; offline: number; generatedAt: string };
}

export const useApiHealth = () =>
  useQuery({
    queryKey: ["api-health"],
    queryFn: async (): Promise<ApiHealthResponse> => {
      const { data, error } = await supabase.functions.invoke("api-health");
      if (error) throw error;
      return data as ApiHealthResponse;
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
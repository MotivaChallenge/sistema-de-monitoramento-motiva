import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Waypoint { lat: number; lng: number }

export interface RoadRouteResult {
  line: [number, number][];
  source: "osrm" | "fallback";
}

/**
 * Snaps waypoints to the road network via the `road-route` edge function,
 * which caches OSRM results in the database so subsequent loads (and users)
 * don't hit the public OSRM demo. Falls back to raw waypoints on error.
 */
export function useRoadRoute(code: string | undefined, waypoints: Waypoint[]) {
  return useQuery({
    queryKey: ["road-route", code, waypoints.length, waypoints[0]?.lat, waypoints.at(-1)?.lat],
    enabled: !!code && waypoints.length >= 2,
    staleTime: 1000 * 60 * 60,
    gcTime: 1000 * 60 * 60 * 6,
    retry: 1,
    queryFn: async (): Promise<RoadRouteResult> => {
      try {
        const { data, error } = await supabase.functions.invoke("road-route", {
          body: { code, waypoints },
        });
        if (error) throw error;
        const line = (data?.line ?? []) as [number, number][];
        const source = (data?.source ?? "fallback") as "osrm" | "fallback";
        if (!line.length) throw new Error("empty route");
        return { line, source };
      } catch {
        return {
          line: waypoints.map(w => [w.lat, w.lng] as [number, number]),
          source: "fallback",
        };
      }
    },
  });
}
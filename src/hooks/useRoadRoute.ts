import { useQuery } from "@tanstack/react-query";

export interface Waypoint { lat: number; lng: number }

export interface RoadRouteResult {
  line: [number, number][];
  source: "osrm" | "fallback";
}

/**
 * Snaps a sequence of waypoints to the actual road network using the public
 * OSRM demo server. Returns the routed geometry as [lat,lng] pairs, or the raw
 * waypoints if the routing service is unavailable.
 *
 * OSRM accepts up to ~100 coordinates per request. We chunk with a 1-point
 * overlap so consecutive legs join seamlessly.
 */
export function useRoadRoute(code: string | undefined, waypoints: Waypoint[]) {
  return useQuery({
    queryKey: ["road-route", code, waypoints.length, waypoints[0]?.lat, waypoints.at(-1)?.lat],
    enabled: !!code && waypoints.length >= 2,
    staleTime: 1000 * 60 * 60,
    gcTime: 1000 * 60 * 60 * 6,
    retry: 1,
    queryFn: async (): Promise<RoadRouteResult> => {
      const CHUNK = 80;
      const out: [number, number][] = [];
      try {
        for (let i = 0; i < waypoints.length - 1; i += CHUNK - 1) {
          const slice = waypoints.slice(i, i + CHUNK);
          if (slice.length < 2) break;
          const coords = slice.map(w => `${w.lng},${w.lat}`).join(";");
          const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`;
          const res = await fetch(url);
          if (!res.ok) throw new Error(`OSRM ${res.status}`);
          const json = await res.json();
          const line: [number, number][] | undefined = json?.routes?.[0]?.geometry?.coordinates?.map(
            (c: [number, number]) => [c[1], c[0]] as [number, number]
          );
          if (!line?.length) throw new Error("empty route");
          if (out.length && line.length) line.shift(); // avoid duplicate join point
          out.push(...line);
        }
        if (!out.length) throw new Error("no segments routed");
        return { line: out, source: "osrm" };
      } catch {
        return {
          line: waypoints.map(w => [w.lat, w.lng] as [number, number]),
          source: "fallback",
        };
      }
    },
  });
}
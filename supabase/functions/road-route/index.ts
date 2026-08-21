import { createClient } from "npm:@supabase/supabase-js@2";
import { requireUser } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Waypoint { lat: number; lng: number }
interface Body { code: string; waypoints: Waypoint[] }

const CHUNK = 80;

async function hashWaypoints(code: string, wp: Waypoint[]) {
  const enc = new TextEncoder().encode(
    code + "|" + wp.map(w => `${w.lat.toFixed(5)},${w.lng.toFixed(5)}`).join(";")
  );
  const buf = await crypto.subtle.digest("SHA-256", enc);
  return Array.from(new Uint8Array(buf)).slice(0, 16)
    .map(b => b.toString(16).padStart(2, "0")).join("");
}

async function fetchFromOsrm(wp: Waypoint[]): Promise<[number, number][]> {
  const out: [number, number][] = [];
  for (let i = 0; i < wp.length - 1; i += CHUNK - 1) {
    const slice = wp.slice(i, i + CHUNK);
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
    if (out.length && line.length) line.shift();
    out.push(...line);
  }
  if (!out.length) throw new Error("no segments routed");
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // Exige sessão válida antes de rotear/escrever no cache (chamada externa + gravação).
    const auth = await requireUser(req);
    if (auth.response) return auth.response;

    const body = (await req.json()) as Body;
    const code = String(body?.code ?? "").trim();
    const waypoints = Array.isArray(body?.waypoints) ? body.waypoints : [];
    if (!code || waypoints.length < 2) {
      return new Response(JSON.stringify({ error: "code + at least 2 waypoints required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const key = await hashWaypoints(code, waypoints);

    const { data: cached } = await supabase
      .from("road_route_cache")
      .select("line, source")
      .eq("code", code)
      .eq("waypoints_hash", key)
      .maybeSingle();

    if (cached) {
      return new Response(JSON.stringify({ line: cached.line, source: cached.source, cached: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let line: [number, number][];
    let source: "osrm" | "fallback";
    try {
      line = await fetchFromOsrm(waypoints);
      source = "osrm";
    } catch {
      line = waypoints.map(w => [w.lat, w.lng] as [number, number]);
      source = "fallback";
    }

    // Persist only OSRM hits — waypoint fallback can retry later.
    if (source === "osrm") {
      await supabase.from("road_route_cache").upsert(
        { code, waypoints_hash: key, line, source },
        { onConflict: "code,waypoints_hash" }
      );
    }

    return new Response(JSON.stringify({ line, source, cached: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface Check {
  id: string;
  name: string;
  category: "clima" | "satelite" | "geo" | "infra" | "ia";
  status: "online" | "degraded" | "offline";
  latencyMs: number | null;
  detail?: string;
  lastSync: string;
}

async function timed<T>(fn: () => Promise<T>): Promise<{ ms: number; res?: T; err?: string }> {
  const t0 = Date.now();
  try {
    const res = await fn();
    return { ms: Date.now() - t0, res };
  } catch (e) {
    return { ms: Date.now() - t0, err: e instanceof Error ? e.message : "err" };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const now = new Date().toISOString();
  const checks: Check[] = [];

  // 1) OpenWeather
  const owKey = Deno.env.get("OPENWEATHER_API");
  const ow = await timed(async () => {
    if (!owKey) throw new Error("OPENWEATHER_API ausente");
    const r = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=-23.5&lon=-46.85&appid=${owKey}`);
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    await r.json();
  });
  checks.push({
    id: "openweather", name: "OpenWeather API", category: "clima",
    status: ow.err ? "offline" : ow.ms > 1500 ? "degraded" : "online",
    latencyMs: ow.ms, detail: ow.err, lastSync: now,
  });

  // 2) Open-Meteo
  const om = await timed(async () => {
    const r = await fetch("https://api.open-meteo.com/v1/forecast?latitude=-23.5&longitude=-46.85&daily=temperature_2m_max&forecast_days=1&timezone=America%2FSao_Paulo");
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    await r.json();
  });
  checks.push({
    id: "openmeteo", name: "Open-Meteo (7/15/30d)", category: "clima",
    status: om.err ? "offline" : om.ms > 1500 ? "degraded" : "online",
    latencyMs: om.ms, detail: om.err, lastSync: now,
  });

  // 3) NASA POWER
  const np = await timed(async () => {
    const r = await fetch("https://power.larc.nasa.gov/api/temporal/daily/point?parameters=ALLSKY_SFC_SW_DWN&community=AG&latitude=-23.5&longitude=-46.85&start=20240101&end=20240107&format=JSON");
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    await r.json();
  });
  checks.push({
    id: "nasa_power", name: "NASA POWER", category: "satelite",
    status: np.err ? "offline" : np.ms > 2500 ? "degraded" : "online",
    latencyMs: np.ms, detail: np.err, lastSync: now,
  });

  // 4) OpenStreetMap tiles
  const osm = await timed(async () => {
    const r = await fetch("https://tile.openstreetmap.org/10/512/384.png", { method: "HEAD" });
    if (!r.ok && r.status !== 405) throw new Error(`HTTP ${r.status}`);
  });
  checks.push({
    id: "osm", name: "OpenStreetMap Tiles", category: "geo",
    status: osm.err ? "offline" : osm.ms > 1500 ? "degraded" : "online",
    latencyMs: osm.ms, detail: osm.err, lastSync: now,
  });

  // 5) Banco de Dados Lovable Cloud
  const db = await timed(async () => {
    const url = Deno.env.get("SUPABASE_URL")!;
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(url, key);
    const { error } = await sb.from("segments").select("id", { count: "exact", head: true });
    if (error) throw error;
  });
  checks.push({
    id: "database", name: "Banco de Dados (Lovable Cloud)", category: "infra",
    status: db.err ? "offline" : db.ms > 800 ? "degraded" : "online",
    latencyMs: db.ms, detail: db.err, lastSync: now,
  });

  // 6) Motor preditivo / Lovable AI
  const aiKey = Deno.env.get("LOVABLE_API_KEY");
  checks.push({
    id: "ai_engine", name: "Motor Preditivo (Lovable AI)", category: "ia",
    status: aiKey ? "online" : "offline",
    latencyMs: aiKey ? 1 : null,
    detail: aiKey ? undefined : "LOVABLE_API_KEY ausente",
    lastSync: now,
  });

  const summary = {
    total: checks.length,
    online: checks.filter(c => c.status === "online").length,
    degraded: checks.filter(c => c.status === "degraded").length,
    offline: checks.filter(c => c.status === "offline").length,
    generatedAt: now,
  };
  return new Response(JSON.stringify({ checks, summary }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
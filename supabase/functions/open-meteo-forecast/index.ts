import { corsHeaders } from "../_shared/cors.ts";

// Open-Meteo: API gratuita, sem chave. Cobertura: 7/15/30 dias.
const LAT = -23.5;
const LON = -46.85;

const log = (level: "info" | "warn" | "error", event: string, data: Record<string, unknown> = {}) => {
  console.log(JSON.stringify({ level, event, fn: "open-meteo-forecast", ts: new Date().toISOString(), ...data }));
};

const CACHE_TTL_MS = 30 * 60 * 1000;
const cache = new Map<number, { at: number; payload: unknown }>();

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const started = Date.now();
  const requestId = crypto.randomUUID();
  try {
    const url = new URL(req.url);
    const daysParam = Number(url.searchParams.get("days") ?? "16");
    const days = [7, 15, 16, 30].includes(daysParam) ? daysParam : 16;

    const cached = cache.get(days);
    if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
      return new Response(JSON.stringify(cached.payload), {
        headers: { ...corsHeaders, "Content-Type": "application/json", "x-cache": "HIT" },
      });
    }

    const apiUrl =
      `https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}` +
      `&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,relative_humidity_2m_mean,wind_speed_10m_max,shortwave_radiation_sum` +
      `&timezone=America%2FSao_Paulo&forecast_days=${days}`;
    log("info", "openmeteo_request", { requestId, days });
    const r = await fetch(apiUrl);
    if (!r.ok) {
      const body = await r.text();
      throw new Error(`Open-Meteo ${r.status}: ${body.slice(0, 400)}`);
    }
    const data = await r.json();
    const d = data.daily ?? {};
    const forecast = (d.time ?? []).map((date: string, i: number) => {
      const tMax = d.temperature_2m_max?.[i] ?? 0;
      const tMin = d.temperature_2m_min?.[i] ?? 0;
      const tAvg = (tMax + tMin) / 2;
      const rain = d.precipitation_sum?.[i] ?? 0;
      const hum = d.relative_humidity_2m_mean?.[i] ?? 60;
      const wind = d.wind_speed_10m_max?.[i] ?? 0;
      const rad = d.shortwave_radiation_sum?.[i] ?? 0;
      // Modelo de crescimento (cm/dia) ponderando radiação solar e demais variáveis.
      const growthCmPerDay = Math.max(
        0,
        0.25 +
          rain * 0.035 +
          Math.max(0, tAvg - 15) * 0.018 +
          Math.max(0, hum - 60) * 0.004 +
          rad * 0.008,
      );
      return {
        date,
        tempMax: Number(tMax.toFixed(1)),
        tempMin: Number(tMin.toFixed(1)),
        tempAvg: Number(tAvg.toFixed(1)),
        rainMm: Number(rain.toFixed(1)),
        humidity: Math.round(hum),
        windKmh: Number(wind.toFixed(1)),
        solarRadMj: Number(rad.toFixed(1)),
        growthCmPerDay: Number(growthCmPerDay.toFixed(2)),
      };
    });
    const totalRain = forecast.reduce((a: number, x: any) => a + x.rainMm, 0);
    const totalGrowth = forecast.reduce((a: number, x: any) => a + x.growthCmPerDay, 0);
    const payload = {
      source: "Open-Meteo",
      location: "Rodoanel SP-021",
      lat: LAT,
      lon: LON,
      horizonDays: forecast.length,
      forecast,
      summary: {
        totalRainMm: Number(totalRain.toFixed(1)),
        estimatedGrowthCm: Number(totalGrowth.toFixed(1)),
        growthLevel: totalGrowth > 25 ? "alto" : totalGrowth > 12 ? "moderado" : "baixo",
      },
      fetchedAt: new Date().toISOString(),
      latencyMs: Date.now() - started,
    };
    cache.set(days, { at: Date.now(), payload });
    return new Response(JSON.stringify(payload), {
      headers: { ...corsHeaders, "Content-Type": "application/json", "x-cache": "MISS" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    log("error", "request_failed", { requestId, error: msg });
    return new Response(JSON.stringify({ error: msg, requestId }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
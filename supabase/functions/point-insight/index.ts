import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const log = (level: "info" | "warn" | "error", event: string, data: Record<string, unknown> = {}) => {
  console.log(JSON.stringify({ level, event, fn: "point-insight", ts: new Date().toISOString(), ...data }));
};

// Cache simples por bucket de coordenadas (~1km), TTL 10min
const CACHE_TTL_MS = 10 * 60 * 1000;
const cache = new Map<string, { at: number; payload: unknown }>();

const bucketKey = (lat: number, lon: number) =>
  `${lat.toFixed(2)}_${lon.toFixed(2)}`;

const haversineKm = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const requestId = crypto.randomUUID();
  const started = Date.now();

  try {
    const body = await req.json().catch(() => ({}));
    const lat = Number(body.lat);
    const lng = Number(body.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return new Response(JSON.stringify({ error: "lat/lng inválidos" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    log("info", "request_received", { requestId, lat, lng });

    const cacheK = bucketKey(lat, lng);
    const cached = cache.get(cacheK);
    if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
      log("info", "cache_hit", { requestId, ageMs: Date.now() - cached.at });
      return new Response(JSON.stringify(cached.payload), {
        headers: { ...corsHeaders, "Content-Type": "application/json", "x-cache": "HIT" },
      });
    }

    // 1. Clima (OpenWeather forecast 5 dias / 3h)
    const apiKey = Deno.env.get("OPENWEATHER_API");
    if (!apiKey) throw new Error("OPENWEATHER_API not configured");
    const wUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lng}&units=metric&lang=pt_br&appid=${apiKey}`;
    const wRes = await fetch(wUrl);
    if (!wRes.ok) throw new Error(`OpenWeather ${wRes.status}`);
    const wData = await wRes.json();

    // Próximas 24h: temp média, chuva total, descrição predominante
    const next24 = (wData.list ?? []).slice(0, 8) as any[];
    const tempAvg = next24.reduce((a, x) => a + x.main.temp, 0) / Math.max(1, next24.length);
    const humidityAvg = next24.reduce((a, x) => a + x.main.humidity, 0) / Math.max(1, next24.length);
    const rainNext24 = next24.reduce((a, x) => a + (x.rain?.["3h"] ?? 0), 0);
    const rain5d = (wData.list ?? []).reduce((a: number, x: any) => a + (x.rain?.["3h"] ?? 0), 0);
    const current = next24[0];

    const weather = {
      location: wData.city?.name ?? "Rodoanel SP-021",
      tempC: Number((current?.main?.temp ?? tempAvg).toFixed(1)),
      tempAvg24: Number(tempAvg.toFixed(1)),
      humidity: Math.round(humidityAvg),
      description: current?.weather?.[0]?.description ?? "—",
      icon: current?.weather?.[0]?.icon ?? "01d",
      rainNext24Mm: Number(rainNext24.toFixed(1)),
      rain5dMm: Number(rain5d.toFixed(1)),
    };

    // 2. Segmento mais próximo (raio ~1km)
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    const { data: markers } = await supabase.from("km_markers").select("km_value,lat,lng");
    let nearestKm: number | null = null;
    let nearestDistKm = Infinity;
    for (const m of markers ?? []) {
      const d = haversineKm({ lat, lng }, { lat: Number(m.lat), lng: Number(m.lng) });
      if (d < nearestDistKm) { nearestDistKm = d; nearestKm = Number(m.km_value); }
    }

    let nearestSegment: any = null;
    if (nearestKm != null) {
      const { data: segs } = await supabase
        .from("segments")
        .select("id, km, tipo, ndvi, altura, limite, status, ultima_rocada, km_start, km_end")
        .lte("km_start", nearestKm + 0.5)
        .gte("km_end", nearestKm - 0.5)
        .limit(1);
      nearestSegment = segs?.[0] ?? null;
    }

    // 3. AI insight (Lovable AI Gateway)
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    let insight: { resumo: string; risco: "baixo" | "moderado" | "alto" | "critico"; recomendacao: string } | null = null;
    if (LOVABLE_API_KEY) {
      const aiPayload = {
        ponto: { lat, lng, kmProximo: nearestKm, distanciaKm: Number(nearestDistKm.toFixed(2)) },
        clima: weather,
        segmento: nearestSegment ? {
          id: nearestSegment.id, km: nearestSegment.km, tipo: nearestSegment.tipo,
          ndvi: Number(nearestSegment.ndvi), alturaCm: nearestSegment.altura, limiteCm: nearestSegment.limite,
          status: nearestSegment.status, ultimaRocada: nearestSegment.ultima_rocada,
        } : null,
      };
      const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: "Você é um especialista em manutenção de vegetação rodoviária. Responda SEMPRE em pt-BR, técnico e direto. Use a ferramenta point_insight." },
            { role: "user", content: `Analise este ponto do Rodoanel:\n${JSON.stringify(aiPayload, null, 2)}\n\nGere insight operacional curto.` },
          ],
          tools: [{
            type: "function",
            function: {
              name: "point_insight",
              description: "Insight operacional para um ponto específico do Rodoanel.",
              parameters: {
                type: "object",
                properties: {
                  resumo: { type: "string", description: "1-2 frases relacionando clima e estado da vegetação no ponto." },
                  risco: { type: "string", enum: ["baixo", "moderado", "alto", "critico"] },
                  recomendacao: { type: "string", description: "1 frase de ação operacional (ex: agendar roçada, reinspecionar, etc)." },
                },
                required: ["resumo", "risco", "recomendacao"],
                additionalProperties: false,
              },
            },
          }],
          tool_choice: { type: "function", function: { name: "point_insight" } },
        }),
      });
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de IA atingido. Tente em instantes." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos da IA esgotados." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiRes.ok) {
        const aiJson = await aiRes.json();
        const args = aiJson.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
        if (args) insight = JSON.parse(args);
      } else {
        log("warn", "ai_non_ok", { requestId, status: aiRes.status });
      }
    }

    const payload = {
      point: { lat, lng },
      weather,
      nearest: nearestSegment ? {
        segmentId: nearestSegment.id,
        km: nearestSegment.km,
        status: nearestSegment.status,
        distanceKm: Number(nearestDistKm.toFixed(2)),
      } : null,
      insight,
      generated_at: new Date().toISOString(),
    };
    cache.set(cacheK, { at: Date.now(), payload });
    log("info", "request_success", { requestId, durationMs: Date.now() - started, hasInsight: !!insight });
    return new Response(JSON.stringify(payload), {
      headers: { ...corsHeaders, "Content-Type": "application/json", "x-cache": "MISS" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    log("error", "request_failed", { requestId, error: msg });
    return new Response(JSON.stringify({ error: msg, requestId }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

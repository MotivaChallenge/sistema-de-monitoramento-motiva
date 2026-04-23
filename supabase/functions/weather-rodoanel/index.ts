import { corsHeaders } from "../_shared/cors.ts";

// Centro aproximado do Rodoanel Oeste (SP-021)
const LAT = -23.5;
const LON = -46.85;

const log = (level: "info" | "warn" | "error", event: string, data: Record<string, unknown> = {}) => {
  console.log(JSON.stringify({ level, event, fn: "weather-rodoanel", ts: new Date().toISOString(), ...data }));
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const startedAt = Date.now();
  const requestId = crypto.randomUUID();
  log("info", "request_received", { requestId, method: req.method });

  try {
    const apiKey = Deno.env.get("OPENWEATHER_API");
    if (!apiKey) {
      log("error", "missing_secret", { requestId, secret: "OPENWEATHER_API" });
      throw new Error("OPENWEATHER_API not configured");
    }

    const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${LAT}&lon=${LON}&units=metric&lang=pt_br&appid=${apiKey}`;
    log("info", "openweather_request", { requestId, lat: LAT, lon: LON });
    const r = await fetch(url);
    if (!r.ok) {
      const body = await r.text();
      log("error", "openweather_error", {
        requestId,
        status: r.status,
        statusText: r.statusText,
        body: body.slice(0, 1000),
      });
      throw new Error(`OpenWeather ${r.status}: ${body}`);
    }
    const data = await r.json();
    log("info", "openweather_ok", {
      requestId,
      city: data.city?.name,
      items: Array.isArray(data.list) ? data.list.length : 0,
    });

    // Agrupa por dia (próximos 5 dias)
    const byDay = new Map<string, { tempSum: number; tempCount: number; rainMm: number; humSum: number; humCount: number; icon: string; desc: string }>();
    for (const item of data.list as any[]) {
      const day = item.dt_txt.slice(0, 10);
      const cur = byDay.get(day) ?? { tempSum: 0, tempCount: 0, rainMm: 0, humSum: 0, humCount: 0, icon: item.weather[0].icon, desc: item.weather[0].description };
      cur.tempSum += item.main.temp;
      cur.tempCount += 1;
      cur.humSum += item.main.humidity;
      cur.humCount += 1;
      cur.rainMm += (item.rain?.["3h"] ?? 0);
      // Pega ícone do meio-dia se disponível
      if (item.dt_txt.includes("12:00:00")) {
        cur.icon = item.weather[0].icon;
        cur.desc = item.weather[0].description;
      }
      byDay.set(day, cur);
    }

    const forecast = Array.from(byDay.entries()).slice(0, 5).map(([date, v]) => {
      const tempAvg = v.tempSum / v.tempCount;
      const humAvg = v.humSum / v.humCount;
      // Modelo simples de crescimento da vegetação (cm/dia):
      // Base 0.3 cm/dia, +0.04 por mm de chuva, +0.015 por °C acima de 15°C, +0.005 por % umidade acima de 60.
      const growthCmPerDay = Math.max(
        0,
        0.3 + v.rainMm * 0.04 + Math.max(0, tempAvg - 15) * 0.015 + Math.max(0, humAvg - 60) * 0.005
      );
      return {
        date,
        tempAvg: Number(tempAvg.toFixed(1)),
        humidity: Math.round(humAvg),
        rainMm: Number(v.rainMm.toFixed(1)),
        icon: v.icon,
        description: v.desc,
        growthCmPerDay: Number(growthCmPerDay.toFixed(2)),
      };
    });

    const totalRain = forecast.reduce((a, d) => a + d.rainMm, 0);
    const totalGrowth = forecast.reduce((a, d) => a + d.growthCmPerDay, 0);

    log("info", "request_success", {
      requestId,
      durationMs: Date.now() - startedAt,
      days: forecast.length,
      totalRainMm: Number(totalRain.toFixed(1)),
      estimatedGrowthCm: Number(totalGrowth.toFixed(1)),
    });

    return new Response(
      JSON.stringify({
        location: data.city?.name ?? "Rodoanel SP-021",
        forecast,
        summary: {
          totalRainMm: Number(totalRain.toFixed(1)),
          estimatedGrowthCm: Number(totalGrowth.toFixed(1)),
          growthLevel: totalGrowth > 5 ? "alto" : totalGrowth > 3 ? "moderado" : "baixo",
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    log("error", "request_failed", {
      requestId,
      durationMs: Date.now() - startedAt,
      error: msg,
      stack: e instanceof Error ? e.stack : undefined,
    });
    return new Response(JSON.stringify({ error: msg, requestId }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
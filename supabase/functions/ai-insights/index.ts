import { corsHeaders } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const log = (level: "info" | "error", event: string, data: Record<string, unknown> = {}) => {
  console.log(JSON.stringify({ level, event, fn: "ai-insights", ts: new Date().toISOString(), ...data }));
};

const SYSTEM_PROMPT = `Você é um especialista em manutenção de vegetação rodoviária do Rodoanel Mário Covas (SP-021).
Analise dados de NDVI, altura da vegetação, conformidade ARTESP e previsão do tempo para gerar insights operacionais.
Seja direto, técnico e prático. Responda SEMPRE em português do Brasil.
Use a ferramenta generate_insights para retornar a análise estruturada.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const requestId = crypto.randomUUID();
  const started = Date.now();

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    // Parse filtros opcionais do body
    let filters: { statuses?: string[]; kmStart?: number; kmEnd?: number } = {};
    if (req.method === "POST") {
      try { filters = await req.json(); } catch { /* sem body */ }
    }
    const allowedStatuses = ["critico", "atencao", "conforme"] as const;
    const statuses = Array.isArray(filters.statuses)
      ? filters.statuses.filter((s) => (allowedStatuses as readonly string[]).includes(s))
      : [];
    const kmStart = typeof filters.kmStart === "number" ? filters.kmStart : undefined;
    const kmEnd = typeof filters.kmEnd === "number" ? filters.kmEnd : undefined;

    // 1. Buscar segmentos (com filtros)
    let q = supabase
      .from("segments")
      .select("id, km, km_start, km_end, tipo, ndvi, altura, limite, status, ultima_rocada")
      .order("km_start");
    if (statuses.length) q = q.in("status", statuses);
    if (kmStart !== undefined) q = q.gte("km_end", kmStart);
    if (kmEnd !== undefined) q = q.lte("km_start", kmEnd);
    const { data: segments, error: segErr } = await q;
    if (segErr) throw segErr;
    log("info", "filters_applied", { requestId, statuses, kmStart, kmEnd, matched: segments?.length ?? 0 });

    // 2. Buscar clima (chama a outra função)
    let weather: any = null;
    try {
      const wRes = await fetch(`${SUPABASE_URL}/functions/v1/weather-rodoanel`, {
        method: "POST",
        headers: { Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json" },
      });
      if (wRes.ok) weather = await wRes.json();
    } catch (e) {
      log("error", "weather_fetch_failed", { requestId, error: String(e) });
    }

    const total = segments?.length ?? 0;
    const criticos = segments?.filter((s: any) => s.status === "critico").length ?? 0;
    const atencao = segments?.filter((s: any) => s.status === "atencao").length ?? 0;
    const conformes = segments?.filter((s: any) => s.status === "conforme").length ?? 0;
    const ndviAvg = total ? segments!.reduce((a: number, s: any) => a + Number(s.ndvi), 0) / total : 0;
    const alturaMax = segments?.reduce((a: number, s: any) => Math.max(a, s.altura), 0) ?? 0;

    const userPayload = {
      filtrosAplicados: { statuses, kmStart, kmEnd },
      resumo: { total, criticos, atencao, conformes, ndviMedio: Number(ndviAvg.toFixed(2)), alturaMaxCm: alturaMax },
      criticosTop: segments?.filter((s: any) => s.status === "critico").slice(0, 8),
      clima: weather ? {
        local: weather.location,
        chuva5dMm: weather.summary?.totalRainMm,
        crescimento5dCm: weather.summary?.estimatedGrowthCm,
        nivelCrescimento: weather.summary?.growthLevel,
        previsao: weather.forecast?.map((f: any) => ({
          data: f.date, tempC: f.tempAvg, chuvaMm: f.rainMm, crescimentoCmDia: f.growthCmPerDay,
        })),
      } : null,
    };

    log("info", "calling_ai", { requestId, segments: total, hasWeather: !!weather });

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `Dados atuais do Rodoanel:\n${JSON.stringify(userPayload, null, 2)}\n\nGere insights operacionais para a equipe de roçada.` },
        ],
        tools: [{
          type: "function",
          function: {
            name: "generate_insights",
            description: "Gera insights estruturados sobre vegetação e operação de roçada.",
            parameters: {
              type: "object",
              properties: {
                summary: { type: "string", description: "Resumo executivo em 2-3 frases sobre a situação atual." },
                priority: { type: "string", enum: ["baixa", "media", "alta", "critica"], description: "Prioridade geral da operação." },
                weather_impact: { type: "string", description: "Análise de como o clima previsto vai afetar o crescimento e a janela de operação." },
                recommendations: {
                  type: "array",
                  description: "3 a 5 recomendações operacionais acionáveis.",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string" },
                      description: { type: "string" },
                      urgency: { type: "string", enum: ["baixa", "media", "alta"] },
                      target_segments: { type: "array", items: { type: "string" }, description: "IDs dos segmentos relacionados (opcional)." },
                    },
                    required: ["title", "description", "urgency"],
                    additionalProperties: false,
                  },
                },
                risks: { type: "array", items: { type: "string" }, description: "Principais riscos identificados (descumprimento ARTESP, segurança, etc)." },
              },
              required: ["summary", "priority", "weather_impact", "recommendations", "risks"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "generate_insights" } },
      }),
    });

    if (!aiRes.ok) {
      const body = await aiRes.text();
      log("error", "ai_error", { requestId, status: aiRes.status, body: body.slice(0, 500) });
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: "Limite de requisições da IA atingido. Tente em instantes." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos da IA esgotados. Adicione créditos em Settings → Workspace → Usage." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway ${aiRes.status}`);
    }

    const aiJson = await aiRes.json();
    const toolCall = aiJson.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) throw new Error("AI did not return tool call");
    const insights = JSON.parse(toolCall.function.arguments);

    log("info", "request_success", { requestId, durationMs: Date.now() - started, priority: insights.priority });

    return new Response(JSON.stringify({
      insights,
      generated_at: new Date().toISOString(),
      context: { segments: total, criticos, atencao, conformes, ndviMedio: Number(ndviAvg.toFixed(2)), weather: !!weather },
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    log("error", "request_failed", { requestId, error: msg, stack: e instanceof Error ? e.stack : undefined });
    return new Response(JSON.stringify({ error: msg, requestId }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
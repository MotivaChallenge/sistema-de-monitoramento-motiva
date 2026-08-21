import { corsHeaders } from "../_shared/cors.ts";
import { requireUser } from "../_shared/auth.ts";

const log = (level: "info" | "error", event: string, data: Record<string, unknown> = {}) => {
  console.log(JSON.stringify({ level, event, fn: "vision-detect", ts: new Date().toISOString(), ...data }));
};

const SYSTEM_PROMPT = `Você é um sistema de visão computacional especializado em inspeção de rodovias brasileiras (Rodoanel SP-021).
Sua função é equivalente a um YOLOv8x customizado: detectar objetos relevantes para manutenção de vegetação e segurança viária em imagens de satélite, drone ou fotografias terrestres.

CLASSES DE INTERESSE:
- Vegetação: vegetacao_alta (>30cm acostamento), vegetacao_moderada (10-30cm), vegetacao_baixa (<10cm), arvore_proxima_pista, arvore_caida
- Estrutura: defensa_metalica, placa_sinalizacao, poste, mureta, guard_rail, drenagem
- Veículos: carro, caminhao, moto, onibus
- Risco: animal_silvestre, pessoa_pista, lixo_acostamento, erosao, buraco

REGRAS:
1. Coordenadas bbox em PERCENTUAIS (0-100) relativos à imagem (x = left, y = top, w = width, h = height).
2. Confidence: estime de forma realista (0.30 a 0.98) com base na clareza visual.
3. Detecte apenas o que está claramente visível — não invente.
4. Máximo 25 detecções por imagem, priorizando os itens mais críticos.
5. Para vegetação, estime altura relativa observando sombra, defensa metálica (~75cm) ou postes como referência.

Retorne SEMPRE via tool call road_vision_detect.`;

const TOOL = {
  type: "function",
  function: {
    name: "road_vision_detect",
    description: "Retorna detecções tipo YOLO + análise consolidada da imagem rodoviária.",
    parameters: {
      type: "object",
      properties: {
        scene: {
          type: "string",
          description: "Tipo de imagem: aerea_satelite, drone, terrestre_pista, terrestre_acostamento, indefinido.",
          enum: ["aerea_satelite", "drone", "terrestre_pista", "terrestre_acostamento", "indefinido"],
        },
        description: { type: "string", description: "Descrição técnica da cena em 1-2 frases." },
        detections: {
          type: "array",
          description: "Lista de objetos detectados (máx 25).",
          items: {
            type: "object",
            properties: {
              class: { type: "string", description: "Classe do objeto (ex: vegetacao_alta, defensa_metalica)." },
              category: { type: "string", enum: ["vegetacao", "estrutura", "veiculo", "risco"] },
              confidence: { type: "number", description: "0.0 a 1.0" },
              bbox: {
                type: "object",
                properties: {
                  x: { type: "number" }, y: { type: "number" }, w: { type: "number" }, h: { type: "number" },
                },
                required: ["x", "y", "w", "h"], additionalProperties: false,
              },
              note: { type: "string", description: "Observação técnica curta sobre este objeto." },
            },
            required: ["class", "category", "confidence", "bbox"], additionalProperties: false,
          },
        },
        vegetation_summary: {
          type: "object",
          properties: {
            estimated_height_cm: { type: "number", description: "Altura estimada média da vegetação no acostamento." },
            density: { type: "string", enum: ["baixa", "media", "alta"] },
            artesp_level: { type: "integer", enum: [1, 2, 3], description: "1=<10cm, 2=10-30cm, 3=>30cm" },
          },
          required: ["estimated_height_cm", "density", "artesp_level"], additionalProperties: false,
        },
        risk_level: { type: "string", enum: ["baixo", "moderado", "alto", "critico"] },
        recommendation: { type: "string", description: "Recomendação operacional acionável em 1-2 frases." },
      },
      required: ["scene", "description", "detections", "vegetation_summary", "risk_level", "recommendation"],
      additionalProperties: false,
    },
  },
} as const;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const requestId = crypto.randomUUID();
  const started = Date.now();

  try {
    // Exige sessão válida antes de qualquer chamada paga ao gateway de IA.
    const auth = await requireUser(req);
    if (auth.response) return auth.response;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const body = await req.json().catch(() => ({}));
    const imageUrl: string | undefined = body.imageUrl ?? body.image_url ?? body.image;
    const context: string | undefined = body.context;
    const model: string = body.model || "google/gemini-2.5-pro";

    if (!imageUrl || typeof imageUrl !== "string") {
      return new Response(JSON.stringify({ error: "imageUrl obrigatório (data: URL base64 ou https://)" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    log("info", "vision_request", { requestId, model, hasContext: !!context, urlKind: imageUrl.startsWith("data:") ? "base64" : "url" });

    const userText = `Analise a imagem e retorne todas as detecções relevantes. ${context ? `Contexto adicional: ${context}` : ""}`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              { type: "text", text: userText },
              { type: "image_url", image_url: { url: imageUrl } },
            ],
          },
        ],
        tools: [TOOL],
        tool_choice: { type: "function", function: { name: "road_vision_detect" } },
      }),
    });

    if (!aiRes.ok) {
      const text = await aiRes.text();
      log("error", "ai_error", { requestId, status: aiRes.status, body: text.slice(0, 400) });
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
    if (!toolCall?.function?.arguments) throw new Error("AI não retornou tool call");
    const result = JSON.parse(toolCall.function.arguments);

    // Contagens auxiliares
    const counts = {
      total: result.detections?.length ?? 0,
      vegetacao: result.detections?.filter((d: any) => d.category === "vegetacao").length ?? 0,
      estrutura: result.detections?.filter((d: any) => d.category === "estrutura").length ?? 0,
      veiculo: result.detections?.filter((d: any) => d.category === "veiculo").length ?? 0,
      risco: result.detections?.filter((d: any) => d.category === "risco").length ?? 0,
    };

    log("info", "vision_success", { requestId, durationMs: Date.now() - started, ...counts, risk: result.risk_level });

    return new Response(JSON.stringify({
      ...result,
      counts,
      model,
      generated_at: new Date().toISOString(),
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    log("error", "request_failed", { requestId, error: msg });
    return new Response(JSON.stringify({ error: msg, requestId }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
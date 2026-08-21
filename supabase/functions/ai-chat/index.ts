import { corsHeaders } from "../_shared/cors.ts";
import { requireUser } from "../_shared/auth.ts";

interface ChatContext {
  criticos?: number;
  total?: number;
  ircAvg?: number;
  rain5d?: number;
  alerts?: number;
  coverageKm?: number;
  teamsAvailable?: number;
  teamsTotal?: number;
  pendingOrders?: number;
  topSegments?: { km: string; tipo: string; status: string; altura: number; limite: number; irc: number }[];
}

interface Msg { role: "user" | "assistant"; content: string }

const SYSTEM = `Você é o assistente operacional de um sistema de monitoramento de vegetação rodoviária.
Responda SEMPRE em português do Brasil, de forma direta, técnica e acionável (máximo 4 frases ou uma lista curta).
Use exclusivamente os dados de contexto fornecidos; se algo não estiver no contexto, diga que não há esse dado no painel.
Considere: IRC acima de 75 indica risco alto de descumprimento contratual; chuva acumulada acelera o crescimento da vegetação.`;

const sanitize = (v: unknown, max = 2000) =>
  typeof v === "string" ? v.slice(0, max) : "";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // Exige sessão válida antes de qualquer chamada paga ao gateway de IA.
    const auth = await requireUser(req);
    if (auth.response) return auth.response;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY não configurada");

    const body = await req.json().catch(() => ({}));
    const question = sanitize(body?.question);
    if (!question.trim()) {
      return new Response(JSON.stringify({ error: "Pergunta vazia." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const context: ChatContext = typeof body?.context === "object" && body.context ? body.context : {};
    const history: Msg[] = Array.isArray(body?.history)
      ? body.history
          .filter((m: any) => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
          .slice(-8)
          .map((m: any) => ({ role: m.role, content: sanitize(m.content, 1200) }))
      : [];

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3.6-flash",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "system", content: `Contexto atual do painel (JSON):\n${JSON.stringify(context)}` },
          ...history,
          { role: "user", content: question },
        ],
      }),
    });

    if (!aiRes.ok) {
      const text = await aiRes.text();
      console.error("ai-chat gateway error", aiRes.status, text.slice(0, 400));
      if (aiRes.status === 429) {
        return new Response(JSON.stringify({ error: "Muitas perguntas em sequência. Tente novamente em instantes." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (aiRes.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados. Adicione créditos ao workspace." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway ${aiRes.status}`);
    }

    const json = await aiRes.json();
    const answer = json?.choices?.[0]?.message?.content;
    if (!answer) throw new Error("Resposta vazia da IA");

    return new Response(JSON.stringify({ answer }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro desconhecido";
    console.error("ai-chat failed", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
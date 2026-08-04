import { useEffect, useRef, useState } from "react";
import { Bot, Send, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
}

export interface AIChatContext {
  criticos: number;
  total: number;
  ircAvg: number;
  rain5d: number;
  alerts: number;
  coverageKm?: number;
  teamsAvailable?: number;
  teamsTotal?: number;
  pendingOrders?: number;
  topSegments?: { km: string; tipo: string; status: string; altura: number; limite: number; irc: number }[];
}

/** Resposta local usada apenas quando a IA está indisponível. */
const offlineAnswer = (question: string, ctx: AIChatContext): string => {
  const q = question.toLowerCase();
  if (q.includes("chuva") || q.includes("clima") || q.includes("tempo"))
    return `A previsão acumulada para os próximos 5 dias é de ${ctx.rain5d} mm. Com esse volume o crescimento da vegetação acelera — antecipe a roçada dos trechos em atenção.`;
  if (q.includes("crítico") || q.includes("critico") || q.includes("risco"))
    return `Hoje há ${ctx.criticos} trecho(s) crítico(s) de ${ctx.total} monitorados. Comece pelos trechos com IRC acima de 75, listados no bloco "Trechos prioritários".`;
  if (q.includes("irc"))
    return `O IRC médio da malha está em ${ctx.ircAvg}/100. Acima de 75 o risco de descumprimento contratual é alto.`;
  if (q.includes("equipe"))
    return "Consulte o bloco Equipes: priorize as disponíveis com menor tempo de deslocamento até o trecho crítico mais próximo.";
  if (q.includes("alerta"))
    return `Existem ${ctx.alerts} alerta(s) ativo(s). Os três mais recentes aparecem no painel lateral do dashboard.`;
  return `Resumo operacional: ${ctx.criticos} trecho(s) crítico(s), IRC médio ${ctx.ircAvg}/100, ${ctx.rain5d} mm de chuva previstos e ${ctx.alerts} alerta(s) ativo(s). Pergunte sobre clima, IRC, equipes ou alertas.`;
};

const SUGGESTIONS = ["Quais trechos são críticos?", "Como o clima afeta a operação?", "Qual o IRC médio?"];

const MAX_LEN = 500;

/** Renderiza **negrito** simples vindo da resposta da IA. */
const renderText = (text: string) =>
  text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") && part.length > 4
      ? <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>
      : <span key={i}>{part}</span>
  );

export const AIChatWidget = ({ context }: { context: AIChatContext }) => {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      text: "Olá! Sou o assistente de monitoramento. Posso resumir a situação da malha, o impacto do clima e as prioridades do dia.",
    },
  ]);

  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, typing]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  const send = async (text: string) => {
    const value = text.trim().slice(0, MAX_LEN);
    if (!value || typing) return;
    const history = messages
      .filter(m => m.id !== "welcome")
      .slice(-8)
      .map(m => ({ role: m.role, content: m.text }));

    setMessages(prev => [...prev, { id: `u-${Date.now()}`, role: "user", text: value }]);
    setInput("");
    setTyping(true);

    let answer: string;
    try {
      const { data, error } = await supabase.functions.invoke("ai-chat", {
        body: { question: value, context, history },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      answer = data?.answer?.trim() || offlineAnswer(value, context);
    } catch (e) {
      const detail = e instanceof Error ? e.message : "";
      answer = `${offlineAnswer(value, context)}\n\n(Resposta gerada localmente — a IA está indisponível no momento${detail ? `: ${detail}` : ""}.)`;
    }

    setMessages(prev => [...prev, { id: `a-${Date.now()}`, role: "assistant", text: answer }]);
    setTyping(false);
    inputRef.current?.focus();
  };

  return (
    <div ref={panelRef} className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">
      {open && (
        <div className="w-[min(92vw,360px)] h-[440px] bg-surface-lowest border border-border rounded-2xl shadow-elegant flex flex-col overflow-hidden animate-fade-in">
          <header className="flex items-center gap-2 px-4 py-3 border-b border-border/60 bg-surface-low">
            <span className="h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
              <Bot className="h-4 w-4" />
            </span>
            <div className="flex-1 min-w-0">
              <div className="text-[12.5px] font-semibold leading-tight">Assistente de monitoramento</div>
              <div className="text-[10.5px] text-muted-foreground">
                {typing ? "Analisando dados da malha…" : "Baseado nos dados do painel"}
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Fechar assistente"
              className="p-1 rounded-md text-muted-foreground hover:bg-surface-high hover:text-foreground transition-smooth"
            >
              <X className="h-4 w-4" />
            </button>
          </header>

          <div ref={listRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5">
            {messages.map(m => (
              <div key={m.id} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                <div
                  className={`max-w-[85%] text-[12.5px] leading-relaxed rounded-2xl px-3 py-2 whitespace-pre-line ${
                    m.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-surface-low text-foreground rounded-bl-sm"
                  }`}
                >
                  {renderText(m.text)}
                </div>
              </div>
            ))}
            {typing && (
              <div className="flex justify-start">
                <div className="bg-surface-low rounded-2xl rounded-bl-sm px-3 py-2 text-[12px] text-muted-foreground">
                  pensando…
                </div>
              </div>
            )}
          </div>

          {messages.length <= 1 && (
            <div className="px-3 pb-2 flex flex-wrap gap-1.5">
              {SUGGESTIONS.map(s => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="text-[11px] px-2.5 py-1 rounded-full border border-border text-muted-foreground hover:bg-surface-low hover:text-foreground transition-smooth"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          <form
            onSubmit={e => {
              e.preventDefault();
              send(input);
            }}
            className="flex items-center gap-2 px-3 py-3 border-t border-border/60"
          >
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Pergunte sobre a malha…"
              aria-label="Mensagem para o assistente"
              maxLength={MAX_LEN}
              className="flex-1 h-9 px-3 rounded-lg bg-surface-low border border-border text-[12.5px] outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <button
              type="submit"
              disabled={!input.trim() || typing}
              aria-label="Enviar mensagem"
              className="h-9 w-9 shrink-0 rounded-lg bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-50 transition-smooth"
            >
              <Send className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}

      <button
        onClick={() => setOpen(o => !o)}
        aria-label={open ? "Fechar assistente de IA" : "Abrir assistente de IA"}
        aria-expanded={open}
        className="h-[52px] w-[52px] rounded-full bg-gradient-to-b from-primary to-primary-glow text-primary-foreground shadow-elegant flex items-center justify-center hover:scale-105 active:scale-95 transition-smooth"
      >
        {open ? <X className="h-5 w-5" /> : <Bot className="h-5 w-5" />}
      </button>
    </div>
  );
};
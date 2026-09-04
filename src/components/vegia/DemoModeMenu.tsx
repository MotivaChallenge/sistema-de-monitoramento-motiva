import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Presentation, Satellite, LineChart, ListOrdered, CalendarDays, ClipboardList, FileText, ArrowRight } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useSegments } from "@/hooks/useVegiaData";
import { evaluateDecision } from "@/lib/uncertainty";
import { StatusDot } from "./ComplianceBadge";
import type { Status } from "@/types/domain";

const STATUS_LABEL: Record<Status, string> = { critico: "Caso crítico", atencao: "Caso em atenção", conforme: "Caso conforme" };

const SCRIPT = [
  { icon: Satellite, label: "1. Captura", desc: "Sentinel-2 → Earth Engine (fonte e qualidade do dado)", to: "/dashboard" },
  { icon: LineChart, label: "2. Análise", desc: "Índices NDVI/EVI/SAVI e altura estimada ± incerteza", to: "/mapa" },
  { icon: ListOrdered, label: "3. Priorização", desc: "IRC, zona de decisão e validação de campo", to: "/previsoes" },
  { icon: CalendarDays, label: "4. Planejamento", desc: "Por que cada equipe foi escolhida", to: "/planejamento" },
  { icon: ClipboardList, label: "5. Execução", desc: "Ordens, SLA e atrasos", to: "/ordens" },
  { icon: FileText, label: "6. Relatório", desc: "Metodologia, cláusula e origem do dado", to: "/relatorio" },
];

/**
 * Modo demonstração — apenas navegação guiada para a banca.
 * Não altera dados nem gera ordens.
 */
export const DemoModeMenu = () => {
  const navigate = useNavigate();
  const { data: segments = [] } = useSegments();

  const picks = useMemo(() => {
    const byStatus = (st: Status) => {
      const list = segments.filter(s => s.status === st);
      // prioriza casos na zona de validação (mais didáticos) para atenção; maior altura para crítico
      if (st === "atencao") {
        return list.find(s => evaluateDecision({ altura: s.altura, limite: s.limite }).zone === "validar") ?? list[0];
      }
      if (st === "critico") return [...list].sort((a, b) => b.altura - a.altura)[0];
      return [...list].sort((a, b) => a.altura - b.altura)[0];
    };
    return (["critico", "atencao", "conforme"] as Status[])
      .map(st => ({ st, seg: byStatus(st) }))
      .filter(p => p.seg);
  }, [segments]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          aria-label="Modo demonstração"
          title="Modo demonstração (somente navegação)"
          className="inline-flex items-center gap-1.5 h-9 px-2.5 rounded-lg border border-dashed border-border text-[11px] font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground hover:bg-surface-low transition-smooth shrink-0"
        >
          <Presentation className="h-3.5 w-3.5" />
          <span className="hidden lg:inline">Demo</span>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-[22rem] max-w-[calc(100vw-1.5rem)] p-0 overflow-hidden">
        <div className="px-4 py-3 border-b border-border/60 bg-surface-low">
          <div className="text-[12px] font-semibold uppercase tracking-wider">Modo demonstração</div>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Navegação guiada. Não executa ações nem gera ordens de serviço.
          </p>
        </div>

        <div className="px-4 pt-3 pb-2">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Casos pré-selecionados</div>
          <div className="space-y-1">
            {picks.map(({ st, seg }) => {
              const d = evaluateDecision({ altura: seg!.altura, limite: seg!.limite });
              return (
                <button
                  key={st}
                  onClick={() => navigate(`/segmento/${seg!.id}`)}
                  className="w-full flex items-center justify-between gap-2 rounded-md px-2 py-1.5 hover:bg-surface-low text-left"
                >
                  <span className="min-w-0">
                    <StatusDot status={st} label={STATUS_LABEL[st]} />
                    <span className="block text-[11px] text-muted-foreground truncate pl-4">
                      {seg!.km} · {seg!.altura} ± {d.uncertaintyCm ?? "?"} cm · limite {seg!.limite} cm · {d.title.split(" — ")[0]}
                    </span>
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                </button>
              );
            })}
            {picks.length === 0 && <p className="text-[11px] text-muted-foreground">Carregando trechos…</p>}
          </div>
        </div>

        <div className="px-4 pt-2 pb-3 border-t border-border/60">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Roteiro (captura → relatório)</div>
          <ol className="space-y-0.5">
            {SCRIPT.map(step => (
              <li key={step.label}>
                <button
                  onClick={() => navigate(step.to)}
                  className="w-full flex items-start gap-2 rounded-md px-2 py-1.5 hover:bg-surface-low text-left"
                >
                  <step.icon className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                  <span className="min-w-0">
                    <span className="block text-[12px] font-semibold leading-tight">{step.label}</span>
                    <span className="block text-[11px] text-muted-foreground leading-snug">{step.desc}</span>
                  </span>
                </button>
              </li>
            ))}
          </ol>
          <p className="mt-2 text-[10.5px] italic text-muted-foreground leading-snug">
            Destaque: fonte do dado (Sentinel-2/GEE) e zona de validação de campo perto de 30 cm.
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
};

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Clapperboard, Play, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Step {
  to: string;
  title: string;
  seconds: number;
  script: string;
  points: string[];
}

const STEPS: Step[] = [
  {
    to: "/prototipo",
    title: "Testes do protótipo",
    seconds: 70,
    script:
      "Mostre como o protótipo determina a altura da vegetação: captura Sentinel-2, cálculo do NDVI, modelo de altura e conferência por visão computacional. Em seguida leia as métricas de validação e as limitações.",
    points: [
      "Explique o pipeline nas 4 etapas do topo",
      "Comente MAE, RMSE, R² e o acerto de decisão",
      "Mostre a dispersão estimado x medido",
      "Feche com limitações e próximos passos",
    ],
  },
  {
    to: "/dashboard",
    title: "Visão geral da plataforma",
    seconds: 50,
    script:
      "Apresente o painel de decisão diária: situação geral dos trechos, clima, indicadores operacionais no carrossel e prioridades do dia.",
    points: ["Carrossel de indicadores", "Clima e chuva acumulada", "Prioridades por IRC", "Assistente de IA flutuante"],
  },
  {
    to: "/mapa",
    title: "Mapa operacional",
    seconds: 45,
    script:
      "Mostre a malha completa, a seleção de rodovia, as camadas e a análise de um ponto com NDVI real e altura estimada.",
    points: ["Trocar de concessão", "Buscar por KM", "Abrir a análise de um ponto", "Exportar traçado em GeoJSON"],
  },
  {
    to: "/previsoes",
    title: "Previsões",
    seconds: 30,
    script: "Explique como a projeção de crescimento antecipa quando o trecho ultrapassa o limite contratual.",
    points: ["Curva de crescimento projetada", "Influência da chuva"],
  },
  {
    to: "/planejamento",
    title: "Planejamento",
    seconds: 30,
    script: "Mostre a priorização automática de roçada por risco e a distribuição por região.",
    points: ["Ordem sugerida de atendimento", "Filtros por rodovia e região"],
  },
  {
    to: "/equipes",
    title: "Equipes",
    seconds: 25,
    script: "Apresente a capacidade das equipes, status e tempo de resposta por base.",
    points: ["Disponibilidade e eficiência", "Busca e filtros"],
  },
  {
    to: "/ordens",
    title: "Ordens de serviço",
    seconds: 30,
    script: "Demonstre o ciclo completo: alerta vira ordem, equipe atende e a ordem é concluída na plataforma.",
    points: ["Criar/priorizar ordem", "Concluir uma ordem"],
  },
  {
    to: "/relatorio",
    title: "Relatórios e decisão",
    seconds: 30,
    script:
      "Encerre mostrando o relatório de conformidade exportável e como a Motiva usa esses dados para comprovar cláusulas contratuais e planejar a manutenção.",
    points: ["Conformidade por trecho", "Exportar PDF", "Ganho na tomada de decisão"],
  },
];

const TOTAL = STEPS.reduce((a, s) => a + s.seconds, 0);
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

export const DemoTour = () => {
  const navigate = useNavigate();
  const [active, setActive] = useState(false);
  const [i, setI] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  const step = STEPS[i];
  const startAt = useMemo(
    () => STEPS.slice(0, i).reduce((a, s) => a + s.seconds, 0),
    [i]
  );

  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(t);
  }, [active]);

  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActive(false);
      if (e.key === "ArrowRight") go(Math.min(i + 1, STEPS.length - 1));
      if (e.key === "ArrowLeft") go(Math.max(i - 1, 0));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const go = (n: number) => {
    setI(n);
    navigate(STEPS[n].to);
  };

  const start = () => {
    setActive(true);
    setElapsed(0);
    go(0);
  };

  if (!active) {
    return (
      <button
        onClick={start}
        aria-label="Iniciar modo demonstração"
        className="fixed bottom-5 left-5 z-40 inline-flex items-center gap-2 h-11 px-4 rounded-full bg-surface-lowest border border-border shadow-elegant text-[12px] font-semibold uppercase tracking-wider text-foreground hover:border-primary/50 hover:bg-surface-low transition-smooth"
      >
        <Clapperboard className="h-4 w-4 text-primary" />
        <span className="hidden sm:inline">Modo demonstração</span>
      </button>
    );
  }

  return (
    <aside
      role="dialog"
      aria-label="Roteiro de demonstração"
      className="fixed bottom-5 left-5 z-40 w-[min(360px,calc(100vw-2.5rem))] rounded-xl border border-border bg-surface-lowest shadow-elegant animate-fade-in"
    >
      <header className="flex items-center gap-2 px-4 py-3 border-b border-border/50">
        <Clapperboard className="h-4 w-4 text-primary" />
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-semibold truncate">Roteiro do vídeo · etapa {i + 1}/{STEPS.length}</p>
          <p className="text-[10.5px] text-muted-foreground tabular-nums">
            {mmss(elapsed)} gravados · sugerido {mmss(startAt)}–{mmss(startAt + step.seconds)} de {mmss(TOTAL)}
          </p>
        </div>
        <button onClick={() => setActive(false)} aria-label="Encerrar demonstração" className="h-7 w-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-surface-low transition-smooth">
          <X className="h-4 w-4" />
        </button>
      </header>

      <div className="px-4 py-3 space-y-2.5">
        <p className="text-[13px] font-semibold">{step.title}</p>
        <p className="text-[11.5px] text-muted-foreground leading-relaxed">{step.script}</p>
        <ul className="space-y-1">
          {step.points.map((p, k) => (
            <li key={k} className="flex gap-2 text-[11.5px] text-foreground/85">
              <span className="mt-[6px] h-1 w-1 rounded-full bg-primary shrink-0" />
              {p}
            </li>
          ))}
        </ul>
      </div>

      <div className="flex items-center gap-1.5 px-4 pb-3">
        {STEPS.map((_, k) => (
          <button
            key={k}
            onClick={() => go(k)}
            aria-label={`Ir para etapa ${k + 1}`}
            className={cn("h-1.5 flex-1 rounded-full transition-smooth", k <= i ? "bg-primary" : "bg-surface-high")}
          />
        ))}
      </div>

      <footer className="flex items-center justify-between gap-2 px-4 pb-4">
        <button
          onClick={() => go(Math.max(i - 1, 0))}
          disabled={i === 0}
          className="inline-flex items-center gap-1 h-9 px-3 rounded-lg border border-border text-[11px] font-semibold uppercase tracking-wider disabled:opacity-40 hover:bg-surface-low transition-smooth"
        >
          <ChevronLeft className="h-3.5 w-3.5" /> Anterior
        </button>
        {i < STEPS.length - 1 ? (
          <button
            onClick={() => go(i + 1)}
            className="inline-flex items-center gap-1 h-9 px-3 rounded-lg bg-gradient-to-b from-primary to-primary-glow text-primary-foreground text-[11px] font-semibold uppercase tracking-wider"
          >
            Próxima <ChevronRight className="h-3.5 w-3.5" />
          </button>
        ) : (
          <button
            onClick={() => { setActive(false); }}
            className="inline-flex items-center gap-1 h-9 px-3 rounded-lg bg-gradient-to-b from-primary to-primary-glow text-primary-foreground text-[11px] font-semibold uppercase tracking-wider"
          >
            <Play className="h-3.5 w-3.5" /> Concluir
          </button>
        )}
      </footer>
    </aside>
  );
};

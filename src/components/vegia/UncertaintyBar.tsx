import { evaluateDecision, MODEL_UNCERTAINTY_CM, ZONE_CLASS } from "@/lib/uncertainty";

interface Props {
  /** Altura estimada (cm). */
  altura: number;
  /** Limite contratual aplicável (cm). */
  limite: number;
  /** Incerteza estimada (± cm). `null` = não calibrada. */
  uncertaintyCm?: number | null;
  measured?: boolean;
  className?: string;
}

/**
 * Barra horizontal da faixa de decisão:
 * 0 cm —— limite contratual —— faixa provável (h ± u) —— altura estimada.
 * Nunca apresenta a estimativa como medição física.
 */
export const UncertaintyBar = ({ altura, limite, uncertaintyCm = MODEL_UNCERTAINTY_CM, measured = false, className = "" }: Props) => {
  const d = evaluateDecision({ altura, limite, uncertaintyCm, measured });
  const lower = d.lower ?? altura;
  const upper = d.upper ?? altura;
  const max = Math.max(upper, limite, altura) * 1.15 || 1;
  const pct = (v: number) => `${Math.min(100, Math.max(0, (v / max) * 100))}%`;
  const width = `${Math.min(100, Math.max(1, ((upper - lower) / max) * 100))}%`;

  return (
    <div className={className}>
      <div
        className="relative h-6 rounded-md bg-muted/60 border border-border/60"
        role="img"
        aria-label={`Altura estimada ${Math.round(altura)} centímetros, faixa provável de ${Math.round(lower)} a ${Math.round(upper)} centímetros, limite contratual ${limite} centímetros.`}
      >
        {/* faixa provável */}
        <div
          className={`absolute top-1 bottom-1 rounded-sm border ${ZONE_CLASS[d.zone]}`}
          style={{ left: pct(lower), width }}
        />
        {/* limite contratual */}
        <div className="absolute top-0 bottom-0 w-0.5 bg-foreground/70" style={{ left: pct(limite) }} />
        {/* altura estimada */}
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 h-3 w-3 rounded-full bg-foreground border-2 border-background"
          style={{ left: pct(altura) }}
        />
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground">
        <span>0 cm</span>
        <span className="font-semibold text-foreground">Limite {limite} cm</span>
        <span>
          Faixa provável {Math.round(lower)}–{Math.round(upper)} cm
        </span>
        <span className="font-semibold text-foreground">
          {measured ? "Medido" : "Estimada"} {Math.round(altura)} cm
        </span>
      </div>
    </div>
  );
};

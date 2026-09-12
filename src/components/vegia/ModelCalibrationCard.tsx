import { Ruler, Loader2, RefreshCw, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";
import { useActiveCalibration, useCalibrationPreview, useRunCalibration } from "@/hooks/useCalibration";
import { MIN_CALIBRATION_PAIRS } from "@/lib/calibration";
import { MODEL_UNCERTAINTY_CM, UNCERTAINTY_TOOLTIP } from "@/lib/uncertainty";

/**
 * Calibração do modelo de altura com medições de campo.
 * Enquanto não houver pares suficientes, o cartão declara que a margem exibida
 * é o resíduo assumido (±13 cm) e mostra quanto falta para medi-la de fato.
 */
export const ModelCalibrationCard = ({ className = "" }: { className?: string }) => {
  const { isAdmin } = useAuth();
  const { data: active, isLoading } = useActiveCalibration();
  const { data: preview } = useCalibrationPreview();
  const run = useRunCalibration();

  const pairs = preview?.pairCount ?? 0;
  const pct = Math.min(100, Math.round((pairs / MIN_CALIBRATION_PAIRS) * 100));
  const uncertainty = active?.uncertainty_cm ?? null;

  const rows: { label: string; value: string }[] = active
    ? [
        { label: "Fórmula calibrada", value: `altura = ${active.slope} × índice ${active.intercept >= 0 ? "+" : "−"} ${Math.abs(active.intercept)}` },
        { label: "Margem medida (LOOCV)", value: `± ${active.uncertainty_cm} cm` },
        { label: "Pares medição/satélite", value: String(active.n_pairs) },
        { label: "MAE", value: active.mae_cm != null ? `${active.mae_cm} cm` : "—" },
        { label: "RMSE", value: active.rmse_cm != null ? `${active.rmse_cm} cm` : "—" },
        { label: "Viés", value: active.bias_cm != null ? `${active.bias_cm} cm` : "—" },
        { label: "R²", value: active.r2 != null ? String(active.r2) : "—" },
        { label: "Janela de pareamento", value: `± ${active.max_lag_days} dias` },
        { label: "Calibrado em", value: new Date(active.created_at).toLocaleDateString("pt-BR") },
      ]
    : [];

  return (
    <section
      className={`rounded-xl border border-border/60 bg-surface-lowest p-4 md:p-5 shadow-card ${className}`}
      aria-label="Calibração do modelo de altura com medições de campo"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h2 className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-wider">
          <Ruler className="h-4 w-4 text-primary" aria-hidden="true" /> Calibração com medições de campo
        </h2>
        {isAdmin && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => run.mutate(undefined)}
            disabled={run.isPending || pairs < MIN_CALIBRATION_PAIRS}
            title={pairs < MIN_CALIBRATION_PAIRS ? `Faltam ${MIN_CALIBRATION_PAIRS - pairs} pares` : "Recalcular a margem com os dados atuais"}
          >
            {run.isPending
              ? <><Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> Calibrando…</>
              : <><RefreshCw className="h-3.5 w-3.5" aria-hidden="true" /> Recalibrar</>}
          </Button>
        )}
      </div>

      {isLoading ? (
        <p className="text-[12.5px] text-muted-foreground">carregando…</p>
      ) : active ? (
        <>
          <p className="mb-3 text-[12.5px] leading-relaxed text-muted-foreground" title={UNCERTAINTY_TOOLTIP}>
            A margem exibida no sistema é <strong className="text-foreground">± {uncertainty} cm</strong>, medida por
            validação cruzada sobre {active.n_pairs} medições reais de campo — substitui o resíduo assumido de ±{MODEL_UNCERTAINTY_CM} cm.
          </p>
          <dl className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-2.5">
            {rows.map(r => (
              <div key={r.label} className="min-w-0">
                <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">{r.label}</dt>
                <dd className="text-[12.5px] font-semibold leading-snug break-words">{r.value}</dd>
              </div>
            ))}
          </dl>
        </>
      ) : (
        <>
          <p className="flex gap-2 text-[12.5px] leading-relaxed text-muted-foreground">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
            <span>
              O ±{MODEL_UNCERTAINTY_CM} cm exibido hoje é um resíduo <strong className="text-foreground">assumido</strong>, não medido.
              Ele só deixa de ser estimativa quando houver medições de campo pareadas com a passagem do satélite
              (janela de ±7 dias). Registre as alturas na página de cada trecho.
            </span>
          </p>
          <div className="mt-4">
            <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1.5">
              <span>Pares válidos para calibrar</span>
              <span className="font-semibold text-foreground">{pairs} / {MIN_CALIBRATION_PAIRS}</span>
            </div>
            <Progress value={pct} aria-label={`${pairs} de ${MIN_CALIBRATION_PAIRS} pares`} />
            {preview?.measurementCount != null && (
              <p className="mt-2 text-[11px] text-muted-foreground">
                {preview.measurementCount} medições de campo registradas; {pairs} dentro da janela de ±7 dias de uma leitura orbital.
              </p>
            )}
          </div>
        </>
      )}
    </section>
  );
};

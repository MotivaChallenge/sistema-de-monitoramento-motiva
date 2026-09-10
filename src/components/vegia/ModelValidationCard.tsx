import { FlaskConical, AlertCircle } from "lucide-react";
import { useModelValidation } from "@/hooks/useModelValidation";
import {
  HEIGHT_MODEL_ID, HEIGHT_MODEL_VERSION, MODEL_UNCERTAINTY_CM,
  UNCERTAINTY_LABEL, UNCERTAINTY_TOOLTIP,
} from "@/lib/uncertainty";
import { MethodologyDialog } from "./MethodologyDialog";

const PENDING =
  "Validação quantitativa pendente. O resultado deve ser usado apenas para triagem e priorização, com confirmação em campo.";

/**
 * Validação do modelo de altura: exibe as métricas registradas para a versão
 * em uso. Sem registro, declara a pendência em vez de exibir números fictícios.
 */
export const ModelValidationCard = ({ className = "" }: { className?: string }) => {
  const { data, isLoading } = useModelValidation();

  const rows: { label: string; value: string; hint?: string }[] = [
    { label: "Modelo", value: `${HEIGHT_MODEL_ID} · ${HEIGHT_MODEL_VERSION}` },
    {
      label: UNCERTAINTY_LABEL,
      value: `± ${data?.uncertainty_cm ?? MODEL_UNCERTAINTY_CM} cm`,
      hint: UNCERTAINTY_TOOLTIP,
    },
    { label: "Método da incerteza", value: data?.uncertainty_method ?? "resíduo do modelo + variabilidade espacial, idade da cena e saturação" },
    { label: "Data de calibração", value: data?.calibration_date ?? "não registrada" },
    { label: "Amostra de calibração", value: data?.sample_count != null ? String(data.sample_count) : "não registrada" },
    { label: "Amostra de validação", value: data?.validation_sample_count != null ? String(data.validation_sample_count) : "não registrada" },
    { label: "MAE", value: data?.mae_cm != null ? `${data.mae_cm} cm` : "não calculado" },
    { label: "RMSE", value: data?.rmse_cm != null ? `${data.rmse_cm} cm` : "não calculado" },
    { label: "Viés", value: data?.bias_cm != null ? `${data.bias_cm} cm` : "não calculado" },
    { label: "Nível de confiança", value: data?.confidence_level != null ? `${data.confidence_level}%` : "não registrado" },
    { label: "Última validação de campo", value: data?.last_field_validation_at ?? "não registrada" },
  ];

  return (
    <section className={`rounded-xl border border-border/60 bg-surface-lowest p-4 md:p-5 shadow-card ${className}`} aria-label="Validação do modelo de altura">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h2 className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-wider">
          <FlaskConical className="h-4 w-4 text-primary" aria-hidden="true" /> Validação do modelo de altura
        </h2>
        <MethodologyDialog />
      </div>

      <dl className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-2.5">
        {rows.map(r => (
          <div key={r.label} className="min-w-0">
            <dt className="text-[10px] uppercase tracking-wider text-muted-foreground" title={r.hint}>{r.label}</dt>
            <dd className="text-[12.5px] font-semibold leading-snug break-words">{isLoading ? "carregando…" : r.value}</dd>
          </div>
        ))}
      </dl>

      {!isLoading && !data && (
        <p className="mt-4 flex gap-2 border-t border-border/50 pt-3 text-[12px] leading-relaxed text-muted-foreground">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" aria-hidden="true" />
          <span>{PENDING}</span>
        </p>
      )}
    </section>
  );
};

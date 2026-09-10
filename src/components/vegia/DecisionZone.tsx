import { ShieldCheck, AlertTriangle, Search, HelpCircle } from "lucide-react";
import {
  DecisionZone as Zone, evaluateDecision, ZONE_CLASS, MODEL_UNCERTAINTY_CM,
  UNCERTAINTY_LABEL, UNCERTAINTY_TOOLTIP, FIELD_CONFIRMATION_MESSAGE,
} from "@/lib/uncertainty";
import { UncertaintyBar } from "./UncertaintyBar";
import { DataOriginBadge } from "./DataOriginBadge";
import type { DataOrigin } from "@/lib/data-provenance";

const ICON: Record<Zone, typeof ShieldCheck> = {
  baixo: ShieldCheck,
  validar: Search,
  alto: AlertTriangle,
  nao_calibrado: HelpCircle,
};

interface Props {
  altura: number;
  limite: number;
  /** `null` força a mensagem de incerteza não calibrada. */
  uncertaintyCm?: number | null;
  measured?: boolean;
  origin?: DataOrigin;
  /** Regra da cláusula aplicada (texto curto). */
  clausula?: string;
  compact?: boolean;
  className?: string;
}

/**
 * Zona de decisão: separa estimativa, incerteza, limite contratual,
 * decisão recomendada e necessidade de validação de campo.
 */
export const DecisionZoneCard = ({
  altura, limite, uncertaintyCm = MODEL_UNCERTAINTY_CM, measured = false,
  origin, clausula, compact = false, className = "",
}: Props) => {
  const d = evaluateDecision({ altura, limite, uncertaintyCm, measured });
  const Icon = ICON[d.zone];

  if (compact) {
    return (
      <div className={`inline-flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold ${ZONE_CLASS[d.zone]} ${className}`}>
        <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span className="truncate">{d.title}</span>
      </div>
    );
  }

  return (
    <section className={`rounded-xl border p-4 ${ZONE_CLASS[d.zone]} ${className}`} aria-label="Zona de decisão">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 font-semibold text-[13px] uppercase tracking-wider">
          <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
          Zona de decisão
        </div>
        {origin && <DataOriginBadge origin={origin} />}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
        <Field label={measured ? "Medido em campo" : "Altura estimada"} value={`${Math.round(altura)} cm`} />
        <Field
          label={measured ? "Incerteza" : UNCERTAINTY_LABEL}
          hint={measured ? undefined : UNCERTAINTY_TOOLTIP}
          value={d.uncertaintyCm == null ? "não calibrada" : measured ? "medição direta" : `± ${d.uncertaintyCm} cm`}
        />
        <Field label="Limite contratual" value={`${limite} cm`} />
        <Field
          label="Faixa provável"
          value={d.lower == null || d.upper == null ? "não calculada" : `${Math.round(d.lower)}–${Math.round(d.upper)} cm`}
        />
      </div>

      {!measured && <UncertaintyBar altura={altura} limite={limite} uncertaintyCm={uncertaintyCm} className="mb-3" />}

      <p className="text-[13px] font-semibold leading-snug">{d.title}</p>
      <p className="text-[12px] leading-relaxed opacity-90 mt-1">{d.recommendation}</p>
      <p className="text-[11px] font-mono mt-2 opacity-80">{d.summary}</p>
      {!measured && (
        <p className="text-[11px] mt-2 opacity-90">{FIELD_CONFIRMATION_MESSAGE}</p>
      )}
      {clausula && (
        <p className="text-[11px] mt-2 opacity-80">
          Regra aplicada: cláusula {clausula} — limite específico deste ativo é {limite} cm
          {limite !== 30 && " (a regra geral de 30 cm não se aplica a este item)"}.
        </p>
      )}
    </section>
  );
};

const Field = ({ label, value, hint }: { label: string; value: string; hint?: string }) => (
  <div>
    <div className="text-[10px] uppercase tracking-wider opacity-70" title={hint}>
      {label}
    </div>
    <div className="text-[14px] font-bold tabular-nums leading-tight">{value}</div>
  </div>
);

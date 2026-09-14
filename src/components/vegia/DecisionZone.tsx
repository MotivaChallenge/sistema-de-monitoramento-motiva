import { ShieldCheck, AlertTriangle, Search, HelpCircle } from "lucide-react";
import {
  DecisionZone as Zone, evaluateDecision, ZONE_CLASS,
} from "@/lib/uncertainty";
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
 * Zona de decisão: mostra, de forma simples, a altura estimada,
 * o limite contratual e a situação recomendada.
 */
export const DecisionZoneCard = ({
  altura, limite, measured = false,
  origin, compact = false, className = "",
}: Props) => {
  const d = evaluateDecision({ altura, limite, uncertaintyCm: 0, measured });
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
        <div className="flex items-center gap-2 font-semibold text-[13px]">
          <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
          Zona de decisão
        </div>
        {origin && <DataOriginBadge origin={origin} />}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
        <Field label={measured ? "Medido em campo" : "Altura estimada"} value={`${Math.round(altura)} cm`} />
        <Field label="Limite contratual" value={`${limite} cm`} />
        <Field label="Situação" value={altura > limite ? "Acima do limite" : "Dentro do limite"} />
      </div>

      <p className="text-[13px] font-semibold leading-snug">{d.title}</p>
      <p className="text-[12px] leading-relaxed opacity-90 mt-1">{d.recommendation}</p>
    </section>
  );
};

const Field = ({ label, value }: { label: string; value: string }) => (
  <div>
    <div className="text-[10px] uppercase tracking-wider opacity-70">{label}</div>
    <div className="text-[14px] font-bold tabular-nums leading-tight">{value}</div>
  </div>
);

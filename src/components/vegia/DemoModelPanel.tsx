import { FlaskConical, Info } from "lucide-react";
import { UncertaintyBar } from "@/components/vegia/UncertaintyBar";
import {
  DEMO_SEGMENTS, DEMO_REFERENCE_SEGMENT, type DemoSegmentRow,
} from "@/lib/demo-model-data";
import {
  DEMO_DATA_TEXT, FIELD_VALIDATION_TEXT, MODEL_FORMULA_TEXT, MODEL_HEIGHT_TEXT,
  NON_CONFORMITY_TEXT, PRIORITY_LEVEL_LABEL, SATELLITE_NOT_A_RULER_TEXT,
  UNCERTAINTY_EXPLANATION_TEXT, VEGETATION_MODEL,
} from "@/lib/vegetation-model";

const cm = (v: number) => `${Math.round(v)} cm`;
const dec = (v: number, d = 3) => v.toFixed(d).replace(".", ",");

const LEVEL_CLASS: Record<string, string> = {
  critica: "bg-destructive/12 text-destructive border-destructive/30",
  alta: "bg-tertiary/12 text-tertiary border-tertiary/30",
  media: "bg-primary/10 text-primary border-primary/25",
  baixa: "bg-muted text-muted-foreground border-border",
};

const STATUS_CLASS: Record<string, string> = {
  provavelmente_nao_conforme: "text-destructive",
  validar_em_campo: "text-tertiary",
  provavelmente_conforme: "text-primary",
};

/**
 * Modelo demonstrativo de vegetação: índice composto NDVI/EVI/SAVI,
 * altura estimada, faixa de incerteza, decisão e prioridade logística.
 * Todos os números vêm do cálculo — nada é fixado na interface.
 */
export const DemoModelPanel = ({
  segment = DEMO_REFERENCE_SEGMENT,
  rows = DEMO_SEGMENTS,
  className = "",
}: { segment?: DemoSegmentRow; rows?: DemoSegmentRow[]; className?: string }) => (
  <section
    className={`bg-surface-lowest rounded-xl border border-border/40 shadow-card p-4 md:p-5 space-y-5 ${className}`}
    aria-label="Modelo demonstrativo de estimativa de altura e prioridade operacional"
  >
    <header>
      <h2 className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-wider">
        <FlaskConical className="h-4 w-4 text-primary" /> Modelo demonstrativo · altura estimada e prioridade
      </h2>
      <p className="text-[11.5px] text-muted-foreground mt-1 leading-relaxed max-w-3xl">
        {MODEL_FORMULA_TEXT}. {MODEL_HEIGHT_TEXT}. {SATELLITE_NOT_A_RULER_TEXT} {DEMO_DATA_TEXT}
      </p>
    </header>

    {/* Caso de referência */}
    <div className="rounded-lg border border-border/50 bg-surface-low p-3.5 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[12px] font-semibold">
          {segment.road} · {segment.km} · {segment.vegetationType}
        </p>
        <span className={`text-[10.5px] font-bold uppercase px-2 py-0.5 rounded-full border ${LEVEL_CLASS[segment.operationalPriorityLevel]}`}>
          Prioridade {PRIORITY_LEVEL_LABEL[segment.operationalPriorityLevel]} · {segment.operationalPriorityScore}/100
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-[12px]">
        <Field label="NDVI / EVI / SAVI" value={`${dec(segment.ndvi, 2)} · ${dec(segment.evi, 2)} · ${dec(segment.savi, 2)}`} />
        <Field label="Índice de vegetação" value={dec(segment.vegetationIndex)} />
        <Field label="Altura estimada" value={cm(segment.estimatedHeightCm)} />
        <Field label="Incerteza estimada" value={`± ${segment.uncertaintyCm} cm`} />
        <Field label="Faixa provável" value={`${cm(segment.lowerBoundCm)}–${cm(segment.upperBoundCm)}`} />
        <Field label="Limite contratual" value={cm(segment.contractualLimitCm)} />
        <Field
          label="Diferença para o limite"
          value={`${segment.distanceToLimitCm >= 0 ? "+" : "−"}${Math.abs(Math.round(segment.distanceToLimitCm))} cm`}
        />
        <Field label="Origem dos dados" value="Demonstrativo (mock)" />
      </div>

      <UncertaintyBar
        altura={segment.estimatedHeightCm}
        limite={segment.contractualLimitCm}
        uncertaintyCm={segment.uncertaintyCm}
      />

      <div className="text-[12px] space-y-1">
        <p className={`font-semibold ${STATUS_CLASS[segment.heightDecisionStatus]}`}>
          Classificação: {segment.heightDecisionLabel}
        </p>
        <p>Ação: {segment.action}</p>
        <p className="text-muted-foreground">
          Validação de campo: {segment.needsFieldValidation ? "necessária para decisão contratual" : "não requerida neste momento"}
        </p>
      </div>
    </div>

    {/* Comparativo dos cenários demonstrativos */}
    <div className="overflow-x-auto">
      <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
        Cenários demonstrativos ordenados por prioridade operacional
      </p>
      <table className="w-full text-[12px] min-w-[720px]">
        <caption className="sr-only">
          Trechos demonstrativos com índices, altura estimada, faixa provável, classificação e prioridade operacional.
        </caption>
        <thead>
          <tr className="text-[10.5px] uppercase tracking-wider text-muted-foreground border-b border-border/50">
            <th className="text-left py-2 font-medium">Trecho</th>
            <th className="text-right py-2 font-medium">Índice</th>
            <th className="text-right py-2 font-medium">Altura est.</th>
            <th className="text-right py-2 font-medium">Faixa</th>
            <th className="text-right py-2 font-medium">Chuva 5d</th>
            <th className="text-right py-2 font-medium">Dias s/ roçada</th>
            <th className="text-left py-2 font-medium">Classificação</th>
            <th className="text-right py-2 font-medium">Prioridade</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.segmentId} className="border-b border-border/30 last:border-0">
              <td className="py-2">
                <div className="font-medium">{r.km}</div>
                <div className="text-[10.5px] text-muted-foreground">{r.cenario}</div>
              </td>
              <td className="py-2 text-right tabular-nums">{dec(r.vegetationIndex)}</td>
              <td className="py-2 text-right tabular-nums">{cm(r.estimatedHeightCm)}</td>
              <td className="py-2 text-right tabular-nums">{cm(r.lowerBoundCm)}–{cm(r.upperBoundCm)}</td>
              <td className="py-2 text-right tabular-nums">{r.rainfall5dMm} mm</td>
              <td className="py-2 text-right tabular-nums">{r.daysSinceLastMowing}</td>
              <td className={`py-2 ${STATUS_CLASS[r.heightDecisionStatus]}`}>{r.heightDecisionLabel}</td>
              <td className="py-2 text-right tabular-nums font-semibold">
                {r.operationalPriorityScore} · {PRIORITY_LEVEL_LABEL[r.operationalPriorityLevel]}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    <div className="rounded-lg border border-border/40 bg-surface-low p-3.5 text-[11.5px] text-muted-foreground space-y-1.5 leading-relaxed">
      <p className="flex items-center gap-2 font-semibold text-foreground">
        <Info className="h-3.5 w-3.5" /> Como ler estes números
      </p>
      <p>{UNCERTAINTY_EXPLANATION_TEXT}</p>
      <p>{FIELD_VALIDATION_TEXT}</p>
      <p>{NON_CONFORMITY_TEXT}</p>
      <p>
        Prioridade operacional = {VEGETATION_MODEL.priorityWeights.heightRisk} × risco de altura
        + {VEGETATION_MODEL.priorityWeights.ndvi} × NDVI
        + {VEGETATION_MODEL.priorityWeights.rainfall} × chuva 5 dias
        + {VEGETATION_MODEL.priorityWeights.daysSinceMowing} × dias desde a última roçada (escala 0–100).
      </p>
      <p>Versão do modelo: {VEGETATION_MODEL.modelVersion} · calibração {VEGETATION_MODEL.heightCalibration.version} (demonstrativa).</p>
    </div>
  </section>
);

const Field = ({ label, value }: { label: string; value: string }) => (
  <div>
    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
    <div className="text-[13px] font-bold tabular-nums leading-tight">{value}</div>
  </div>
);

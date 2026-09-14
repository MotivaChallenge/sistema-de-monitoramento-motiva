import { useMemo } from "react";
import { Sprout, AlertTriangle, Calculator } from "lucide-react";
import { useFieldHeightMeasurements, useSatelliteReadings } from "@/hooks/useVegiaData";
import {
  ACTIVE_CALIBRATION,
  CONFIDENCE_LABEL,
  ESTIMATE_DISCLAIMER,
  MAINTENANCE_LABEL,
  MAINTENANCE_THRESHOLDS,
  estimateHeight,
  validateCalibration,
  type MaintenanceLevel,
} from "@/lib/composite-height";

const n = (v: number | null | undefined, d = 3) =>
  v == null || !Number.isFinite(v) ? "—" : v.toFixed(d).replace(".", ",");

const LEVEL_CLASS: Record<MaintenanceLevel, string> = {
  normal: "bg-primary/10 text-primary border-primary/25",
  atencao: "bg-tertiary/12 text-tertiary border-tertiary/30",
  manutencao: "bg-tertiary/15 text-tertiary border-tertiary/40",
  critico: "bg-destructive/10 text-destructive border-destructive/25",
};

const Line = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex items-baseline justify-between gap-4 py-1.5 border-b border-border/30 last:border-0">
    <span className="text-[11.5px] text-muted-foreground">{label}</span>
    <span className="text-[12.5px] font-medium tabular-nums text-right">{value}</span>
  </div>
);

/**
 * Estimativa de altura pelo índice composto NDVI/EVI/SAVI, com heterogeneidade
 * das medições de campo, confiança, nível de manutenção, qualidade temporal do
 * dado e o passo a passo do cálculo.
 */
export const CompositeHeightPanel = ({
  segmentId,
  className = "",
}: {
  segmentId?: string;
  className?: string;
}) => {
  const { data: readings = [] } = useSatelliteReadings();
  const { data: field = [] } = useFieldHeightMeasurements(segmentId);

  const reading = useMemo(() => {
    if (!segmentId) return null;
    const mine = readings
      .filter((r) => r.segmentId === segmentId && r.ndviMedian != null && r.eviMedian != null && r.saviMedian != null)
      .sort((a, b) => (a.readAt < b.readAt ? 1 : -1));
    return mine[0] ?? null;
  }, [readings, segmentId]);

  const estimate = useMemo(() => {
    if (!reading) return null;
    const heights = field.map((m) => m.alturaCm);
    const lastField = field[0]?.measuredAt ?? null;
    return estimateHeight(
      { ndvi: reading.ndviMedian, evi: reading.eviMedian, savi: reading.saviMedian },
      {
        fieldMeasurementsCm: heights,
        satelliteDate: reading.readAt.slice(0, 10),
        fieldMeasurementDate: lastField,
      }
    );
  }, [reading, field]);

  const validation = useMemo(() => validateCalibration(), []);

  return (
    <section className={`bg-surface-lowest rounded-xl border border-border/40 shadow-card p-4 md:p-5 space-y-5 ${className}`}>
      <div>
        <h2 className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-wider">
          <Sprout className="h-4 w-4 text-primary" /> Estimativa de altura por índices
        </h2>
        <p className="text-[11.5px] text-muted-foreground mt-1 leading-relaxed max-w-3xl">
          {ESTIMATE_DISCLAIMER} O índice composto combina NDVI, EVI e SAVI; a reta que converte esse índice em
          centímetros é ajustada com as medições de régua feitas em campo.
        </p>
      </div>

      {estimate ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-lg border border-border/40 bg-surface-low p-4">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Altura estimada</p>
              <p className="text-3xl font-semibold tabular-nums mt-1">
                {n(estimate.estimatedHeightCm, 1)} <span className="text-base font-normal">cm</span>
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">Estimativa de modelo, não medição do satélite.</p>
              {estimate.maintenance && (
                <span
                  className={`inline-block mt-3 px-2.5 py-1 rounded-md border text-[11px] font-semibold uppercase tracking-wider ${LEVEL_CLASS[estimate.maintenance]}`}
                >
                  {MAINTENANCE_LABEL[estimate.maintenance]}
                </span>
              )}
            </div>

            <div className="rounded-lg border border-border/40 bg-surface-low p-4">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">Índice de vegetação</p>
              <p className="text-2xl font-semibold tabular-nums">{n(estimate.vegetationIndex)}</p>
              <div className="mt-3">
                <Line label="NDVI" value={n(estimate.indices?.ndvi)} />
                <Line label="EVI" value={n(estimate.indices?.evi)} />
                <Line label="SAVI" value={n(estimate.indices?.savi)} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-lg border border-border/40 p-4">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">Medições de campo</p>
              <Line label="Amostras" value={estimate.field.n} />
              <Line
                label="Faixa observada"
                value={
                  estimate.field.n > 0 ? `${n(estimate.field.minCm, 0)}–${n(estimate.field.maxCm, 0)} cm` : "—"
                }
              />
              <Line label="Média" value={estimate.field.meanCm != null ? `${n(estimate.field.meanCm, 1)} cm` : "—"} />
              <Line label="Desvio padrão" value={estimate.field.sdCm != null ? `${n(estimate.field.sdCm, 1)} cm` : "—"} />
              <Line label="Heterogeneidade" value={estimate.field.heterogeneity.toUpperCase()} />
              <Line label="Confiança" value={CONFIDENCE_LABEL[estimate.confidence].toUpperCase()} />
            </div>

            <div className="rounded-lg border border-border/40 p-4">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">Qualidade do dado</p>
              <Line label="Imagem de satélite" value={estimate.temporal.satelliteDate ?? "—"} />
              <Line label="Medição em campo" value={estimate.temporal.fieldMeasurementDate ?? "—"} />
              <Line
                label="Defasagem"
                value={
                  estimate.temporal.temporalDifferenceDays != null
                    ? `${estimate.temporal.temporalDifferenceDays} dia(s)`
                    : "—"
                }
              />
              <Line
                label="Níveis de manutenção"
                value={`≤${MAINTENANCE_THRESHOLDS.normalMax} · ≤${MAINTENANCE_THRESHOLDS.attentionMax} · ≤${MAINTENANCE_THRESHOLDS.maintenanceMax} cm`}
              />
            </div>
          </div>

          <details className="rounded-lg border border-border/40 bg-surface-low p-3.5">
            <summary className="flex items-center gap-2 cursor-pointer text-[12px] font-semibold">
              <Calculator className="h-3.5 w-3.5 text-primary" /> Como foi calculado?
            </summary>
            <div className="mt-3 space-y-1.5 font-mono text-[11.5px] leading-relaxed">
              {estimate.steps.map((s) => (
                <p key={s}>{s}</p>
              ))}
            </div>
          </details>
        </>
      ) : (
        <p className="text-[12px] text-muted-foreground">
          Sem leitura orbital com NDVI, EVI e SAVI para este trecho — a estimativa exige os três índices.
        </p>
      )}

      {/* Validação com os pontos medidos em campo */}
      <div>
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
          Validação com medições reais ({validation.length} ponto(s) de calibração)
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-[12px] min-w-[560px]">
            <thead>
              <tr className="text-[10.5px] uppercase tracking-wider text-muted-foreground border-b border-border/50">
                <th className="text-left py-2 font-medium">Ponto</th>
                <th className="text-right py-2 font-medium">Índice</th>
                <th className="text-right py-2 font-medium">Real</th>
                <th className="text-right py-2 font-medium">Estimado</th>
                <th className="text-right py-2 font-medium">Erro</th>
                <th className="text-right py-2 font-medium">Erro %</th>
                <th className="text-right py-2 font-medium">Faixa</th>
              </tr>
            </thead>
            <tbody>
              {validation.map((v) => (
                <tr key={v.id} className="border-b border-border/30 last:border-0">
                  <td className="py-2 font-medium">{v.label}</td>
                  <td className="py-2 text-right tabular-nums">{n(v.vegetationIndex)}</td>
                  <td className="py-2 text-right tabular-nums">{n(v.realCm, 1)} cm</td>
                  <td className="py-2 text-right tabular-nums">{n(v.estimatedCm, 1)} cm</td>
                  <td className="py-2 text-right tabular-nums">{n(v.absoluteErrorCm, 1)} cm</td>
                  <td className="py-2 text-right tabular-nums">{n(v.percentErro, 1)}%</td>
                  <td className="py-2 text-right tabular-nums">
                    {v.field.minCm != null ? `${n(v.field.minCm, 0)}–${n(v.field.maxCm, 0)} cm` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-lg border border-tertiary/30 bg-surface-low p-3.5">
        <p className="flex items-center gap-2 text-[12px] font-semibold mb-1.5">
          <AlertTriangle className="h-3.5 w-3.5 text-tertiary" /> Limitações
        </p>
        <ul className="text-[11.5px] text-muted-foreground space-y-1 leading-relaxed">
          <li>
            • Reta vigente: H = {n(ACTIVE_CALIBRATION.a, 1)} × V {ACTIVE_CALIBRATION.b < 0 ? "−" : "+"}{" "}
            {n(Math.abs(ACTIVE_CALIBRATION.b), 1)} cm, ajustada com {ACTIVE_CALIBRATION.nPoints} ponto(s) de campo.
          </li>
          <li>• Prova de conceito: dois pontos não definem um modelo universal — cada novo ponto reajusta a reta.</li>
          <li>• A faixa mostrada é a variação das amostras de campo, não um intervalo de confiança estatístico.</li>
          {validation
            .filter((v) => v.note)
            .map((v) => (
              <li key={v.id}>
                • {v.label}: {v.note}
              </li>
            ))}
        </ul>
      </div>
    </section>
  );
};

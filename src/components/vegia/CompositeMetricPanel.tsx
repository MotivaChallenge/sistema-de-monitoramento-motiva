import { useMemo } from "react";
import { Sigma, AlertTriangle } from "lucide-react";
import { useFieldHeightMeasurements, useSatelliteReadings } from "@/hooks/useVegiaData";
import {
  correlationMatrix, explainedVarianceFirstPC, vif,
} from "@/lib/vegetation-correlation";
import {
  buildNormalizers, compositeMetric, fitWeightsNNLS, fitWeightsPCA, EQUAL_WEIGHTS,
  METRIC_INDEXES, MIN_SAMPLES_REGRESSION, metricError, normalizeSample, normalizeWeights,
  type IndexSample,
} from "@/lib/vegetation-metric";
import { srviFromNdvi } from "@/lib/spectral-indices";

const fmt = (n: number | null | undefined, d = 2) =>
  n == null || !Number.isFinite(n) ? "—" : n.toFixed(d).replace(".", ",");

const LABELS: Record<string, string> = { ndvi: "NDVI", evi: "EVI", savi: "SAVI" };

/**
 * Métrica composta M = (α·NDVI + β·EVI + γ·SAVI) / (α+β+γ) sobre índices
 * normalizados, com os pesos estimados dos próprios dados (PCA ou regressão
 * não negativa contra medições de campo) e o diagnóstico de redundância.
 */
export const CompositeMetricPanel = () => {
  const { data: readings = [], isLoading } = useSatelliteReadings();
  const { data: field = [] } = useFieldHeightMeasurements();

  const rows = useMemo<(IndexSample & { segmentId: string })[]>(
    () =>
      readings
        .filter(r => r.ndviMedian != null && r.eviMedian != null && r.saviMedian != null && r.validPixels >= 20)
        .map(r => ({ segmentId: r.segmentId, ndvi: r.ndviMedian!, evi: r.eviMedian!, savi: r.saviMedian! })),
    [readings]
  );

  const analysis = useMemo(() => {
    if (rows.length < 3) return null;
    const columns = METRIC_INDEXES.map(k => rows.map(r => r[k]));
    const srviCol = rows.map(r => srviFromNdvi(r.ndvi) ?? 0);
    const pearsonM = correlationMatrix(columns);
    const spearmanM = correlationMatrix(columns, "spearman");
    const vifs = vif(columns);
    const pc1 = explainedVarianceFirstPC(columns);
    const srviVsNdvi = correlationMatrix([columns[0], srviCol], "spearman")[0][1];
    const norm = buildNormalizers(rows);

    // Pares leitura × medição de campo (mesma seção), quando existirem.
    const byField = new Map<string, number[]>();
    for (const m of field) {
      const arr = byField.get(m.segmentId) ?? [];
      arr.push(m.alturaCm);
      byField.set(m.segmentId, arr);
    }
    const paired = rows
      .map(r => {
        const v = byField.get(r.segmentId);
        return v?.length ? { row: r, alturaCm: v.reduce((a, x) => a + x, 0) / v.length } : null;
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);

    const pca = fitWeightsPCA(rows);
    const reg = fitWeightsNNLS(paired.map(p => p.row), paired.map(p => p.alturaCm), norm);
    const equal = normalizeWeights(EQUAL_WEIGHTS);

    const errorFor = (w: typeof equal) =>
      paired.length >= 3
        ? metricError(paired.map(p => compositeMetric(normalizeSample(p.row, norm), w) ?? 0), paired.map(p => p.alturaCm))
        : null;

    const example = rows[0];
    const exampleNorm = normalizeSample(example, norm);
    const chosen = reg.mode === "regressao" ? reg : pca;

    return {
      n: rows.length, pearsonM, spearmanM, vifs, pc1, srviVsNdvi,
      pca, reg, equal, paired: paired.length,
      errors: { igual: errorFor(equal), pca: errorFor(pca.weights), regressao: errorFor(reg.weights) },
      example, exampleNorm, chosen,
      exampleM: compositeMetric(exampleNorm, chosen.weights),
    };
  }, [rows, field]);

  if (isLoading) return null;

  return (
    <section className="bg-surface-lowest rounded-xl border border-border/40 shadow-card p-4 md:p-5 space-y-5">
      <div>
        <h2 className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-wider">
          <Sigma className="h-4 w-4 text-primary" /> Métrica composta de vegetação
        </h2>
        <p className="text-[11.5px] text-muted-foreground mt-1 leading-relaxed max-w-3xl">
          M = (α·NDVI + β·EVI + γ·SAVI) / (α + β + γ), calculada sobre índices normalizados (mediana e IQR,
          recorte em 0–1) para que nenhum domine por escala. Os pesos são estimados dos dados — nunca fixados
          à mão. O SRVI (NIR/RED) é apresentado apenas no diagnóstico: ele é uma função exata do NDVI
          (SR = (1+NDVI)/(1−NDVI)) e por isso não entra na combinação.
        </p>
      </div>

      {!analysis ? (
        <p className="text-[12px] text-muted-foreground">
          Sem leituras orbitais com EVI/SAVI suficientes para o diagnóstico.
        </p>
      ) : (
        <>
          {/* Correlação */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-4">
            <div className="overflow-x-auto">
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
                Correlação entre índices ({analysis.n} leituras) — Pearson / Spearman
              </p>
              <table className="w-full text-[12px] min-w-[380px]">
                <thead>
                  <tr className="text-[10.5px] uppercase tracking-wider text-muted-foreground border-b border-border/50">
                    <th className="text-left py-2 font-medium">Índice</th>
                    {METRIC_INDEXES.map(k => <th key={k} className="text-right py-2 font-medium">{LABELS[k]}</th>)}
                    <th className="text-right py-2 font-medium">VIF</th>
                  </tr>
                </thead>
                <tbody>
                  {METRIC_INDEXES.map((k, i) => (
                    <tr key={k} className="border-b border-border/30 last:border-0">
                      <td className="py-2 font-medium">{LABELS[k]}</td>
                      {METRIC_INDEXES.map((_, j) => (
                        <td key={j} className="py-2 text-right tabular-nums">
                          {i === j ? "1,00" : `${fmt(analysis.pearsonM[i][j], 3)} / ${fmt(analysis.spearmanM[i][j], 3)}`}
                        </td>
                      ))}
                      <td className={`py-2 text-right tabular-nums font-semibold ${analysis.vifs[i] > 10 ? "text-destructive" : ""}`}>
                        {Number.isFinite(analysis.vifs[i]) ? fmt(analysis.vifs[i], 1) : "∞"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="rounded-lg border border-tertiary/30 bg-surface-low p-3.5 space-y-2">
              <p className="flex items-center gap-2 text-[12px] font-semibold">
                <AlertTriangle className="h-3.5 w-3.5 text-tertiary" /> Redundância medida
              </p>
              <p className="text-[11.5px] text-muted-foreground leading-relaxed">
                O primeiro componente principal explica <strong>{fmt(analysis.pc1 * 100, 1)}%</strong> da
                variância dos três índices. VIF acima de 10 indica que o índice é reconstituível a partir
                dos outros. Correlação de postos SRVI × NDVI:{" "}
                <strong>{fmt(analysis.srviVsNdvi, 3)}</strong> (colinearidade algébrica).
              </p>
            </div>
          </div>

          {/* Pesos */}
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
              Pesos por regime de estimativa
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-[12px] min-w-[520px]">
                <thead>
                  <tr className="text-[10.5px] uppercase tracking-wider text-muted-foreground border-b border-border/50">
                    <th className="text-left py-2 font-medium">Regime</th>
                    <th className="text-right py-2 font-medium">α (NDVI)</th>
                    <th className="text-right py-2 font-medium">β (EVI)</th>
                    <th className="text-right py-2 font-medium">γ (SAVI)</th>
                    <th className="text-right py-2 font-medium">MAE</th>
                    <th className="text-right py-2 font-medium">RMSE</th>
                  </tr>
                </thead>
                <tbody>
                  {([
                    { label: "Iguais (sem alvo)", w: analysis.equal, e: analysis.errors.igual },
                    { label: "PCA (estrutura dos dados)", w: analysis.pca.weights, e: analysis.errors.pca },
                    { label: "Regressão (campo)", w: analysis.reg.weights, e: analysis.errors.regressao },
                  ]).map(r => (
                    <tr key={r.label} className="border-b border-border/30 last:border-0">
                      <td className="py-2 font-medium">{r.label}</td>
                      <td className="py-2 text-right tabular-nums">{fmt(r.w.ndvi, 3)}</td>
                      <td className="py-2 text-right tabular-nums">{fmt(r.w.evi, 3)}</td>
                      <td className="py-2 text-right tabular-nums">{fmt(r.w.savi, 3)}</td>
                      <td className="py-2 text-right tabular-nums">{r.e ? `${fmt(r.e.mae, 1)} cm` : "—"}</td>
                      <td className="py-2 text-right tabular-nums">{r.e ? `${fmt(r.e.rmse, 1)} cm` : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {analysis.paired < MIN_SAMPLES_REGRESSION && (
              <p className="text-[11.5px] text-tertiary mt-2">
                Calibração pendente — {analysis.paired} de {MIN_SAMPLES_REGRESSION} medições de campo pareadas.
                Até lá os pesos vêm da estrutura dos dados (PCA), não da capacidade de prever altura.
              </p>
            )}
            {analysis.chosen.warning && (
              <p className="text-[11.5px] text-muted-foreground mt-1">{analysis.chosen.warning}</p>
            )}
          </div>

          {/* Exemplo numérico */}
          <div className="rounded-lg border border-border/40 bg-surface-low p-3.5">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
              Exemplo numérico — trecho {(analysis.example as IndexSample & { segmentId?: string }).segmentId ?? "—"}
            </p>
            <p className="text-[12px] leading-relaxed">
              Bruto: NDVI {fmt(analysis.example.ndvi, 3)} · EVI {fmt(analysis.example.evi, 3)} · SAVI {fmt(analysis.example.savi, 3)}<br />
              Normalizado: {fmt(analysis.exampleNorm.ndvi, 3)} · {fmt(analysis.exampleNorm.evi, 3)} · {fmt(analysis.exampleNorm.savi, 3)}<br />
              Pesos ({analysis.chosen.mode}): {fmt(analysis.chosen.weights.ndvi, 3)} · {fmt(analysis.chosen.weights.evi, 3)} · {fmt(analysis.chosen.weights.savi, 3)}<br />
              <strong>M = {fmt(analysis.exampleM, 3)}</strong> (0 = solo exposto, 1 = vigor máximo da malha)
            </p>
          </div>

          <ul className="text-[11.5px] text-muted-foreground space-y-1.5 leading-relaxed">
            <li>• NDVI, EVI, SAVI e SRVI derivam das mesmas bandas (NIR/RED, + azul no EVI): redundância alta é esperada.</li>
            <li>• Sem medição de campo nenhum conjunto de pesos é “ótimo” — apenas “sem alvo, pesos por estrutura”.</li>
            <li>• A métrica é analítica e paralela: status, IRC e ordens de serviço continuam usando o modelo NDVI→altura validado.</li>
            <li>• Se a combinação linear não reduzir o erro frente ao NDVI puro, o caminho é usar bandas SWIR (NDMI/NBR) ou modelo não linear com tempo desde a última roçada.</li>
          </ul>
        </>
      )}
    </section>
  );
};

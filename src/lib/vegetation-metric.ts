/**
 * Métrica composta de vigor da vegetação a partir de vários índices espectrais.
 *
 *   M = (α·nNDVI + β·nEVI + γ·nSAVI) / (α + β + γ),  M ∈ [0, 1]
 *
 * Cada índice é normalizado ANTES da combinação (mediana/IQR do próprio
 * conjunto, com recorte em 0–1), de modo que nenhum domine por causa da escala
 * — o EVI vai até 2,5 e o NDVI até 1.
 *
 * Os pesos NÃO são arbitrários: são estimados a partir dos dados em um de três
 * regimes, escolhido pelo que a base permite no momento:
 *  - "igual"      → sem alvo e sem estrutura confiável: α = β = γ = 1;
 *  - "pca"        → pesos ∝ cargas do 1º componente principal (usa só a
 *                   estrutura de covariância dos índices, sem variável-alvo);
 *  - "regressao"  → mínimos quadrados não negativos contra a altura medida em
 *                   campo (única forma estatisticamente defensável de dizer que
 *                   um índice "importa mais" para o fenômeno).
 */
import { covarianceMatrix, mean, median, powerIteration, quantile, zscoreColumns } from "./vegetation-correlation";

export type MetricIndexKey = "ndvi" | "evi" | "savi";
export const METRIC_INDEXES: MetricIndexKey[] = ["ndvi", "evi", "savi"];

/** Amostra usada tanto no ajuste quanto no cálculo da métrica. */
export type IndexSample = Record<MetricIndexKey, number>;

export type WeightMode = "igual" | "pca" | "regressao";

export interface Weights extends Record<MetricIndexKey, number> {}

export interface WeightFit {
  mode: WeightMode;
  weights: Weights;
  /** Amostras usadas no ajuste. */
  n: number;
  /** Aviso quando os pesos não têm suporte estatístico suficiente. */
  warning: string | null;
}

/** Mínimo de medições pareadas para estimar três pesos com sentido. */
export const MIN_SAMPLES_REGRESSION = 30;
/** Mínimo de leituras para uma estrutura de covariância estável. */
export const MIN_SAMPLES_PCA = 10;

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

export interface Normalizer {
  center: number;
  scale: number;
  /** Mapeia o valor bruto para 0–1. */
  apply: (x: number) => number;
}

/**
 * Normalização robusta: centro na mediana, escala em 1,5 × IQR.
 * É invariante a transformações lineares positivas (a·x + b) — trocar a escala
 * de um índice não altera sua influência na métrica.
 */
export const robustNormalizer = (values: number[]): Normalizer => {
  const finite = values.filter((v) => Number.isFinite(v));
  const center = median(finite);
  const iqr = quantile(finite, 0.75) - quantile(finite, 0.25);
  const fallback = Math.max(...finite.map((v) => Math.abs(v - center)), 0);
  const scale = iqr > 1e-9 ? 3 * iqr : fallback > 1e-9 ? 2 * fallback : 1;
  return { center, scale, apply: (x: number) => clamp01(0.5 + (x - center) / scale) };
};

export interface NormalizerSet extends Record<MetricIndexKey, Normalizer> {}

export const buildNormalizers = (rows: IndexSample[]): NormalizerSet => ({
  ndvi: robustNormalizer(rows.map((r) => r.ndvi)),
  evi: robustNormalizer(rows.map((r) => r.evi)),
  savi: robustNormalizer(rows.map((r) => r.savi)),
});

export const normalizeSample = (row: IndexSample, norm: NormalizerSet): IndexSample => ({
  ndvi: norm.ndvi.apply(row.ndvi),
  evi: norm.evi.apply(row.evi),
  savi: norm.savi.apply(row.savi),
});

/** Métrica composta sobre índices JÁ normalizados. Retorna null se a soma dos pesos for zero. */
export const compositeMetric = (normalized: IndexSample, weights: Weights): number | null => {
  const den = weights.ndvi + weights.evi + weights.savi;
  if (!(den > 0)) return null;
  const num = weights.ndvi * normalized.ndvi + weights.evi * normalized.evi + weights.savi * normalized.savi;
  return clamp01(num / den);
};

/** Conveniência: normaliza e combina em uma chamada. */
export const metricFromRaw = (row: IndexSample, norm: NormalizerSet, weights: Weights): number | null =>
  compositeMetric(normalizeSample(row, norm), weights);

export const EQUAL_WEIGHTS: Weights = { ndvi: 1, evi: 1, savi: 1 };

/** Normaliza os pesos para somarem 1 (facilita comparação entre modos). */
export const normalizeWeights = (w: Weights): Weights => {
  const s = w.ndvi + w.evi + w.savi;
  if (!(s > 0)) return { ...EQUAL_WEIGHTS };
  return { ndvi: w.ndvi / s, evi: w.evi / s, savi: w.savi / s };
};

/**
 * Pesos por PCA: cargas (em módulo) do primeiro componente principal dos
 * índices padronizados. Não usa variável-alvo — apenas a estrutura dos dados.
 */
export const fitWeightsPCA = (rows: IndexSample[]): WeightFit => {
  const n = rows.length;
  if (n < MIN_SAMPLES_PCA) {
    return {
      mode: "igual",
      weights: normalizeWeights(EQUAL_WEIGHTS),
      n,
      warning: `Leituras insuficientes para estimar a estrutura (${n} de ${MIN_SAMPLES_PCA}). Pesos iguais.`,
    };
  }
  const columns = zscoreColumns(METRIC_INDEXES.map((k) => rows.map((r) => r[k])));
  const { vector } = powerIteration(covarianceMatrix(columns));
  const abs = vector.map((x) => Math.abs(x));
  const sum = abs.reduce((a, x) => a + x, 0);
  if (!(sum > 0)) {
    return { mode: "igual", weights: normalizeWeights(EQUAL_WEIGHTS), n, warning: "Índices sem variabilidade." };
  }
  return {
    mode: "pca",
    weights: { ndvi: abs[0] / sum, evi: abs[1] / sum, savi: abs[2] / sum },
    n,
    warning:
      "PCA maximiza variância, não capacidade de prever altura. Serve como ponto de partida, não como calibração.",
  };
};

/**
 * Mínimos quadrados NÃO NEGATIVOS (gradiente projetado) da altura de campo
 * sobre os índices normalizados. Os coeficientes viram pesos.
 */
export const fitWeightsNNLS = (
  rows: IndexSample[],
  target: number[],
  norm?: NormalizerSet
): WeightFit => {
  const n = Math.min(rows.length, target.length);
  if (n < MIN_SAMPLES_REGRESSION) {
    return {
      mode: "igual",
      weights: normalizeWeights(EQUAL_WEIGHTS),
      n,
      warning: `Calibração pendente — ${n} de ${MIN_SAMPLES_REGRESSION} medições de campo pareadas.`,
    };
  }
  const normalizers = norm ?? buildNormalizers(rows);
  const X = rows.slice(0, n).map((r) => {
    const z = normalizeSample(r, normalizers);
    return [z.ndvi, z.evi, z.savi];
  });
  const y = target.slice(0, n);
  const my = mean(y);
  const yc = y.map((v) => v - my);

  let w = [1 / 3, 1 / 3, 1 / 3];
  // Passo do gradiente a partir da maior norma das colunas (estabilidade).
  const lip = Math.max(
    1e-6,
    ...[0, 1, 2].map((j) => X.reduce((a, row) => a + row[j] * row[j], 0) / n)
  );
  const step = 1 / (3 * lip);
  for (let it = 0; it < 5000; it++) {
    const grad = [0, 0, 0];
    for (let t = 0; t < n; t++) {
      const pred = X[t][0] * w[0] + X[t][1] * w[1] + X[t][2] * w[2];
      // Escala livre: comparamos a forma do preditor com o alvo centrado/escalado.
      const resid = pred - (yc[t] / (Math.max(1e-9, Math.sqrt(yc.reduce((a, v) => a + v * v, 0) / n))) / 4 + 0.5);
      grad[0] += resid * X[t][0];
      grad[1] += resid * X[t][1];
      grad[2] += resid * X[t][2];
    }
    const next = w.map((v, j) => Math.max(0, v - (step * grad[j]) / n));
    const delta = next.reduce((a, v, j) => a + Math.abs(v - w[j]), 0);
    w = next;
    if (delta < 1e-12) break;
  }
  const sum = w.reduce((a, v) => a + v, 0);
  if (!(sum > 0)) {
    return {
      mode: "igual",
      weights: normalizeWeights(EQUAL_WEIGHTS),
      n,
      warning: "Regressão não convergiu para pesos positivos. Pesos iguais.",
    };
  }
  return {
    mode: "regressao",
    weights: { ndvi: w[0] / sum, evi: w[1] / sum, savi: w[2] / sum },
    n,
    warning: null,
  };
};

/** Escolhe automaticamente o melhor regime de pesos que os dados permitem. */
export const fitWeights = (rows: IndexSample[], target?: number[]): WeightFit => {
  if (target && target.length >= MIN_SAMPLES_REGRESSION) {
    const fit = fitWeightsNNLS(rows, target);
    if (fit.mode === "regressao") return fit;
  }
  return fitWeightsPCA(rows);
};

/** Erro da métrica frente a um alvo observado, após reescalar M para a faixa do alvo. */
export const metricError = (metric: number[], target: number[]): { mae: number; rmse: number; n: number } | null => {
  const n = Math.min(metric.length, target.length);
  if (n < 3) return null;
  // Ajuste linear simples M → alvo (a métrica é adimensional; o alvo é cm).
  const mm = mean(metric.slice(0, n));
  const mt = mean(target.slice(0, n));
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) {
    num += (metric[i] - mm) * (target[i] - mt);
    den += (metric[i] - mm) ** 2;
  }
  const a = den > 0 ? num / den : 0;
  const b = mt - a * mm;
  let abs = 0, sq = 0;
  for (let i = 0; i < n; i++) {
    const e = a * metric[i] + b - target[i];
    abs += Math.abs(e); sq += e * e;
  }
  return { mae: abs / n, rmse: Math.sqrt(sq / n), n };
};

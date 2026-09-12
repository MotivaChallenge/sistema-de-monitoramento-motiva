/**
 * Modelo de estimativa de altura da vegetação a partir dos índices espectrais.
 *
 * Base:  altura(cm) = (índice − 0,15) × 90, truncada em 0.
 *
 * Correções aplicadas (paridade com supabase/functions/_shared/height-model.ts,
 * garantida pelo teste `height-model.test.ts`):
 *  - usa a MEDIANA do NDVI no trecho (robusta a asfalto/sombra), não a média;
 *  - acima de NDVI 0,80 a relação satura: nesse regime o SAVI é usado como índice
 *    e o trecho é marcado como "saturação espectral";
 *  - incerteza por trecho = √(resíduo² + espacial² + envelhecimento² + saturação²),
 *    em vez de um ±13 cm fixo para toda a malha.
 */
export const NDVI_FLOOR = 0.15;
export const NDVI_SATURATION = 0.80;
export const HEIGHT_SLOPE = 90;
/** Resíduo do modelo frente às medições de campo disponíveis (cm). */
export const MODEL_RESIDUAL_CM = 13;
/** Crescimento médio usado para envelhecer a incerteza entre leituras (cm/dia). */
export const GROWTH_CM_PER_DAY = 0.5;

export interface HeightInput {
  ndviMedian: number | null;
  saviMedian?: number | null;
  ndviStd?: number | null;
  validPixels?: number;
  /** Dias desde a última leitura orbital válida. */
  ageDays?: number;
}

export interface HeightResult {
  cm: number | null;
  uncertaintyCm: number | null;
  saturated: boolean;
  indexUsed: "ndvi" | "savi";
}

/** Coeficientes publicados pela calibração de campo (src/lib/calibration.ts). */
export interface HeightCalibration {
  slope: number;
  intercept: number;
  /** Erro de previsão medido (RMSE de LOOCV) — substitui MODEL_RESIDUAL_CM. */
  residualCm: number;
}

export const estimateHeight = (i: HeightInput, calib?: HeightCalibration | null): HeightResult => {
  if (i.ndviMedian == null || !Number.isFinite(i.ndviMedian)) {
    return { cm: null, uncertaintyCm: null, saturated: false, indexUsed: "ndvi" };
  }
  const saturated = i.ndviMedian > NDVI_SATURATION;
  let index = i.ndviMedian;
  let indexUsed: "ndvi" | "savi" = "ndvi";
  if (saturated && i.saviMedian != null && Number.isFinite(i.saviMedian)) {
    index = Math.min(1, Math.max(i.ndviMedian, i.saviMedian));
    indexUsed = "savi";
  }
  const slope = calib?.slope ?? HEIGHT_SLOPE;
  const cm = calib
    ? Math.max(0, Math.round(calib.slope * index + calib.intercept))
    : Math.max(0, Math.round((index - NDVI_FLOOR) * HEIGHT_SLOPE));
  const n = Math.max(1, i.validPixels ?? 1);
  const std = i.ndviStd != null && Number.isFinite(i.ndviStd) ? i.ndviStd : 0;
  const spatial = (Math.abs(slope) * std) / Math.sqrt(n);
  const aging = GROWTH_CM_PER_DAY * Math.max(0, i.ageDays ?? 0);
  const saturationPenalty = saturated ? 5 : 0;
  const residual = calib?.residualCm ?? MODEL_RESIDUAL_CM;
  const uncertaintyCm =
    Math.round(Math.sqrt(residual ** 2 + spatial ** 2 + aging ** 2 + saturationPenalty ** 2) * 10) / 10;
  return { cm, uncertaintyCm, saturated, indexUsed };
};

/** Compatibilidade: altura a partir de um NDVI único, sem metadados de qualidade. */
export const estimateHeightCm = (ndvi: number): number =>
  Math.max(0, Math.round((ndvi - NDVI_FLOOR) * HEIGHT_SLOPE));

export const heightModelSummary =
  "altura (cm) = (NDVI − 0,15) × 90 sobre a mediana do índice no trecho — regressão linear calibrada com medições de campo, " +
  "aplicada igualmente no satélite e na plataforma. Acima de NDVI 0,80 o SAVI substitui o NDVI (saturação espectral).";

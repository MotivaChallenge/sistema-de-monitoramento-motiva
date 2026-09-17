/**
 * Modelo de altura compartilhado (paridade com src/lib/height-model.ts).
 * Qualquer alteração aqui deve ser espelhada no front — coberto por teste de paridade.
 */
export const NDVI_FLOOR = 0.15;
export const NDVI_SATURATION = 0.80;
export const HEIGHT_SLOPE = 90;
export const MODEL_RESIDUAL_CM = 13;
export const MODEL_ID = "composite-ndvi-evi-savi";
export const MODEL_VERSION = "v2.0";
/** Crescimento médio usado para envelhecer a incerteza (cm/dia). */
export const GROWTH_CM_PER_DAY = 0.5;

/* Modelo composto calibrado (NDVI + EVI + SAVI). */
export const COMPOSITE_W_NDVI = 0.10;
export const COMPOSITE_W_EVI = 0.55;
export const COMPOSITE_W_SAVI = 0.35;
export const COMPOSITE_SLOPE = 163.4;
export const COMPOSITE_INTERCEPT = -28.2;
export const COMPOSITE_RESIDUAL_CM = 2.9;
export const COMPOSITE_NOISE_SINGLE_IMAGE_CM = 1.3;

export interface HeightInput {
  ndviMedian: number | null;
  eviMedian?: number | null;
  saviMedian?: number | null;
  ndviStd?: number | null;
  validPixels?: number;
  images?: number;
  ageDays?: number;
}
export interface HeightResult { cm: number | null; uncertaintyCm: number | null; saturated: boolean; indexUsed: "ndvi" | "savi" | "composto"; }

export const estimateHeight = (i: HeightInput): HeightResult => {
  if (i.ndviMedian == null || !Number.isFinite(i.ndviMedian)) return { cm: null, uncertaintyCm: null, saturated: false, indexUsed: "ndvi" };
  const saturated = i.ndviMedian > NDVI_SATURATION;
  const aging = GROWTH_CM_PER_DAY * Math.max(0, i.ageDays ?? 0);
  const saturationPenalty = saturated ? 5 : 0;

  if (i.eviMedian != null && Number.isFinite(i.eviMedian) && i.saviMedian != null && Number.isFinite(i.saviMedian)) {
    const v = COMPOSITE_W_NDVI * i.ndviMedian + COMPOSITE_W_EVI * i.eviMedian + COMPOSITE_W_SAVI * i.saviMedian;
    const cm = Math.max(0, Math.round(COMPOSITE_SLOPE * v + COMPOSITE_INTERCEPT));
    const noise = COMPOSITE_NOISE_SINGLE_IMAGE_CM / Math.sqrt(Math.max(1, i.images ?? 1));
    const uncertaintyCm = Math.round(Math.sqrt(COMPOSITE_RESIDUAL_CM ** 2 + noise ** 2 + aging ** 2 + saturationPenalty ** 2) * 10) / 10;
    return { cm, uncertaintyCm, saturated, indexUsed: "composto" };
  }

  let index = i.ndviMedian;
  let indexUsed: "ndvi" | "savi" | "composto" = "ndvi";
  if (saturated && i.saviMedian != null && Number.isFinite(i.saviMedian)) {
    index = Math.min(1, Math.max(i.ndviMedian, i.saviMedian));
    indexUsed = "savi";
  }
  const cm = Math.max(0, Math.round((index - NDVI_FLOOR) * HEIGHT_SLOPE));
  const n = Math.max(1, i.validPixels ?? 1);
  const std = i.ndviStd != null && Number.isFinite(i.ndviStd) ? i.ndviStd : 0;
  const spatial = (HEIGHT_SLOPE * std) / Math.sqrt(n);
  const uncertaintyCm = Math.round(Math.sqrt(MODEL_RESIDUAL_CM ** 2 + spatial ** 2 + aging ** 2 + saturationPenalty ** 2) * 10) / 10;
  return { cm, uncertaintyCm, saturated, indexUsed };
};

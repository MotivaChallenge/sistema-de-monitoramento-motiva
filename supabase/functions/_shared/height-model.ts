/**
 * Modelo de altura compartilhado (paridade com src/lib/height-model.ts).
 * Qualquer alteração aqui deve ser espelhada no front — coberto por teste de paridade.
 */
export const NDVI_FLOOR = 0.15;
export const NDVI_SATURATION = 0.80;
export const HEIGHT_SLOPE = 90;
export const MODEL_RESIDUAL_CM = 13;
export const MODEL_ID = "ndvi-linear";
export const MODEL_VERSION = "v1.0";
/** Crescimento médio usado para envelhecer a incerteza (cm/dia). */
export const GROWTH_CM_PER_DAY = 0.5;

export interface HeightInput {
  ndviMedian: number | null;
  saviMedian?: number | null;
  ndviStd?: number | null;
  validPixels?: number;
  ageDays?: number;
}
export interface HeightResult { cm: number | null; uncertaintyCm: number | null; saturated: boolean; indexUsed: "ndvi" | "savi"; }

export const estimateHeight = (i: HeightInput): HeightResult => {
  if (i.ndviMedian == null || !Number.isFinite(i.ndviMedian)) return { cm: null, uncertaintyCm: null, saturated: false, indexUsed: "ndvi" };
  const saturated = i.ndviMedian > NDVI_SATURATION;
  let index = i.ndviMedian;
  let indexUsed: "ndvi" | "savi" = "ndvi";
  if (saturated && i.saviMedian != null && Number.isFinite(i.saviMedian)) {
    index = Math.min(1, Math.max(i.ndviMedian, i.saviMedian));
    indexUsed = "savi";
  }
  const cm = Math.max(0, Math.round((index - NDVI_FLOOR) * HEIGHT_SLOPE));
  const n = Math.max(1, i.validPixels ?? 1);
  const std = i.ndviStd != null && Number.isFinite(i.ndviStd) ? i.ndviStd : 0;
  const spatial = (HEIGHT_SLOPE * std) / Math.sqrt(n);
  const aging = GROWTH_CM_PER_DAY * Math.max(0, i.ageDays ?? 0);
  const saturationPenalty = saturated ? 5 : 0;
  const uncertaintyCm = Math.round(Math.sqrt(MODEL_RESIDUAL_CM ** 2 + spatial ** 2 + aging ** 2 + saturationPenalty ** 2) * 10) / 10;
  return { cm, uncertaintyCm, saturated, indexUsed };
};

/**
 * Modelo de estimativa de altura da vegetação a partir do NDVI.
 * Calibrado com as leituras Sentinel-2 e as medições de campo disponíveis:
 *   altura(cm) = (NDVI - 0,15) * 90, truncada em 0.
 * O mesmo coeficiente é aplicado na Edge Function `gee-ndvi`, garantindo
 * que plataforma e pipeline orbital produzam o mesmo número.
 */
export const NDVI_FLOOR = 0.15;
export const HEIGHT_SLOPE = 90;

export const estimateHeightCm = (ndvi: number): number =>
  Math.max(0, Math.round((ndvi - NDVI_FLOOR) * HEIGHT_SLOPE));

export const heightModelSummary =
  "altura (cm) = (NDVI − 0,15) × 90 — regressão linear calibrada com medições de campo, aplicada igualmente no satélite e na plataforma.";

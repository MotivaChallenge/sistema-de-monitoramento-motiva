/**
 * Índices espectrais de vegetação (Sentinel-2 SR Harmonized).
 * BLUE = B2, RED = B4, NIR = B8 (refletância 0–1).
 *
 * As mesmas fórmulas são aplicadas no grafo do Earth Engine
 * (`supabase/functions/gee-ndvi`), garantindo paridade entre satélite e app.
 */

export type IndexKey = "ndvi" | "evi" | "savi";

export const SAVI_L_DEFAULT = 0.5;

/** Denominador considerado inválido (evita divisão por ~zero). */
const EPS = 1e-6;

export interface IndexMeta {
  key: IndexKey;
  label: string;
  formula: string;
  bands: string;
  range: [number, number];
  /** Modelo de altura validado para o índice; null = ainda não calibrado. */
  heightModel: string | null;
}

export const INDEX_META: Record<IndexKey, IndexMeta> = {
  ndvi: {
    key: "ndvi", label: "NDVI", formula: "(NIR − RED) / (NIR + RED)", bands: "B8, B4",
    range: [-1, 1], heightModel: "ndvi_linear_v1",
  },
  evi: {
    key: "evi", label: "EVI", formula: "2,5 × ((NIR − RED) / (NIR + 6·RED − 7,5·BLUE + 1))",
    bands: "B8, B4, B2", range: [-1, 2.5], heightModel: null,
  },
  savi: {
    key: "savi", label: "SAVI", formula: "((NIR − RED) / (NIR + RED + L)) × (1 + L), L = 0,5",
    bands: "B8, B4", range: [-1.5, 1.5], heightModel: null,
  },
};

const finite = (...v: number[]) => v.every((x) => Number.isFinite(x));

/** NDVI — retorna null quando o denominador é inválido. */
export const ndvi = (nir: number, red: number): number | null => {
  if (!finite(nir, red)) return null;
  const den = nir + red;
  return Math.abs(den) < EPS ? null : (nir - red) / den;
};

/** EVI — usa B8, B4 e B2. */
export const evi = (nir: number, red: number, blue: number): number | null => {
  if (!finite(nir, red, blue)) return null;
  const den = nir + 6 * red - 7.5 * blue + 1;
  return Math.abs(den) < EPS ? null : 2.5 * ((nir - red) / den);
};

/** SAVI — L = 0,5 por padrão, parametrizável. */
export const savi = (nir: number, red: number, L = SAVI_L_DEFAULT): number | null => {
  if (!finite(nir, red, L)) return null;
  const den = nir + red + L;
  return Math.abs(den) < EPS ? null : ((nir - red) / den) * (1 + L);
};

/** Valida a faixa esperada do índice; fora da faixa vira null (sem dados). */
export const validateIndex = (key: IndexKey, value: number | null): number | null => {
  if (value === null || !Number.isFinite(value)) return null;
  const [lo, hi] = INDEX_META[key].range;
  return value < lo || value > hi ? null : value;
};

/** Confiança a partir da quantidade de pixels válidos na estatística zonal. */
export const pixelConfidence = (validPixels: number): "alta" | "media" | "baixa" =>
  validPixels >= 100 ? "alta" : validPixels >= 20 ? "media" : "baixa";

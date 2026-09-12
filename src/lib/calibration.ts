/**
 * Calibração empírica do modelo de altura.
 *
 * Enquanto não existirem medições de campo pareadas com leituras orbitais, a
 * margem exibida é o resíduo assumido (±13 cm). Este módulo substitui esse
 * valor assumido por um número medido:
 *
 *  1. pareia cada medição de campo com a leitura de satélite do mesmo trecho
 *     dentro de uma janela de dias (padrão 7);
 *  2. ajusta por mínimos quadrados  altura_cm = a · índice + b;
 *  3. mede o erro de previsão por validação cruzada leave-one-out (LOOCV),
 *     que não reaproveita o ponto no próprio ajuste — é o erro honesto para
 *     um trecho novo;
 *  4. a incerteza publicada passa a ser o RMSE de LOOCV, e não mais ±13 cm.
 */
import { NDVI_SATURATION } from "./height-model";

/** Mínimo de pares para publicar uma calibração defensável. */
export const MIN_CALIBRATION_PAIRS = 12;
/** Janela padrão entre a medição de campo e a passagem do satélite (dias). */
export const DEFAULT_MAX_LAG_DAYS = 7;

export interface FieldMeasurement {
  segment_id: string;
  measured_at: string;
  altura_cm: number;
}

export interface SatelliteReading {
  segment_id: string;
  read_at: string;
  ndvi_median: number | null;
  savi_median?: number | null;
  saturated?: boolean | null;
}

export interface CalibrationPair {
  segmentId: string;
  index: number;
  heightCm: number;
  lagDays: number;
  indexUsed: "ndvi" | "savi";
}

const dayDiff = (a: string, b: string) =>
  Math.abs(new Date(a).getTime() - new Date(b).getTime()) / 86_400_000;

/** Índice efetivo da leitura, com a mesma regra de saturação do modelo. */
export const effectiveIndex = (r: SatelliteReading): { value: number; used: "ndvi" | "savi" } | null => {
  const ndvi = r.ndvi_median;
  if (ndvi == null || !Number.isFinite(ndvi)) return null;
  const saturated = r.saturated ?? ndvi > NDVI_SATURATION;
  if (saturated && r.savi_median != null && Number.isFinite(r.savi_median)) {
    return { value: Math.min(1, Math.max(ndvi, r.savi_median)), used: "savi" };
  }
  return { value: ndvi, used: "ndvi" };
};

/** Pareia medições de campo com a leitura orbital mais próxima no tempo. */
export const buildPairs = (
  measurements: FieldMeasurement[],
  readings: SatelliteReading[],
  maxLagDays = DEFAULT_MAX_LAG_DAYS,
): CalibrationPair[] => {
  const bySegment = new Map<string, SatelliteReading[]>();
  for (const r of readings) {
    const list = bySegment.get(r.segment_id) ?? [];
    list.push(r);
    bySegment.set(r.segment_id, list);
  }

  const pairs: CalibrationPair[] = [];
  for (const m of measurements) {
    const candidates = bySegment.get(m.segment_id) ?? [];
    let best: { r: SatelliteReading; lag: number } | null = null;
    for (const r of candidates) {
      const lag = dayDiff(m.measured_at, r.read_at);
      if (lag > maxLagDays) continue;
      if (!best || lag < best.lag) best = { r, lag };
    }
    if (!best) continue;
    const idx = effectiveIndex(best.r);
    if (!idx) continue;
    pairs.push({
      segmentId: m.segment_id,
      index: idx.value,
      heightCm: m.altura_cm,
      lagDays: Math.round(best.lag * 10) / 10,
      indexUsed: idx.used,
    });
  }
  return pairs;
};

export interface LinearFit {
  slope: number;
  intercept: number;
  r2: number;
}

/** Mínimos quadrados ordinários de altura sobre o índice. */
export const fitLinear = (pairs: CalibrationPair[]): LinearFit | null => {
  const n = pairs.length;
  if (n < 3) return null;
  const mx = pairs.reduce((s, p) => s + p.index, 0) / n;
  const my = pairs.reduce((s, p) => s + p.heightCm, 0) / n;
  let sxx = 0, sxy = 0, syy = 0;
  for (const p of pairs) {
    const dx = p.index - mx;
    const dy = p.heightCm - my;
    sxx += dx * dx;
    sxy += dx * dy;
    syy += dy * dy;
  }
  if (sxx === 0) return null;
  const slope = sxy / sxx;
  const intercept = my - slope * mx;
  const r2 = syy === 0 ? 0 : (sxy * sxy) / (sxx * syy);
  return { slope, intercept, r2 };
};

export interface CalibrationResult extends LinearFit {
  nPairs: number;
  maeCm: number;
  rmseCm: number;
  biasCm: number;
  residualSdCm: number;
  /** RMSE de validação cruzada leave-one-out — a incerteza publicada. */
  loocvRmseCm: number;
  uncertaintyCm: number;
  maxLagDays: number;
  /** false quando há pares insuficientes para publicar. */
  publishable: boolean;
}

const round = (v: number, d = 2) => Math.round(v * 10 ** d) / 10 ** d;

/** Ajusta o modelo e mede o erro de previsão real. */
export const calibrate = (
  pairs: CalibrationPair[],
  maxLagDays = DEFAULT_MAX_LAG_DAYS,
): CalibrationResult | null => {
  const fit = fitLinear(pairs);
  if (!fit) return null;
  const n = pairs.length;

  const residuals = pairs.map(p => p.heightCm - (fit.slope * p.index + fit.intercept));
  const mae = residuals.reduce((s, r) => s + Math.abs(r), 0) / n;
  const rmse = Math.sqrt(residuals.reduce((s, r) => s + r * r, 0) / n);
  const bias = residuals.reduce((s, r) => s + r, 0) / n;
  const dof = Math.max(1, n - 2);
  const residualSd = Math.sqrt(residuals.reduce((s, r) => s + r * r, 0) / dof);

  // LOOCV: reajusta sem cada ponto e mede o erro nele.
  let loocvSum = 0;
  let loocvCount = 0;
  for (let i = 0; i < n; i++) {
    const subset = pairs.filter((_, j) => j !== i);
    const f = fitLinear(subset);
    if (!f) continue;
    const e = pairs[i].heightCm - (f.slope * pairs[i].index + f.intercept);
    loocvSum += e * e;
    loocvCount++;
  }
  const loocv = loocvCount > 0 ? Math.sqrt(loocvSum / loocvCount) : rmse;

  return {
    ...fit,
    slope: round(fit.slope, 3),
    intercept: round(fit.intercept, 3),
    r2: round(fit.r2, 4),
    nPairs: n,
    maeCm: round(mae, 1),
    rmseCm: round(rmse, 1),
    biasCm: round(bias, 1),
    residualSdCm: round(residualSd, 1),
    loocvRmseCm: round(loocv, 1),
    uncertaintyCm: round(loocv, 1),
    maxLagDays,
    publishable: n >= MIN_CALIBRATION_PAIRS,
  };
};

/** Altura prevista por uma calibração publicada. */
export const predictHeightCm = (index: number, slope: number, intercept: number) =>
  Math.max(0, Math.round(slope * index + intercept));

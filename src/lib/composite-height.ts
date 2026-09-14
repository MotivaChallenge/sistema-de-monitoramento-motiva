/**
 * Estimativa de altura da vegetação a partir de NDVI, EVI e SAVI.
 *
 * Cadeia de cálculo (cada etapa é isolada e substituível):
 *
 *   NDVI/EVI/SAVI → índice composto V → altura (cm) → nível de manutenção
 *                                    ↘ heterogeneidade e confiança (campo)
 *
 * V = (w_ndvi·NDVI + w_evi·EVI + w_savi·SAVI), com os pesos somando 1.
 * H = a·V + b, com (a, b) ajustados por mínimos quadrados sobre os pontos de
 * calibração de campo disponíveis. Com apenas dois pontos o ajuste é exato —
 * é prova de conceito, NÃO um modelo validado; o módulo sinaliza isso em
 * `publishable`/`limitations` para que a interface nunca prometa acurácia.
 *
 * Para evoluir para regressão múltipla (H = β0 + β1·NDVI + β2·EVI + β3·SAVI)
 * basta trocar `estimateHeightCm` — a assinatura pública não muda. Com dois
 * pontos esse sistema é indeterminado, por isso fica preparado e não ativado.
 */

/* ------------------------------------------------------------------ */
/* Parametrização (único lugar onde estes números existem)             */
/* ------------------------------------------------------------------ */

export interface VegetationWeights {
  ndvi: number;
  evi: number;
  savi: number;
}

/** Pesos da primeira calibração. Ajustáveis: qualquer conjunto que some 1. */
export const VEGETATION_WEIGHTS: VegetationWeights = {
  ndvi: 0.2,
  evi: 0.55,
  savi: 0.25,
};

/** Limiares de manutenção em cm (configuráveis). */
export const MAINTENANCE_THRESHOLDS = {
  normalMax: 10,
  attentionMax: 25,
  maintenanceMax: 40,
};

/** Faixas de variabilidade relativa (desvio ÷ média) usadas na confiança. */
export const VARIABILITY_THRESHOLDS = { low: 0.2, medium: 0.4 };

/** Abaixo desta altura média a variabilidade relativa fica instável (divisão por valor pequeno). */
export const MIN_HEIGHT_FOR_RELATIVE_CM = 5;

/** Defasagem (dias) entre imagem e medição a partir da qual o dado é sinalizado. */
export const TEMPORAL_WARNING_DAYS = 3;

/** Mínimo de pontos de campo para tratar a reta como calibração e não prova de conceito. */
export const MIN_CALIBRATION_POINTS = 6;

export const weightsSum = (w: VegetationWeights = VEGETATION_WEIGHTS) => w.ndvi + w.evi + w.savi;

/** Pesos válidos: finitos, não negativos e somando 1 (tolerância de 1e-6). */
export const areWeightsValid = (w: VegetationWeights = VEGETATION_WEIGHTS): boolean =>
  [w.ndvi, w.evi, w.savi].every((v) => Number.isFinite(v) && v >= 0) &&
  Math.abs(weightsSum(w) - 1) < 1e-6;

/* ------------------------------------------------------------------ */
/* Índice composto                                                     */
/* ------------------------------------------------------------------ */

export interface SpectralIndices {
  ndvi: number | null | undefined;
  evi: number | null | undefined;
  savi: number | null | undefined;
}

const finite = (v: number | null | undefined): number | null =>
  v == null || !Number.isFinite(v) ? null : v;

/**
 * Índice composto de vegetação. Retorna `null` quando falta algum índice —
 * nunca completa valor ausente com zero.
 * Pesos que não somam 1 são renormalizados (a proporção entre eles é o que importa).
 */
export const compositeVegetationIndex = (
  indices: SpectralIndices,
  weights: VegetationWeights = VEGETATION_WEIGHTS
): number | null => {
  const ndvi = finite(indices.ndvi);
  const evi = finite(indices.evi);
  const savi = finite(indices.savi);
  if (ndvi === null || evi === null || savi === null) return null;
  const sum = weightsSum(weights);
  if (!(sum > 0) || !Number.isFinite(sum)) return null;
  return (weights.ndvi * ndvi + weights.evi * evi + weights.savi * savi) / sum;
};

/* ------------------------------------------------------------------ */
/* Pontos de calibração (verdade de campo)                             */
/* ------------------------------------------------------------------ */

export interface CalibrationPoint {
  id: string;
  label: string;
  /** Tipo de ambiente: permite, no futuro, modelos por ambiente. */
  locationType: string;
  ndvi: number;
  evi: number;
  savi: number;
  /** Todas as réguas medidas no local. */
  fieldMeasurementsCm: number[];
  /** Data da imagem de satélite usada (null = desconhecida). */
  satelliteDate: string | null;
  fieldMeasurementDate: string | null;
  note?: string;
}

/**
 * Pontos medidos em campo (régua) com os índices da imagem correspondente.
 * Novos pontos entram aqui ou pelo banco — a reta é reajustada automaticamente.
 */
export const CALIBRATION_POINTS: CalibrationPoint[] = [
  {
    id: "test-01",
    label: "Canteiro de rotatória",
    locationType: "roundabout",
    ndvi: 0.38,
    evi: 0.216,
    savi: 0.203,
    fieldMeasurementsCm: [4, 8, 11, 13],
    satelliteDate: null,
    fieldMeasurementDate: "2026-09-14",
    note:
      "A imagem Sentinel pode não ser do dia da medição. Ponto mantido como está — sem ajuste artificial — e sinalizado como possivelmente defasado.",
  },
  {
    id: "test-02",
    label: "Sítio (área rural)",
    locationType: "rural",
    ndvi: 0.458,
    evi: 0.413,
    savi: 0.32,
    fieldMeasurementsCm: [30, 49],
    satelliteDate: null,
    fieldMeasurementDate: "2026-09-14",
  },
];

/* ------------------------------------------------------------------ */
/* Ajuste da reta V → altura                                           */
/* ------------------------------------------------------------------ */

export interface HeightCalibration {
  /** Coeficiente angular (cm por unidade de índice). */
  a: number;
  /** Intercepto (cm). */
  b: number;
  nPoints: number;
  r2: number | null;
  /** false enquanto houver poucos pontos: prova de conceito, não modelo validado. */
  publishable: boolean;
  weights: VegetationWeights;
}

/** Mínimos quadrados sobre pares (x, y). Aceita 2 pontos (ajuste exato). */
export const fitLine = (points: { x: number; y: number }[]): { a: number; b: number; r2: number | null } | null => {
  const pts = points.filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));
  const n = pts.length;
  if (n < 2) return null;
  const mx = pts.reduce((s, p) => s + p.x, 0) / n;
  const my = pts.reduce((s, p) => s + p.y, 0) / n;
  let sxx = 0, sxy = 0, syy = 0;
  for (const p of pts) {
    const dx = p.x - mx;
    const dy = p.y - my;
    sxx += dx * dx;
    sxy += dx * dy;
    syy += dy * dy;
  }
  if (sxx === 0) return null;
  const a = sxy / sxx;
  return { a, b: my - a * mx, r2: n > 2 && syy > 0 ? (sxy * sxy) / (sxx * syy) : null };
};

export const mean = (values: number[]): number =>
  values.length ? values.reduce((s, v) => s + v, 0) / values.length : NaN;

/** Ajusta a reta V → altura com os pontos de campo informados. */
export const calibrateHeightModel = (
  points: CalibrationPoint[] = CALIBRATION_POINTS,
  weights: VegetationWeights = VEGETATION_WEIGHTS
): HeightCalibration | null => {
  const usable = points
    .map((p) => {
      const v = compositeVegetationIndex(p, weights);
      const heights = p.fieldMeasurementsCm.filter((h) => Number.isFinite(h));
      return v === null || heights.length === 0 ? null : { x: v, y: mean(heights) };
    })
    .filter((p): p is { x: number; y: number } => p !== null);

  const fit = fitLine(usable);
  if (!fit) return null;
  return {
    a: fit.a,
    b: fit.b,
    r2: fit.r2,
    nPoints: usable.length,
    publishable: usable.length >= MIN_CALIBRATION_POINTS,
    weights,
  };
};

/** Calibração vigente derivada dos pontos atuais (a ≈ 210,3 · V − 41,7). */
export const ACTIVE_CALIBRATION: HeightCalibration = calibrateHeightModel()!;

/* ------------------------------------------------------------------ */
/* Altura estimada                                                     */
/* ------------------------------------------------------------------ */

/** H = a·V + b, nunca negativa. */
export const estimateHeightCm = (
  vegetationIndex: number,
  calibration: HeightCalibration = ACTIVE_CALIBRATION
): number | null => {
  if (!Number.isFinite(vegetationIndex)) return null;
  const raw = calibration.a * vegetationIndex + calibration.b;
  return Math.max(0, raw);
};

/* ------------------------------------------------------------------ */
/* Estatística das medições de campo (heterogeneidade)                 */
/* ------------------------------------------------------------------ */

export type HeterogeneityLevel = "baixa" | "moderada" | "alta" | "indeterminada";

export interface FieldStats {
  n: number;
  meanCm: number | null;
  minCm: number | null;
  maxCm: number | null;
  /** Desvio padrão amostral (n−1); null com menos de 2 medições. */
  sdCm: number | null;
  /** sd ÷ média; null quando instável (média muito baixa) ou sem amostras. */
  relativeVariation: number | null;
  heterogeneity: HeterogeneityLevel;
}

export const fieldStats = (measurementsCm: number[] = []): FieldStats => {
  const values = measurementsCm.filter((v) => Number.isFinite(v) && v >= 0);
  const n = values.length;
  if (n === 0) {
    return { n: 0, meanCm: null, minCm: null, maxCm: null, sdCm: null, relativeVariation: null, heterogeneity: "indeterminada" };
  }
  const m = mean(values);
  const sd =
    n < 2 ? null : Math.sqrt(values.reduce((s, v) => s + (v - m) ** 2, 0) / (n - 1));
  const relative =
    sd === null || m < MIN_HEIGHT_FOR_RELATIVE_CM ? null : sd / m;
  const heterogeneity: HeterogeneityLevel =
    relative === null
      ? "indeterminada"
      : relative < VARIABILITY_THRESHOLDS.low
        ? "baixa"
        : relative < VARIABILITY_THRESHOLDS.medium
          ? "moderada"
          : "alta";
  return {
    n,
    meanCm: m,
    minCm: Math.min(...values),
    maxCm: Math.max(...values),
    sdCm: sd,
    relativeVariation: relative,
    heterogeneity,
  };
};

/* ------------------------------------------------------------------ */
/* Confiança                                                           */
/* ------------------------------------------------------------------ */

export type ConfidenceLevel = "alta" | "media" | "baixa" | "indeterminada";

export const CONFIDENCE_LABEL: Record<ConfidenceLevel, string> = {
  alta: "Alta",
  media: "Média",
  baixa: "Baixa",
  indeterminada: "Não determinada",
};

/**
 * Confiança a partir da variabilidade observada em campo.
 * Sem medições (ou com apenas uma) não existe base para declarar confiança —
 * o retorno é "indeterminada", nunca um número inventado.
 */
export const confidenceFromStats = (stats: FieldStats): ConfidenceLevel => {
  if (stats.relativeVariation === null) return "indeterminada";
  if (stats.relativeVariation < VARIABILITY_THRESHOLDS.low) return "alta";
  if (stats.relativeVariation < VARIABILITY_THRESHOLDS.medium) return "media";
  return "baixa";
};

/* ------------------------------------------------------------------ */
/* Nível de manutenção                                                 */
/* ------------------------------------------------------------------ */

export type MaintenanceLevel = "normal" | "atencao" | "manutencao" | "critico";

export const MAINTENANCE_LABEL: Record<MaintenanceLevel, string> = {
  normal: "Normal",
  atencao: "Atenção",
  manutencao: "Necessita manutenção",
  critico: "Crítico",
};

export const maintenanceLevel = (
  heightCm: number,
  t = MAINTENANCE_THRESHOLDS
): MaintenanceLevel =>
  heightCm <= t.normalMax
    ? "normal"
    : heightCm <= t.attentionMax
      ? "atencao"
      : heightCm <= t.maintenanceMax
        ? "manutencao"
        : "critico";

/* ------------------------------------------------------------------ */
/* Qualidade temporal do dado                                          */
/* ------------------------------------------------------------------ */

export interface TemporalQuality {
  satelliteDate: string | null;
  fieldMeasurementDate: string | null;
  temporalDifferenceDays: number | null;
  /** true quando a diferença passa do limite — o dado pode estar defasado. */
  warning: boolean;
  message: string | null;
}

const parseDay = (d: string | null | undefined): number | null => {
  if (!d) return null;
  const t = new Date(d).getTime();
  return Number.isFinite(t) ? t : null;
};

export const temporalQuality = (
  satelliteDate: string | null | undefined,
  fieldMeasurementDate: string | null | undefined,
  warnAfterDays = TEMPORAL_WARNING_DAYS
): TemporalQuality => {
  const s = parseDay(satelliteDate);
  const f = parseDay(fieldMeasurementDate);
  if (s === null || f === null) {
    return {
      satelliteDate: satelliteDate ?? null,
      fieldMeasurementDate: fieldMeasurementDate ?? null,
      temporalDifferenceDays: null,
      warning: satelliteDate == null && fieldMeasurementDate != null,
      message:
        satelliteDate == null && fieldMeasurementDate != null
          ? "Data da imagem de satélite não informada: não é possível verificar defasagem em relação à medição de campo."
          : null,
    };
  }
  const days = Math.round(Math.abs(s - f) / 86_400_000);
  const warning = days > warnAfterDays;
  return {
    satelliteDate: satelliteDate ?? null,
    fieldMeasurementDate: fieldMeasurementDate ?? null,
    temporalDifferenceDays: days,
    warning,
    message: warning
      ? `Dados de satélite podem estar defasados: ${days} dias entre a imagem e a medição em campo.`
      : null,
  };
};

/* ------------------------------------------------------------------ */
/* Avaliação completa                                                  */
/* ------------------------------------------------------------------ */

export interface HeightEstimateOptions {
  calibration?: HeightCalibration;
  weights?: VegetationWeights;
  fieldMeasurementsCm?: number[];
  satelliteDate?: string | null;
  fieldMeasurementDate?: string | null;
}

export interface HeightEstimate {
  /** Índices brutos usados (para a UI mostrar o passo a passo). */
  indices: { ndvi: number; evi: number; savi: number } | null;
  weights: VegetationWeights;
  vegetationIndex: number | null;
  estimatedHeightCm: number | null;
  calibration: HeightCalibration;
  maintenance: MaintenanceLevel | null;
  maintenanceLabel: string | null;
  field: FieldStats;
  confidence: ConfidenceLevel;
  temporal: TemporalQuality;
  /** Passo a passo textual para a área "Como foi calculado?". */
  steps: string[];
  limitations: string[];
}

const fmt = (n: number, d = 3) => n.toFixed(d).replace(".", ",");

/** Estimativa ponta a ponta a partir dos três índices. */
export const estimateHeight = (
  indices: SpectralIndices,
  options: HeightEstimateOptions = {}
): HeightEstimate => {
  const weights = options.weights ?? VEGETATION_WEIGHTS;
  const calibration = options.calibration ?? ACTIVE_CALIBRATION;
  const field = fieldStats(options.fieldMeasurementsCm ?? []);
  const temporal = temporalQuality(options.satelliteDate, options.fieldMeasurementDate);
  const v = compositeVegetationIndex(indices, weights);
  const heightRaw = v === null ? null : estimateHeightCm(v, calibration);
  const height = heightRaw === null ? null : Math.round(heightRaw * 10) / 10;

  const limitations: string[] = [];
  if (!areWeightsValid(weights)) {
    limitations.push("Os pesos informados não somam 1 — foram renormalizados para o cálculo.");
  }
  if (!calibration.publishable) {
    limitations.push(
      `Calibração de prova de conceito: ${calibration.nPoints} ponto(s) de campo. ` +
        `São necessários pelo menos ${MIN_CALIBRATION_POINTS} para tratar a reta como modelo validado.`
    );
  }
  if (field.n === 0) {
    limitations.push("Sem medição de campo neste local: não há base para declarar confiança da estimativa.");
  } else {
    limitations.push(
      "A faixa exibida é a variação das amostras de campo, não um intervalo de confiança estatístico."
    );
  }
  if (temporal.message) limitations.push(temporal.message);
  if (v === null) limitations.push("NDVI, EVI e SAVI são obrigatórios: sem os três não há estimativa.");

  const steps =
    v === null || height === null
      ? []
      : [
          `V = (${fmt(weights.ndvi, 2)} × NDVI) + (${fmt(weights.evi, 2)} × EVI) + (${fmt(weights.savi, 2)} × SAVI)`,
          `V = (${fmt(weights.ndvi, 2)} × ${fmt(indices.ndvi as number)}) + (${fmt(weights.evi, 2)} × ${fmt(indices.evi as number)}) + (${fmt(weights.savi, 2)} × ${fmt(indices.savi as number)}) = ${fmt(v)}`,
          `H = ${fmt(calibration.a, 1)} × V ${calibration.b < 0 ? "−" : "+"} ${fmt(Math.abs(calibration.b), 1)}`,
          `H = ${fmt(calibration.a, 1)} × ${fmt(v)} ${calibration.b < 0 ? "−" : "+"} ${fmt(Math.abs(calibration.b), 1)} = ${fmt(height, 1)} cm`,
        ];

  return {
    indices:
      finite(indices.ndvi) === null || finite(indices.evi) === null || finite(indices.savi) === null
        ? null
        : { ndvi: indices.ndvi as number, evi: indices.evi as number, savi: indices.savi as number },
    weights,
    vegetationIndex: v === null ? null : Math.round(v * 1000) / 1000,
    estimatedHeightCm: height,
    calibration,
    maintenance: height === null ? null : maintenanceLevel(height),
    maintenanceLabel: height === null ? null : MAINTENANCE_LABEL[maintenanceLevel(height)],
    field,
    confidence: confidenceFromStats(field),
    temporal,
    steps,
    limitations,
  };
};

/* ------------------------------------------------------------------ */
/* Validação contra os pontos conhecidos                               */
/* ------------------------------------------------------------------ */

export interface PointValidation {
  id: string;
  label: string;
  locationType: string;
  vegetationIndex: number | null;
  estimatedCm: number | null;
  realCm: number | null;
  absoluteErrorCm: number | null;
  percentErro: number | null;
  field: FieldStats;
  maintenance: MaintenanceLevel | null;
  temporal: TemporalQuality;
  note?: string;
}

/** Compara altura real × estimada em cada ponto de calibração disponível. */
export const validateCalibration = (
  points: CalibrationPoint[] = CALIBRATION_POINTS,
  calibration: HeightCalibration = ACTIVE_CALIBRATION
): PointValidation[] =>
  points.map((p) => {
    const est = estimateHeight(p, {
      calibration,
      weights: calibration.weights,
      fieldMeasurementsCm: p.fieldMeasurementsCm,
      satelliteDate: p.satelliteDate,
      fieldMeasurementDate: p.fieldMeasurementDate,
    });
    const real = est.field.meanCm;
    const err =
      real === null || est.estimatedHeightCm === null ? null : Math.abs(est.estimatedHeightCm - real);
    return {
      id: p.id,
      label: p.label,
      locationType: p.locationType,
      vegetationIndex: est.vegetationIndex,
      estimatedCm: est.estimatedHeightCm,
      realCm: real,
      absoluteErrorCm: err === null ? null : Math.round(err * 10) / 10,
      percentErro: err === null || !real ? null : Math.round((err / real) * 1000) / 10,
      field: est.field,
      maintenance: est.maintenance,
      temporal: est.temporal,
      note: p.note,
    };
  });

/* ------------------------------------------------------------------ */
/* Textos de transparência                                             */
/* ------------------------------------------------------------------ */

export const COMPOSITE_MODEL_SUMMARY =
  `Índice composto V = ${fmt(VEGETATION_WEIGHTS.ndvi, 2)}·NDVI + ${fmt(VEGETATION_WEIGHTS.evi, 2)}·EVI + ` +
  `${fmt(VEGETATION_WEIGHTS.savi, 2)}·SAVI; altura estimada H = ${fmt(ACTIVE_CALIBRATION.a, 1)}·V ` +
  `${ACTIVE_CALIBRATION.b < 0 ? "−" : "+"} ${fmt(Math.abs(ACTIVE_CALIBRATION.b), 1)} cm, truncada em zero.`;

export const ESTIMATE_DISCLAIMER =
  "O satélite não mede altura em centímetros. O valor exibido é uma estimativa de modelo a partir dos índices espectrais e deve ser confirmada em campo.";
